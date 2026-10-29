// Sealing for saves: every save is encrypted and signed, so it cannot be read,
// edited or made up by hand, and anything that does not carry a valid signature is
// refused before it is even parsed.
//
// SHA-256 is written out here rather than taken from the browser, because the
// browser only offers its crypto on https pages and the game is also played from a
// plain http address on the local network. The cipher is SHA-256 in counter mode
// and the signature is HMAC-SHA-256 over everything that is stored.
//
// The key ships with the game, so this stops editing and forging by hand, not a
// determined reverse engineer. What keeps the game safe from a bad save is that a
// save is only ever data: it is signature-checked, parsed and then validated field
// by field (see storage.ts), and nothing in it is ever run.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
export function sha256(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const length = data.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(data);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
  view.setUint32(padded.length - 4, (length * 8) >>> 0);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}
const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const text = (s: string) => new TextEncoder().encode(s);
export function hmac(key: Uint8Array, message: Uint8Array) {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha256(key) : key);
  const inner = block.map((b) => b ^ 0x36);
  const outer = block.map((b) => b ^ 0x5c);
  return sha256(join(outer, sha256(join(inner, message))));
}
const master = sha256(text('dive-bar · save seal · 2026 · a little bar, a good story'));
const cipherKey = hmac(master, text('cipher'));
const signKey = hmac(master, text('sign'));
/** XOR with a keystream of SHA-256(key, nonce, counter) blocks; the same call undoes it. */
function keystream(data: Uint8Array, nonce: Uint8Array) {
  const out = new Uint8Array(data.length);
  const counter = new Uint8Array(4);
  for (let i = 0; i < data.length; i += 32) {
    new DataView(counter.buffer).setUint32(0, i / 32);
    const block = sha256(join(cipherKey, nonce, counter));
    for (let j = 0; j < 32 && i + j < data.length; j++) out[i + j] = data[i + j] ^ block[j];
  }
  return out;
}
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (s: string) =>
  /^([0-9a-f]{2})+$/.test(s) ? Uint8Array.from(s.match(/../g)!, (b) => parseInt(b, 16)) : null;
/** Compare without stopping at the first difference. */
const same = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.reduce((n, x, i) => n | (x ^ b[i]), 0) === 0;
function freshNonce() {
  const nonce = new Uint8Array(16);
  try {
    crypto.getRandomValues(nonce);
  } catch {
    for (let i = 0; i < 16; i++) nonce[i] = Math.floor(Math.random() * 256);
  }
  return nonce;
}
export interface Sealed {
  nonce: string;
  body: Uint8Array;
  signature: string;
}
/** Encrypt and sign `data`; `context` (such as a file header) is signed too. */
export function seal(data: Uint8Array, context = ''): Sealed {
  const nonce = freshNonce();
  const body = keystream(data, nonce);
  return {
    nonce: hex(nonce),
    body,
    signature: hex(hmac(signKey, join(text(context + '|'), nonce, body))),
  };
}
/** Check the signature and decrypt, or throw if anything was changed. */
export function unseal(sealed: Sealed, context = ''): Uint8Array {
  const nonce = fromHex(sealed.nonce);
  const signature = fromHex(sealed.signature);
  if (!nonce || nonce.length !== 16 || !signature) throw Error('unsealed');
  if (!same(hmac(signKey, join(text(context + '|'), nonce, sealed.body)), signature))
    throw Error('tampered');
  return keystream(sealed.body, nonce);
}
