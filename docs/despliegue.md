# Despliegue: Docker local, emulador de AWS y Vercel

Estado: **preparado** (no desplegado en Vercel ni en AWS real). La app es Ionic React con Vite: `npm run build` emite en `dist/`.

## Arquitectura
| Pieza | Qué hace | Puerto |
|---|---|---|
| `Dockerfile` + `nginx.conf` + `docker-compose.yml` (servicio `web`) | Compila y sirve la app con nginx (fallback SPA) | 8080 |
| `aws-emulator` (emulador oficial de AWS, binario nativo) | Emula S3, DynamoDB y STS en local, sin cuenta ni Docker | 9297 (HTTPS) |
| `scripts/deploy-aws-emulator.sh` | Crea el bucket `logitrack-web`, sube `dist/`, crea la tabla `packages` y la siembra desde `infra/seed/packages.json` | - |
| `vercel.json` | Salida `dist`, rewrite SPA, cabeceras y caché | - |

El emulador guarda todo en memoria: al pararlo se pierde el estado y hay que volver a ejecutar el script.

## Requisitos
- Docker y Docker Compose v2 (para `web`).
- Node 24.21.0 (`.nvmrc`).
- Linux amd64 con glibc >= 2.17 para el emulador.
- AWS CLI v2 (en `ubuntu-latest` ya viene instalado).
- Sin claves reales: el emulador genera credenciales temporales en `~/.aws/emulator/9297/` y el script las usa; `AWS_ACCESS_KEY_ID` y similares se anulan (`unset`).

## Instalación del emulador (una vez, requiere sudo)
```bash
curl -fsSLo aws-emulator.deb https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator_amd64.deb
sudo apt-get install -y ./aws-emulator.deb
aws-emulator -v
```
El paquete pesa unos 218 MB. Sin sudo se puede extraer con `dpkg-deb -x aws-emulator.deb <carpeta>` y ejecutar `<carpeta>/opt/aws-emulator/bin/aws-emulator`.

AWS CLI v2 en modo usuario (sin sudo):
```bash
curl -fsSLo awscliv2.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip
unzip -q awscliv2.zip && ./aws/install -i ~/.local/aws-cli -b ~/.local/bin
```

## Comandos
Cuando se integre con `develop` se añadirán al `package.json` de la app (esta rama no lo tiene):
```json
"deploy:local": "npm run build && docker compose up -d --build",
"deploy:aws-emulator": "npm run build && bash scripts/deploy-aws-emulator.sh"
```
Mientras tanto, a mano:

1. App en Docker: `npm run build && docker compose up -d --build` y abrir http://localhost:8080. Parar con `docker compose down`.
2. Emulador: en otra terminal `aws-emulator -t off` (`-t off` desactiva la telemetría).
3. Despliegue en el emulador: `npm run build && bash scripts/deploy-aws-emulator.sh`. Es idempotente.
4. Comprobación manual (tras exportar las variables que fija el script):
   `aws s3 ls`, `aws dynamodb scan --table-name packages --select COUNT` (esperado: 8).
5. Health: `curl --cacert ~/.aws/emulator/9297/ca.pem https://127.0.0.1:9297/__admin/health`.

Variables opcionales del script: `EMULATOR_PORT`, `EMULATOR_DIR`, `BUCKET`, `DIST_DIR`, `SEED_FILE`.
Usar siempre `127.0.0.1` y no `localhost` con S3.

## Soporte de servicios (confirmado)
Fuentes de la investigación y resultado, con la versión 1.0.628 (2026-11-26):

| Operación | Soportada | Evidencia |
|---|---|---|
| STS `GetCallerIdentity` | Sí | Ejecutado: cuenta `000000000000` |
| S3 `CreateBucket`, `HeadBucket`, `ListBuckets` | Sí | Ejecutado; 535 tests de fidelidad usan `CreateBucket` |
| S3 `PutObject` / `GetObject` / `ListObjectsV2` (y `s3 sync`) | Sí | Ejecutado (`s3 sync`, `s3 cp`, `s3 ls`); 335 / 242 / 317 tests de fidelidad |
| S3 `PutBucketWebsite` / `GetBucketWebsite` | Sí, solo como configuración | Ejecutado: se guarda y se lee. Servir el sitio no queda verificado: la petición anónima a `https://127.0.0.1:9297/` con cabecera `Host: logitrack-web.s3-website.us-east-1.amazonaws.com` devuelve 403 |
| S3 `PutBucketPolicy` público | No (bloqueado) | Ejecutado: `AccessDenied` por Block Public Access, igual que AWS real |
| DynamoDB `CreateTable` / `DescribeTable` | Sí | Ejecutado; 1132 tests de fidelidad |
| DynamoDB `BatchWriteItem` | Sí | Ejecutado (8 elementos); 75 tests |
| DynamoDB `PutItem` | Sí | 824 tests de fidelidad (no ejecutado directamente) |
| DynamoDB `Scan` (`--select COUNT`) | Sí | Ejecutado: Count 8; 177 tests |

Limitaciones reales:
- La app en el emulador se considera almacenada y verificada por API (`s3 ls`, `s3 cp`), no servida por una URL pública. La URL de la app es nginx en el puerto 8080.
- Todo el estado es volátil (memoria).
- Una operación no implementada devuelve HTTP 501 `NotImplemented`.
- El emulador es para desarrollo y pruebas; no es válido para producción ni para pruebas de seguridad.
- Los gaps de fidelidad se publican en `issues/` del repositorio y en las puntuaciones de cada release.

### Fuentes
- Guía de instalación en Linux: https://docs.aws.amazon.com/emulator/latest/userguide/getting-started-linux.html
- Comprobar si un proyecto funciona: https://docs.aws.amazon.com/emulator/latest/userguide/check-project.html
- Repositorio y README (alcance, puerto 9297, telemetría, `issues/`): https://github.com/aws/aws-emulator
- Releases (v1.0.628, puntuaciones de fidelidad): https://github.com/aws/aws-emulator/releases
- Casos de fidelidad (`manifest.jsonl`, operaciones S3 y DynamoDB cubiertas): https://github.com/aws/aws-emulator-evaluation-suite

## Vercel
`vercel.json`: framework `vite`, `buildCommand` `npm run build`, `outputDirectory` `dist`, rewrite SPA a `/index.html`, caché inmutable en `/assets/*`. El despliegue lo lanza el alumno (`vercel --prod`); no se ha ejecutado.

## Cabeceras y CSP
Definidas en `vercel.json` y `nginx/security-headers.conf` (mantener sincronizadas):
- `script-src 'self'`: Vite emite `<script type="module" src="/assets/...">` externos, sin scripts inline.
- `style-src 'self' 'unsafe-inline'`: Ionic (web components) y React aplican estilos en línea en ejecución; sin esto la UI se rompe.
- `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self' data:`, `object-src 'none'`, `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.

## CI
`.github/workflows/docker.yml` (`permissions: contents: read`, `concurrency`, `timeout-minutes`):
- `docker`: construye la imagen, la sirve con nginx y comprueba respuesta, cabecera `nosniff` y fallback SPA.
- `aws-emulator-smoke`: descarga el `.deb`, lo instala con `sudo apt-get`, arranca el emulador en segundo plano, espera el health, y ejecuta dos veces el script con un `dist/` mínimo comprobando Count 8.

## Verificación realizada (evidence/fase-f/)
- `docker-compose-config.log`: salida de `docker compose config` (exit 0).
- `aws-emulator-deploy.log`: dos ejecuciones del script contra el emulador 1.0.628 extraído sin instalar, con un `dist/` mínimo de 2 ficheros (exit 0 ambas).

## Pendiente
- `sudo apt-get install -y ./aws-emulator.deb` (el alumno).
- `docker build` / `docker compose up` de la imagen `web` y `curl -I http://localhost:8080/`.
- Ejecución del script con el `dist/` real de la app React (depende de la integración con `develop`).
- Ejecución del workflow en GitHub.
- `shellcheck` no está instalado en la máquina: `sudo apt-get install -y shellcheck && shellcheck scripts/deploy-aws-emulator.sh`.
- Despliegue en Vercel (`vercel --prod`), solo con orden del alumno.
