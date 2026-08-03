// Envelope estándar de la API (contrato_api.md §2)
export interface ApiMeta {
  page?: number
  per_page?: number
  total?: number
  total_pages?: number
  advertencia?: string
}

export interface ApiError {
  code: string
  message: string
  field?: string | null
}

export interface ApiResponse<T> {
  data: T
  meta: ApiMeta | null
  error: ApiError | null
}

export interface PaginationParams {
  page?: number
  per_page?: number
  sort?: string
  dir?: 'asc' | 'desc'
}
