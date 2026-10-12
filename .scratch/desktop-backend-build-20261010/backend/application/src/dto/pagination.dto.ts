export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResultDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
