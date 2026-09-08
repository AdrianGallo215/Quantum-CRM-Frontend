import { describe, expect, it } from 'vitest'
import { nombreArchivoDesde } from './descargaArchivos'

describe('nombreArchivoDesde', () => {
  it('extrae el filename de un Content-Disposition con comillas', () => {
    const header = 'attachment; filename="gestion-comercial-2026-09-08.xlsx"'
    expect(nombreArchivoDesde(header, 'default.xlsx')).toBe('gestion-comercial-2026-09-08.xlsx')
  })

  it('extrae el filename de un Content-Disposition sin comillas', () => {
    const header = 'attachment; filename=gestion-comercial-2026-09-08.xlsx'
    expect(nombreArchivoDesde(header, 'default.xlsx')).toBe('gestion-comercial-2026-09-08.xlsx')
  })

  it('usa el nombre por defecto si no hay header', () => {
    expect(nombreArchivoDesde(undefined, 'default.xlsx')).toBe('default.xlsx')
    expect(nombreArchivoDesde(null, 'default.xlsx')).toBe('default.xlsx')
  })

  it('usa el nombre por defecto si el header no trae filename', () => {
    expect(nombreArchivoDesde('attachment', 'default.xlsx')).toBe('default.xlsx')
  })
})
