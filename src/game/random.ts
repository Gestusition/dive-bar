/** Fresh browser/OS entropy for live play on desktop and mobile. */
export function deviceRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
}
