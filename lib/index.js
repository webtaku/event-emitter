class EventEmitter {
    #listeners = {};
    on(key, listener) {
        if (!this.#listeners[key])
            this.#listeners[key] = [];
        this.#listeners[key].push({ listener });
        return this;
    }
    once(key, listener) {
        if (!this.#listeners[key])
            this.#listeners[key] = [];
        this.#listeners[key].push({ listener, once: true });
        return this;
    }
    off(key, listener) {
        const events = this.#listeners[key];
        if (!events)
            return this;
        this.#listeners[key] = events.filter((e) => e.listener !== listener);
        if (this.#listeners[key].length === 0)
            delete this.#listeners[key];
        return this;
    }
    async emit(key, ...args) {
        const events = this.#listeners[key];
        if (!events)
            return [];
        const results = [];
        const promises = [];
        for (const event of events) {
            const result = event.listener(...args);
            if (event.once)
                this.off(key, event.listener);
            if (result instanceof Promise)
                promises.push(result);
            else
                results.push(result);
        }
        return results.concat(await Promise.all(promises));
    }
}
export { EventEmitter };
//# sourceMappingURL=index.js.map