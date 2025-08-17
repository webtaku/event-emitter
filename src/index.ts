type EventMap = Record<string, (...args: any[]) => any>;

abstract class EventEmitter<E extends EventMap> {
  #listeners: { [K in keyof E]?: { listener: E[K]; once?: boolean; }[] } = {};

  on<K extends keyof E>(key: K, listener: E[K]): this {
    if (!this.#listeners[key]) this.#listeners[key] = [];
    this.#listeners[key].push({ listener });
    return this;
  }

  once<K extends keyof E>(key: K, listener: E[K]): this {
    if (!this.#listeners[key]) this.#listeners[key] = [];
    this.#listeners[key].push({ listener, once: true });
    return this;
  }

  off<K extends keyof E>(key: K, listener: E[K]): this {
    const events = this.#listeners[key];
    if (!events) return this;
    this.#listeners[key] = events.filter((e) => e.listener !== listener);
    if (this.#listeners[key].length === 0) delete this.#listeners[key];
    return this;
  }

  async emit<K extends keyof E>(key: K, ...args: Parameters<E[K]>): Promise<ReturnType<E[K]>[]> {
    const events = this.#listeners[key];
    if (!events) return [];

    const results: ReturnType<E[K]>[] = [];
    const promises: Promise<ReturnType<E[K]>>[] = [];

    for (const event of events) {
      const result = event.listener(...args);
      if (event.once) this.off(key, event.listener);
      if (result instanceof Promise) promises.push(result);
      else results.push(result);
    }

    return results.concat(await Promise.all(promises));
  }
}

export { EventEmitter, EventMap };

