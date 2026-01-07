/**
 * Base service interface
 * All services should implement this interface for consistency
 */
export interface IService {
  readonly name: string;
}

/**
 * Service with CRUD operations
 */
export interface ICrudService<T, CreateInput, UpdateInput> extends IService {
  create(input: CreateInput): Promise<T>;
  findById(id: string): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

