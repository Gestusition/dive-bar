import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newGame, reduceGame } from './engine';
import { decodeBackup, encodeBackup, MAX_BACKUP_BYTES, validateSave } from './storage';
import { hmac, seal, sha256, unseal } from './seal';

const bytes = (s: string) => new TextEncoder().encode(s);
describe('save sealing', () => {
  it.each(['', 'abc', 'é🍸'.repeat(100), 'x'.repeat(1000)])(
    'matches standard SHA-256 for a %s message',
    (s) => {
      expect(Buffer.from(sha256(bytes(s))).toString('hex')).toBe(
        createHash('sha256').update(s).digest('hex'),
      );
    },
  );
  it.each([3, 64, 100])('matches standard HMAC with a %s-byte key', (length) => {
    const key = new Uint8Array(length).fill(42);
    expect(Buffer.from(hmac(key, bytes('night 2'))).toString('hex')).toBe(
      createHmac('sha256', key).update('night 2').digest('hex'),
    );
  });
  it('round trips binary data with fresh nonces and rejects changed context or body', () => {
    const input = new Uint8Array(300).map((_, i) => i);
    const sealed = seal(input, 'header');
    expect(unseal(sealed, 'header')).toEqual(input);
    expect(seal(input, 'header').nonce).not.toBe(sealed.nonce);
    expect(() => unseal(sealed, 'changed')).toThrow();
    sealed.body[0] ^= 1;
    expect(() => unseal(sealed, 'header')).toThrow();
  });
});
describe('backup files and validation', () => {
  it('round trips an active night, not just a fresh bar', async () => {
    const game = reduceGame(newGame(), { type: 'open' });
    expect(await decodeBackup(await (await encodeBackup(game)).text())).toEqual(game);
  });
  it('rejects modified metadata, changed ciphertext, truncation, old and plain JSON files', async () => {
    const text = await (await encodeBackup(newGame())).text();
    const lines = text.trim().split('\n');
    const changedBody = [...lines];
    changedBody[3] = (changedBody[3][0] === 'A' ? 'B' : 'A') + changedBody[3].slice(1);
    for (const invalid of [
      text.replace('night=1', 'night=2'),
      changedBody.join('\n'),
      lines.slice(0, 3).join('\n'),
      text.replace('SAVE v3', 'SAVE v2'),
      JSON.stringify(newGame()),
    ])
      await expect(decodeBackup(invalid)).rejects.toThrow();
  });
  it('rejects oversized files before parsing', async () => {
    await expect(decodeBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).rejects.toThrow('too big');
  });
  it('bounds decompression even when the compressed file has a valid signature', async () => {
    const oversized = { ...newGame(), notice: 'x'.repeat(2 * 1024 * 1024) };
    const text = await (await encodeBackup(oversized)).text();
    expect(text.length).toBeLessThan(MAX_BACKUP_BYTES);
    await expect(decodeBackup(text)).rejects.toThrow('changed or damaged');
  });
  it.each([
    { cash: NaN },
    { cash: 1.5 },
    { cash: -1 },
    { version: -1 },
    { activeMenu: ['manhattan', 'manhattan'] },
    { surprise: true },
    { inventory: {} },
    { nextId: 0 },
  ])('rejects malformed state: %j', (patch) => {
    expect(() => validateSave({ ...newGame(), ...patch })).toThrow();
  });
});
