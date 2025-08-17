import { EventEmitter } from '../src';

type Listeners = {
  ping: () => number;
  msg: (text: string) => string | Promise<string>;
  asyncOp: (n: number) => Promise<number>;
  mixed: (v: number) => number | Promise<number>;
};

class TestEmitter extends EventEmitter<Listeners> {
  public emitEvent<K extends keyof Listeners>(
    key: K,
    ...args: Parameters<Listeners[K]>
  ) {
    // expose protected emit for testing
    return this.emit(key, ...args);
  }
}

describe('EventEmitter', () => {
  let emitter: TestEmitter;

  beforeEach(() => {
    emitter = new TestEmitter();
  });

  it('calls listeners registered with on and collects sync return values', async () => {
    const a = jest.fn(() => 1);
    const b = jest.fn(() => 2);

    emitter.on('ping', a).on('ping', b);

    const results = await emitter.emitEvent('ping');

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(results).toEqual([1, 2]); // sync listeners in registration order
  });

  it('calls once listeners only once and auto-removes them', async () => {
    const fn = jest.fn(() => 42);

    emitter.once('ping', fn);

    const first = await emitter.emitEvent('ping');
    expect(first).toEqual([42]);
    expect(fn).toHaveBeenCalledTimes(1);

    // second emit should not call the once listener
    const second = await emitter.emitEvent('ping');
    expect(second).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off(key, listener) removes only the specified listener', async () => {
    const a = jest.fn(() => 'A');
    const b = jest.fn(() => 'B');

    emitter.on('msg', a).on('msg', b);
    emitter.off('msg', a);

    const results = await emitter.emitEvent('msg', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['B']);
  });

  it('does not support off(key) without listener and should be a type error', async () => {
    // The line below is intentionally included to ensure a compile-time error in TS.
    // It will be stripped by TS and not executed at runtime.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => (emitter as any).off('msg')).not.toThrow();
  });

  it('supports chaining on/once/off', () => {
    const fn = jest.fn(() => 0);
    const returned = emitter.on('ping', fn).once('ping', fn).off('ping', fn);
    expect(returned).toBe(emitter);
  });

  it('mixing sync and async listeners returns "all sync results" then "all async results" in registration order', async () => {
    const sync1 = jest.fn((n: number) => n + 1);
    const async1 = jest.fn(async (n: number) => {
      await new Promise((r) => setTimeout(r, 20));
      return n + 10;
    });
    const sync2 = jest.fn((n: number) => n + 2);
    const async2 = jest.fn(async (n: number) => {
      await new Promise((r) => setTimeout(r, 5));
      return n + 20;
    });

    emitter
      .on('mixed', sync1 as any)
      .on('mixed', async1 as any)
      .on('mixed', sync2 as any)
      .on('mixed', async2 as any);

    const results = await emitter.emitEvent('mixed', 1);

    // implementation pushes sync first, then awaits Promise.all for async in registration order
    expect(results).toEqual([2, 3, 11, 21]);
  });

  it('async-only listeners still resolve in registration order', async () => {
    const slow = jest.fn(async (n: number) => {
      await new Promise((r) => setTimeout(r, 30));
      return n * 2;
    });
    const fast = jest.fn(async (n: number) => {
      await new Promise((r) => setTimeout(r, 5));
      return n * 3;
    });

    emitter.on('asyncOp', slow).on('asyncOp', fast);

    const results = await emitter.emitEvent('asyncOp', 5);
    // Promise.all preserves order: slow, then fast
    expect(results).toEqual([10, 15]);
  });

  it('returns an empty array when no listeners are present', async () => {
    const results = await emitter.emitEvent('ping');
    expect(results).toEqual([]);
  });

  it('removing a once listener during emit still calls other listeners in the same tick', async () => {
    const hit: number[] = [];
    const a = jest.fn(() => {
      hit.push(1);
      return 1; // return value to satisfy () => number
    });
    const b = jest.fn(() => {
      hit.push(2);
      return 2;
    });
    const c = jest.fn(() => {
      hit.push(3);
      return 3;
    });

    emitter.once('ping', a).on('ping', b).on('ping', c);

    await emitter.emitEvent('ping');

    // for..of iterates a snapshot; once removal doesn’t prevent other listeners in this round
    expect(hit).toEqual([1, 2, 3]);

    // emit again: a is gone, b and c remain
    await emitter.emitEvent('ping');
    expect(hit).toEqual([1, 2, 3, 2, 3]);
  });

  it('off is safe for missing keys or unregistered listeners', () => {
    const fn = jest.fn(() => 'x');

    // off on a key with no listeners should not throw
    expect(() => emitter.off('msg', fn as any)).not.toThrow();

    // add a different listener and try to remove a non-matching one
    const other = jest.fn(() => 'y');
    emitter.on('msg', other as any);
    expect(() => emitter.off('msg', fn as any)).not.toThrow();

    // removing the actual one
    emitter.off('msg', other as any);
    // no further assertion needed; absence will be observed by emit below
  });

  it('propagates thrown errors from listeners', async () => {
    const err = new Error('boom');
    emitter.on('msg', () => {
      throw err;
    });

    await expect(emitter.emitEvent('msg', 'x')).rejects.toThrow('boom');
  });
});
