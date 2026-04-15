#!/bin/bash
set -e

cd "$(dirname "$0")/.."

PROFILE="tip-pooling"
FUNCTION_NAME="tip-pooling-dev-api"
SECRET_ARN="arn:aws:secretsmanager:us-east-1:258763567883:secret:tip-pooling-dev/db-master-password-2w5NJ3"
RDS_ENDPOINT="tip-pooling-dev-postgres.cqz8akcoqj9j.us-east-1.rds.amazonaws.com"

echo "=== Setting up PostgreSQL database ==="

# Fetch credentials from Secrets Manager
echo "Fetching credentials from Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ARN" \
  --profile "$PROFILE" \
  --query SecretString \
  --output text)

DB_USERNAME=$(echo "$SECRET_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).username))")
DB_PASSWORD=$(echo "$SECRET_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).password))")
DB_NAME=$(echo "$SECRET_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).dbname))")

DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${DB_NAME}?schema=public&sslmode=no-verify"

# Create .env.production
echo "Creating .env.production..."
cat > .env.production <<EOF
DATABASE_URL="${DATABASE_URL}"
NODE_ENV=production
DEFAULT_TENANT_ID=default-tenant
EOF
echo ".env.production created"

# Update Lambda environment variables
echo "Updating Lambda environment variables..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={NODE_ENV=dev,DATABASE_URL=$DATABASE_URL,DEFAULT_TENANT_ID=default-tenant}" \
  --profile "$PROFILE" \
  --output text --query "FunctionName" 2>&1

echo "Waiting for Lambda update..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" 2>&1

echo "=== Lambda env vars configured ==="
echo ""
echo "To create tables and seed data, first deploy the Lambda, then run:"
echo "  # Create tables"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --profile $PROFILE \\"
echo "    --cli-binary-format raw-in-base64-out \\"
echo "    --payload '{\"action\":\"migrate\"}' /dev/stdout"
echo ""
echo "  # Seed default tenant"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --profile $PROFILE \\"
echo "    --cli-binary-format raw-in-base64-out \\"
echo "    --payload '{\"action\":\"seed\"}' /dev/stdout"
