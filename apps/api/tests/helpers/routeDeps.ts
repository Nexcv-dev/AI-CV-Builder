/**
 * Route tests only stub the dependencies a test exercises.
 *
 * `stubRouteDeps<CvRouteDeps>({ ... })` keeps the stub's key names checked
 * against the router's deps type (a misspelled key fails `tsc`), while letting
 * each value be a lightweight mock instead of a full Mongoose model or helper.
 */
export type RouteDepsStub<T> = { [K in keyof T]?: unknown };

export const stubRouteDeps = <T>(deps: RouteDepsStub<T>): T => deps as T;
