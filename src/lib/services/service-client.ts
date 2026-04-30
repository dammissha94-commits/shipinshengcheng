type ServiceError = { message: string };

export type ServiceResult<T> = {
  data: T | null;
  error: ServiceError | null;
};

export type QueryPromise<T> = PromiseLike<ServiceResult<T>>;

export interface SelectQuery<T> extends QueryPromise<T[]> {
  eq(column: string, value: string): SelectQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SelectQuery<T>;
}

export interface SingleQuery<T> extends QueryPromise<T> {
  single(): QueryPromise<T>;
  maybeSingle(): QueryPromise<T | null>;
}

export interface UpdateQuery<T> {
  eq(column: string, value: string): UpdateQuery<T>;
  select(columns?: string): SingleQuery<T>;
}

export interface SupabaseTable<T> {
  select(columns?: string): SelectQuery<T>;
  insert(values: Partial<T> | Partial<T>[]): {
    select(columns?: string): SingleQuery<T>;
  };
  update(values: Partial<T>): UpdateQuery<T>;
}

export interface SupabaseServiceClient {
  from<T>(table: string): SupabaseTable<T>;
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function throwServiceError(error: ServiceError | null, action: string): void {
  if (error) {
    void action;
    throw new Error('操作失败，请稍后重试');
  }
}
