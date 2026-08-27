export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  totalCount?: number;
  totalPages?: number;
  hasNextPage: boolean;
}

export interface ApiResponsePaginated<T> {
  success: true;
  data: T[];
  pagination: ApiPaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseError {
  success: false;
  error: ApiErrorDetail;
}

export function createSuccessResponse<T>(data: T): ApiResponseSuccess<T> {
  return {
    success: true,
    data,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: ApiPaginationMeta
): ApiResponsePaginated<T> {
  return {
    success: true,
    data,
    pagination,
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponseError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
