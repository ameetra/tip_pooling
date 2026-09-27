#!/bin/bash
set -e

cd "$(dirname "$0")/.."

source ../deploy.local.env  # AWS names live in a gitignored file; copy deploy.env.example to deploy.local.env
BUCKET_NAME="${FRONTEND_BUCKET:?}"
PROFILE="${AWS_PROFILE_NAME:?}"

echo "=== Deploying frontend to S3/CloudFront ==="

# Build
echo "Building frontend..."
npm run build

# Sync assets with long cache (hashed filenames)
echo "Syncing to S3: $BUCKET_NAME..."
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --delete \
  --profile "$PROFILE" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# index.html with short cache
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
  --profile "$PROFILE" \
  --cache-control "public, max-age=300, must-revalidate" \
  --content-type "text/html"

# Invalidate CloudFront
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DIST_ID:?}" \
  --paths "/*" \
  --profile "$PROFILE" \
  --output text --query "Invalidation.Id"

echo "=== Frontend deployed ==="
echo "URL: https://usegratify.com"
