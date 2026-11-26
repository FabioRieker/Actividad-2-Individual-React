#!/bin/bash
# Se ejecuta dentro de LocalStack cuando está listo (init hook ready.d).
set -euo pipefail
BUCKET=logitrack-express

awslocal s3 mb "s3://$BUCKET"
awslocal s3 website "s3://$BUCKET" --index-document index.html --error-document index.html
awslocal s3api put-bucket-policy --bucket "$BUCKET" --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::logitrack-express/*"
  }]
}'
awslocal s3 sync /opt/build "s3://$BUCKET" --delete

awslocal dynamodb create-table --table-name packages \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
awslocal dynamodb batch-write-item --request-items file:///opt/seed/packages.json
echo "logitrack-express: bucket y tabla listos"
