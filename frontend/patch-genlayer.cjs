/**
 * Post-install patch for genlayer-js SDK.
 * 
 * Problem: GenLayer studionet RPC returns gasPrice = 0x0.
 * The SDK passes this directly to eth_sendTransaction, causing MetaMask
 * to submit with feeCap=0, which the chain rejects with:
 *   "transaction feeCap 0 below chain minimum"
 *
 * Fix: Enforce a minimum gasPrice floor of 0.5 Gwei (500_000_000 wei).
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules', 'genlayer-js', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('[patch-genlayer] genlayer-js not found, skipping patch.');
  process.exit(0);
}

let code = fs.readFileSync(target, 'utf8');

// Check if already patched
if (code.includes('_minGas2')) {
  console.log('[patch-genlayer] Already patched, skipping.');
  process.exit(0);
}

// Patch 1: Local account path — force gasPrice minimum
code = code.replace(
  'gasPrice: BigInt(gasPriceHex2),',
  `gasPrice: (() => { const _v = BigInt(gasPriceHex2); return _v < 500000000n ? 500000000n : _v; })(),`
);

// Patch 2: External wallet path — force gasPrice minimum and always include it
code = code.replace(
  `console.warn("Failed to fetch gas price, delegating gas price selection to wallet:", error);`,
  `console.warn("Failed to fetch gas price, using minimum:", error);\n      gasPriceHex = "0x1dcd6500";`
);

// Ensure gasPriceHex is never "0x0"  
code = code.replace(
  `if (typeof gasPriceResult === "string") {\n        gasPriceHex = gasPriceResult;\n      }`,
  `if (typeof gasPriceResult === "string") {\n        gasPriceHex = gasPriceResult;\n        if (BigInt(gasPriceHex) < 500000000n) gasPriceHex = "0x1dcd6500";\n      }`
);

// Ensure gasPrice is always set (not conditional spread)
code = code.replace(
  '...gasPriceHex ? { gasPrice: gasPriceHex } : {}',
  'gasPrice: gasPriceHex || "0x1dcd6500"'
);

fs.writeFileSync(target, code, 'utf8');
console.log('[patch-genlayer] ✅ Patched gasPrice minimum floor (0.5 Gwei) successfully.');
