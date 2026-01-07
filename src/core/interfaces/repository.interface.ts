/**
 * Base repository interface for all data access operations
 * Provides a consistent contract for repository implementations
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

/**
 * Extended repository interface with common query operations
 */
export interface IExtendedRepository<T, CreateInput, UpdateInput, FilterInput = unknown>
  extends IRepository<T, CreateInput, UpdateInput> {
  findMany(filter?: FilterInput): Promise<T[]>;
  findOne(filter: FilterInput): Promise<T | null>;
  count(filter?: FilterInput): Promise<number>;
}

