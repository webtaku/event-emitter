type EventMap = Record<string, (...args: any[]) => any>;
declare abstract class EventEmitter<E extends EventMap> {
    #private;
    on<K extends keyof E>(key: K, listener: E[K]): this;
    once<K extends keyof E>(key: K, listener: E[K]): this;
    off<K extends keyof E>(key: K, listener: E[K]): this;
    emit<K extends keyof E>(key: K, ...args: Parameters<E[K]>): Promise<ReturnType<E[K]>[]>;
}
export { EventEmitter, EventMap };
//# sourceMappingURL=index.d.ts.map