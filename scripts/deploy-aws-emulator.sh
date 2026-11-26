#!/usr/bin/env bash
# Despliega dist/ y los datos de ejemplo en el emulador local de AWS.
# Requisitos: emulador en marcha (aws-emulator), AWS CLI v2, curl y dist/ construido.
# Idempotente: se puede ejecutar varias veces seguidas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${EMULATOR_PORT:-9297}"
EMU_DIR="${EMULATOR_DIR:-$HOME/.aws/emulator/$PORT}"
BUCKET="${BUCKET:-logitrack-web}"
TABLE="packages" # debe coincidir con la clave raíz de infra/seed/packages.json
DIST_DIR="${DIST_DIR:-$ROOT/dist}"
SEED_FILE="${SEED_FILE:-$ROOT/infra/seed/packages.json}"
ENDPOINT="https://127.0.0.1:$PORT"

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v aws >/dev/null || die "AWS CLI v2 no encontrado en el PATH"
command -v curl >/dev/null || die "curl no encontrado en el PATH"
[ -d "$DIST_DIR" ] || die "no existe $DIST_DIR; ejecuta 'npm run build' antes"
[ -f "$SEED_FILE" ] || die "no existe $SEED_FILE"

# 1. Emulador vivo (el emulador crea las credenciales y la CA al arrancar).
[ -f "$EMU_DIR/ca.pem" ] || die "falta $EMU_DIR/ca.pem; arranca el emulador: aws-emulator -t off"
log "Comprobando emulador en $ENDPOINT"
curl -fsS --cacert "$EMU_DIR/ca.pem" "$ENDPOINT/__admin/health" >/dev/null \
  || die "el emulador no responde en $ENDPOINT"

# 2. Variables de cliente: solo credenciales temporales del emulador, nunca claves reales.
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_PROFILE
export AWS_ENDPOINT_URL="$ENDPOINT"
export AWS_SHARED_CREDENTIALS_FILE="$EMU_DIR/emulator_credentials"
export AWS_CONFIG_FILE="$EMU_DIR/config"
export AWS_CA_BUNDLE="$EMU_DIR/ca.pem"
export AWS_EC2_METADATA_DISABLED=true
export AWS_DISABLE_HOST_PREFIX_INJECTION=true
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

log "Identidad"
aws sts get-caller-identity

# 3. Bucket S3 y contenido.
if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  log "Bucket $BUCKET ya existe"
else
  log "Creando bucket $BUCKET"
  aws s3api create-bucket --bucket "$BUCKET"
fi

log "Subiendo $DIST_DIR a s3://$BUCKET"
aws s3 sync "$DIST_DIR" "s3://$BUCKET" --delete --no-progress

# 4. Website hosting: solo si el emulador lo soporta (si no, se avisa y se continúa).
if aws s3 website "s3://$BUCKET" --index-document index.html --error-document index.html 2>/dev/null; then
  log "Website hosting configurado"
else
  log "AVISO: el emulador no soporta website hosting; se omite (la app se sirve con nginx en :8080)"
fi

# 5. Tabla DynamoDB y semilla.
if aws dynamodb describe-table --table-name "$TABLE" >/dev/null 2>&1; then
  log "Tabla $TABLE ya existe"
else
  log "Creando tabla $TABLE"
  aws dynamodb create-table --table-name "$TABLE" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE"
fi

# PutRequest sobre la clave primaria: reejecutar sobrescribe, no duplica.
log "Sembrando $TABLE desde ${SEED_FILE#"$ROOT"/}"
aws dynamodb batch-write-item --request-items "file://$SEED_FILE" >/dev/null

# 6. Verificación.
log "Buckets"
aws s3 ls
log "Contenido de s3://$BUCKET"
aws s3 ls "s3://$BUCKET" --recursive --summarize | tail -n 5
log "Elementos en $TABLE"
aws dynamodb scan --table-name "$TABLE" --select COUNT --query Count --output text
log "Despliegue en el emulador completado"
