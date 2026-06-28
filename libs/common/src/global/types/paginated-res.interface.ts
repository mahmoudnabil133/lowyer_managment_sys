export interface PaginatedResponse<T> {
  results: number;
  totalDocuments: number;
  currentPage: number;
  totalPages: number;
  data: T[];
}
