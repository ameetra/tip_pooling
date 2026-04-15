#!/bin/bash
set -e

cd "$(dirname "$0")/.."

FUNCTION_NAME="tip-pooling-dev-api"
PROFILE="tip-pooling"
HANDLER="${1:-dist/lambda.handler}"

# Build
bash scripts/build-lambda.sh

# Update Lambda handler
echo "Setting Lambda handler to: $HANDLER"
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --handler "$HANDLER" \
  --profile "$PROFILE" \
  --output text --query "FunctionName" 2>&1

aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" 2>&1

# Deploy code
echo "Deploying to Lambda: $FUNCTION_NAME..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://lambda-package.zip" \
  --profile "$PROFILE" \
  --output text --query "FunctionName" 2>&1

echo "Waiting for deployment..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" 2>&1

echo "=== Lambda deployed with handler: $HANDLER ==="
