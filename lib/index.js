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
    #bindings = [];
    bindTo(target, key, listener) {
        this.on(key, listener);
        const removeHandler = () => {
            this.off(key, listener);
            const findIndex = this.#bindings.findIndex((b) => b.target === target &&
                b.key === key &&
                b.listener === listener);
            if (findIndex !== -1)
                this.#bindings.splice(findIndex, 1);
        };
        target.on('remove', removeHandler);
        this.#bindings.push({
            key: key,
            target,
            listener,
            removeHandler
        });
        return this;
    }
    remove() {
        this.emit('remove');
        for (const b of this.#bindings) {
            b.target.off('remove', b.removeHandler);
        }
        this.#bindings.length = 0;
    }
}
export { EventEmitter };
//# sourceMappingURL=index.js.map