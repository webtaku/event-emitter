type EventMap = Record<string, (...args: any[]) => any>
type WithRemove<E extends EventMap> = E & { remove: () => void }

abstract class EventEmitter<E extends EventMap> {
  #listeners: { [K in keyof WithRemove<E>]?: { listener: WithRemove<E>[K]; once?: boolean }[] } = {}

  on<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this {
    if (!this.#listeners[key]) this.#listeners[key] = []
    this.#listeners[key].push({ listener })
    return this
  }

  once<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this {
    if (!this.#listeners[key]) this.#listeners[key] = []
    this.#listeners[key].push({ listener, once: true })
    return this
  }

  off<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this {
    const events = this.#listeners[key]
    if (!events) return this
    this.#listeners[key] = events.filter((e) => e.listener !== listener)
    if (this.#listeners[key].length === 0) delete this.#listeners[key]
    return this
  }

  async emit<K extends keyof WithRemove<E>>(key: K, ...args: Parameters<WithRemove<E>[K]>): Promise<ReturnType<WithRemove<E>[K]>[]> {
    const events = this.#listeners[key]
    if (!events) return []

    const results: ReturnType<WithRemove<E>[K]>[] = []
    const promises: Promise<ReturnType<WithRemove<E>[K]>>[] = []

    for (const event of events) {
      const result = event.listener(...args)
      if (event.once) this.off(key, event.listener)
      if (result instanceof Promise) promises.push(result)
      else results.push(result)
    }

    return results.concat(await Promise.all(promises))
  }

  #bindings: Array<{
    key: string
    target: EventEmitter<EventMap>
    listener: (...args: any[]) => any
    removeHandler: () => void
  }> = []

  bindTo<K extends keyof WithRemove<E>>(target: EventEmitter<EventMap>, key: K, listener: WithRemove<E>[K]): this {
    this.on(key, listener)

    const removeHandler = () => {
      this.off(key, listener)
      const findIndex = this.#bindings.findIndex(
        (b) =>
          b.target === target &&
          b.key === key &&
          b.listener === listener
      )
      if (findIndex !== -1) this.#bindings.splice(findIndex, 1)
    }

    target.on('remove', removeHandler)

    this.#bindings.push({
      key: key as string,
      target,
      listener,
      removeHandler
    })

    return this
  }

  remove() {
    (this as any).emit('remove')
    for (const b of this.#bindings) {
      b.target.off('remove', b.removeHandler)
    }
    this.#bindings.length = 0
  }
}

export { EventEmitter, EventMap }
