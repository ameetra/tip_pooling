// Copies Prisma SQLite WASM runtime files to @prisma/client/runtime after npm install.
// Needed because @prisma/client ships only PostgreSQL WASM; SQLite WASM lives in the prisma CLI package.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/prisma/build');
const dst = path.join(__dirname, '../node_modules/@prisma/client/runtime');

if (!fs.existsSync(src) || !fs.existsSync(dst)) process.exit(0);

// Copy WASM files
['query_compiler_fast_bg.sqlite.js', 'query_compiler_fast_bg.sqlite.mjs', 'query_compiler_fast_bg.sqlite.wasm'].forEach(f => {
  try { fs.copyFileSync(path.join(src, f), path.join(dst, f)); } catch {}
});

// Generate wasm-base64.js if WASM exists
const wasmPath = path.join(dst, 'query_compiler_fast_bg.sqlite.wasm');
const b64Path = path.join(dst, 'query_compiler_fast_bg.sqlite.wasm-base64.js');
if (fs.existsSync(wasmPath) && !fs.existsSync(b64Path)) {
  const b64 = fs.readFileSync(wasmPath).toString('base64');
  fs.writeFileSync(b64Path, `const wasm = "${b64}";\nmodule.exports = { wasm }`);
}

console.log('Prisma SQLite runtime copied.');
