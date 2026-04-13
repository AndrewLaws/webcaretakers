#!/bin/bash
set -euo pipefail

BUCKET="webcaretakers.com"
REGION="us-east-1"

echo "Running tests before deployment..."
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Aborting deployment."
  exit 1
fi

echo ""
echo "Removing S3 redirect configuration..."
aws s3api delete-bucket-website --bucket "$BUCKET" --region "$REGION" 2>/dev/null || true

echo "Syncing site/ to s3://$BUCKET..."
aws s3 sync site/ "s3://$BUCKET" \
  --region "$REGION" \
  --delete \
  --cache-control "max-age=3600" \
  --exclude "*.map"

echo ""
echo "Setting cache headers for assets..."
aws s3 sync site/assets/ "s3://$BUCKET/assets/" \
  --region "$REGION" \
  --cache-control "max-age=86400"

echo ""
echo "Deployment complete."
echo ""
echo "If CloudFront is configured, invalidate the cache with:"
echo "  aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths '/*'"
