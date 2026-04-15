#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== Building Lambda deployment package ==="

# Clean
rm -rf dist lambda-package lambda-package.zip

# Compile TypeScript
echo "Compiling TypeScript..."
npm run build

# Create package directory
mkdir -p lambda-package

# Copy compiled code
cp -r dist lambda-package/

# Copy Prisma PostgreSQL schema
cp prisma/schema-postgres.prisma lambda-package/schema.prisma

# Copy package files
cp package.json lambda-package/
cp package-lock.json lambda-package/

# Install production dependencies
echo "Installing production dependencies..."
cd lambda-package
npm ci --omit=dev 2>&1 | tail -3

# Generate Prisma PG client inside the package
echo "Generating Prisma PostgreSQL client..."
PRISMA_SCHEMA=schema.prisma npx prisma generate 2>&1 | tail -2

# Copy generated PG client to dist (where compiled code expects it)
cp -r node_modules/.prisma lambda-package/ 2>/dev/null || true

# The compiled JS imports from '../generated/prisma-pg/client' relative to dist/
# We need the generated client accessible from dist/generated/prisma-pg/
mkdir -p dist/generated
if [ -d "src/generated/prisma-pg" ]; then
  cp -r src/generated/prisma-pg dist/generated/
fi

cd ..

# Also ensure the generated PG client is in the package
mkdir -p lambda-package/dist/generated
if [ -d "src/generated/prisma-pg" ]; then
  cp -r src/generated/prisma-pg lambda-package/dist/generated/
fi

# Remove non-PostgreSQL Prisma WASM compilers to keep package small
echo "Pruning Prisma bundle..."
cd node_modules/@prisma/client/runtime 2>/dev/null && \
  rm -f *cockroachdb* *mysql* *sqlite* *sqlserver* *index-browser* *wasm-compiler-edge* *.map *.mjs *.mts && \
  cd ../.. && rm -rf studio-core dev engines fetch-engine get-platform query-plan-executor streams-local generator-build scripts || true
cd "$OLDPWD"

# Remove packages not needed at Lambda runtime
rm -rf node_modules/prisma node_modules/typescript node_modules/better-sqlite3 \
  node_modules/react-dom node_modules/chart.js node_modules/fast-check \
  node_modules/@types node_modules/hono node_modules/valibot \
  node_modules/effect node_modules/@electric-sql node_modules/remeda \
  node_modules/csstype node_modules/jiti 2>/dev/null || true
cd ..

# Create zip
echo "Creating deployment ZIP..."
cd lambda-package
if command -v zip &>/dev/null; then
  zip -r ../lambda-package.zip . -x "*.git*" -x "*.DS_Store" -q
else
  cd ..
  powershell -Command "Compress-Archive -Path 'lambda-package\*' -DestinationPath 'lambda-package.zip' -Force"
fi
cd .. 2>/dev/null || true

SIZE=$(ls -lh lambda-package.zip | awk '{print $5}')
echo "=== Lambda package created: lambda-package.zip ($SIZE) ==="
