export interface ImportCsvFilaResultado {
  fila: number
  ruc: string
  razon_social: string
  estado: 'creada' | 'error'
  motivo: string | null
}

export interface ImportCsvResultado {
  total_filas: number
  creadas: number
  con_error: number
  detalle: ImportCsvFilaResultado[]
}
