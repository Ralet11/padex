import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeJwtPayload, isJwtExpired, readStoredSession } from './runtime';

function buildJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (value) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  return `${encode(header)}.${encode(payload)}.signature`;
}

function createStorage(initialValue = null) {
  let currentValue = initialValue;

  return {
    getItem: vi.fn(() => currentValue),
    setItem: vi.fn((_, nextValue) => {
      currentValue = nextValue;
    }),
    removeItem: vi.fn(() => {
      currentValue = null;
    }),
  };
}

describe('runtime auth helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a stored session when JSON and token are valid', () => {
    const session = { id: 7, role: 'partner', token: 'abc123' };
    const storage = createStorage(JSON.stringify(session));

    expect(readStoredSession(storage)).toEqual(session);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('drops malformed stored session payloads', () => {
    const storage = createStorage('{broken-json');

    expect(readStoredSession(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('drops stored sessions without a token', () => {
    const storage = createStorage(JSON.stringify({ id: 7, role: 'partner' }));

    expect(readStoredSession(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('decodes jwt payloads', () => {
    const token = buildJwt({ sub: 10, role: 'partner', exp: 1_900_000_000 });

    expect(decodeJwtPayload(token)).toMatchObject({
      sub: 10,
      role: 'partner',
      exp: 1_900_000_000,
    });
  });

  it('marks expired tokens using exp timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T22:00:00.000Z'));

    const expired = buildJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    const valid = buildJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(isJwtExpired(expired)).toBe(true);
    expect(isJwtExpired(valid)).toBe(false);
  });
});
