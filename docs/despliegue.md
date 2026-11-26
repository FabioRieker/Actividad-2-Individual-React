# Despliegue local (Docker + LocalStack) y Vercel

Estado: **preparado** (no desplegado). La app es Ionic React con Vite: `npm run build` emite en `dist/`.

## Prerrequisitos
- Docker y Docker Compose v2.
- Node 24.21.0 (`.nvmrc`).
- Credenciales AWS dummy (`test`/`test`, ver `.env.example`). Nunca claves reales.

## Pasos locales
El script `deploy:local` lo añadirá el implementador al `package.json` de React; mientras tanto, a mano:

1. `npm run build` genera `dist/`.
2. `docker compose up -d --wait` levanta `web` (nginx) y `localstack`; el init (`localstack/init/ready.d/01-deploy.sh`) crea el bucket, sincroniza `dist/` y siembra DynamoDB.
3. URLs:
   - nginx: http://localhost:8080
   - Website S3 de LocalStack: `curl -H 'Host: logitrack-express.s3-website.localhost.localstack.cloud' http://localhost:4566/`
4. Comprobar DynamoDB: `docker compose exec -T localstack awslocal dynamodb scan --table-name packages --select COUNT` (esperado: Count 8).
5. `docker compose down -v`.

## Vercel
`vercel.json`: framework `vite`, `buildCommand` `npm run build`, `outputDirectory` `dist`, rewrite SPA a `/index.html`, caché inmutable en `/assets/*`. El despliegue lo lanza el alumno (`vercel --prod`); no se ha ejecutado.

## Cabeceras y CSP
Definidas en `vercel.json` y `nginx/security-headers.conf` (mantener sincronizadas):
- `script-src 'self'`: Vite emite `<script type="module" src="/assets/...">` externos, sin scripts inline.
- `style-src 'self' 'unsafe-inline'`: Ionic (web components) y React aplican estilos en línea en ejecución; sin esto la UI se rompe.
- `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self' data:`, `object-src 'none'`, `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.

## Comandos PENDIENTES (sin ejecutar por ancho de banda: datos móviles)
- `docker build -t logitrack-express:local .` (descarga node:24.21.0-alpine y nginx:alpine).
- `docker pull localstack/localstack:4.4.0`.
- `docker compose up -d --wait`.
- `curl -I http://localhost:8080/` (verificar cabeceras) y curl al website S3 de LocalStack.
- `docker compose exec -T localstack awslocal dynamodb scan --table-name packages` (COUNT=8).
- Escaneo de la imagen (p. ej. `docker scout quickview` o `trivy image logitrack-express:local`).
- Ejecución del workflow `.github/workflows/docker.yml` en GitHub.
- `npm run build` real de la app React (depende de la migración).
