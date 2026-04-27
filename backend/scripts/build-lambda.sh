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
npm ci --omit=dev --ignore-scripts 2>&1 | tail -3

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

BACKEND_DIR="$(pwd)"
PKG_DIR="$BACKEND_DIR/lambda-package"

# Remove non-PostgreSQL Prisma WASM compilers to keep package small
echo "Pruning Prisma bundle..."
PRISMA_RUNTIME="$PKG_DIR/node_modules/@prisma/client/runtime"
if [ -d "$PRISMA_RUNTIME" ]; then
  rm -f "$PRISMA_RUNTIME"/*cockroachdb* "$PRISMA_RUNTIME"/*mysql* "$PRISMA_RUNTIME"/*sqlite* \
    "$PRISMA_RUNTIME"/*sqlserver* "$PRISMA_RUNTIME"/*index-browser* \
    "$PRISMA_RUNTIME"/*wasm-compiler-edge* "$PRISMA_RUNTIME"/*.map \
    "$PRISMA_RUNTIME"/*.mjs "$PRISMA_RUNTIME"/*.mts 2>/dev/null || true
  rm -rf "$PKG_DIR/node_modules/@prisma/client/studio-core" \
    "$PKG_DIR/node_modules/@prisma/client/dev" \
    "$PKG_DIR/node_modules/@prisma/client/engines" \
    "$PKG_DIR/node_modules/@prisma/client/scripts" 2>/dev/null || true
fi

# Remove packages not needed at Lambda runtime
rm -rf "$PKG_DIR/node_modules/prisma" "$PKG_DIR/node_modules/typescript" \
  "$PKG_DIR/node_modules/better-sqlite3" "$PKG_DIR/node_modules/@prisma/adapter-better-sqlite3" \
  "$PKG_DIR/node_modules/react-dom" "$PKG_DIR/node_modules/chart.js" \
  "$PKG_DIR/node_modules/fast-check" "$PKG_DIR/node_modules/@types" \
  "$PKG_DIR/node_modules/hono" "$PKG_DIR/node_modules/valibot" \
  "$PKG_DIR/node_modules/effect" "$PKG_DIR/node_modules/@electric-sql" \
  "$PKG_DIR/node_modules/remeda" "$PKG_DIR/node_modules/csstype" \
  "$PKG_DIR/node_modules/jiti" "$PKG_DIR/node_modules/mysql2" \
  "$PKG_DIR/node_modules/ajv" "$PKG_DIR/node_modules/fast-xml-parser" 2>/dev/null || true

# Create zip
echo "Creating deployment ZIP..."
cd "$PKG_DIR"
if command -v zip &>/dev/null; then
  zip -r "$BACKEND_DIR/lambda-package.zip" . -x "*.git*" -x "*.DS_Store" -q
else
  cd "$BACKEND_DIR"
  powershell -Command "Compress-Archive -Path 'lambda-package\*' -DestinationPath 'lambda-package.zip' -Force"
fi
cd "$BACKEND_DIR"

SIZE=$(ls -lh lambda-package.zip | awk '{print $5}')
echo "=== Lambda package created: lambda-package.zip ($SIZE) ==="
