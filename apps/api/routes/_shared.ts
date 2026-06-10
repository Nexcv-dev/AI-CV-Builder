export type RouteDeps = Record<string, any>;

export const bindDeps = <T extends RouteDeps>(deps: T) => deps;
