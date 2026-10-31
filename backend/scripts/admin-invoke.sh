#!/bin/bash
# Runs a Lambda admin action without showing or saving the admin secret.
# Usage: bash backend/scripts/admin-invoke.sh tipDataCheck
#        bash backend/scripts/admin-invoke.sh correctCashExpected tenantSlug=pieces apply=true
set -euo pipefail

AWS_ARGS=(--profile tip-pooling --region us-east-1)
APP_SECRET=$(aws secretsmanager get-secret-value --secret-id tip-pooling-dev/app "${AWS_ARGS[@]}" --query SecretString --output text)
PAYLOAD=$(APP_SECRET="$APP_SECRET" node -e '
  const [action, ...pairs] = process.argv.slice(1);
  const params = pairs.map((p) => p.split("=")).map(([k, v]) => [k, v === "true" ? true : v === "false" ? false : v]);
  const secret = JSON.parse(process.env.APP_SECRET).LAMBDA_ADMIN_SECRET;
  console.log(JSON.stringify({ action, ...Object.fromEntries(params), secret }));
' "$@")

OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT
aws lambda invoke --function-name tip-pooling-dev-api "${AWS_ARGS[@]}" --cli-binary-format raw-in-base64-out --payload "$PAYLOAD" "$OUT" > /dev/null
cat "$OUT"
echo
