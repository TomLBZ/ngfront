export type Keyable = string | number | symbol;
export type Dict<K extends Keyable, T> = { [P in K]: T; };
export type DictN<T> = Dict<number, T>;
export type DictS<T> = Dict<string, T>;
export type NullLike = null | undefined;
export type Optional<T> = T | NullLike;
export type Nullable<T> = T | null;
export type Concrete<T> = T extends NullLike ? never : T;
export type Func1<I, O> = (i: I) => O;
export type FuncN<I, O> = (...i: I[]) => O;
export type Func<I, O> = Func1<I, O> | FuncN<I, O>;
export type Callback<T = void> = Func1<T, void>;
export type ValidateFunc<T = void> = Func1<T, boolean>;
export type Pair<T> = [T, T];
export type Trio<T> = [T, T, T];
export type Quad<T> = [T, T, T, T];
export type Constructor<T> = new (...args: any[]) => T;