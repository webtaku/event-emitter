type EventMap = Record<string, (...args: any[]) => any>;
type WithRemove<E extends EventMap> = E & {
    remove: () => void;
};
declare abstract class EventEmitter<E extends EventMap> {
    #private;
    on<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this;
    once<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this;
    off<K extends keyof WithRemove<E>>(key: K, listener: WithRemove<E>[K]): this;
    emit<K extends keyof WithRemove<E>>(key: K, ...args: Parameters<WithRemove<E>[K]>): Promise<ReturnType<WithRemove<E>[K]>[]>;
    bindTo<K extends keyof WithRemove<E>>(target: EventEmitter<EventMap>, key: K, listener: WithRemove<E>[K]): this;
    remove(): void;
}
export { EventEmitter, EventMap };
//# sourceMappingURL=index.d.ts.map