import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { crearQueryClientDePrueba } from '@/test/utilidades'
import { descargarBlob } from '@/utils/descargaArchivos'
import { reportesApi } from '@/api/reportes'
import { useExportarComercial } from './usePantallas'

vi.mock('@/utils/descargaArchivos', () => ({ descargarBlob: vi.fn() }))
vi.mock('@/api/reportes', () => ({ reportesApi: { exportarComercial: vi.fn() } }))

function envoltorio() {
  const queryClient = crearQueryClientDePrueba()
  return function Envoltorio({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useExportarComercial', () => {
  it('descarga el blob devuelto por la API al completar la mutación', async () => {
    const blob = new Blob(['contenido'])
    vi.mocked(reportesApi.exportarComercial).mockResolvedValue({
      blob,
      nombreArchivo: 'gestion-comercial-2026-09-08.xlsx',
    })

    const { result } = renderHook(() => useExportarComercial(), { wrapper: envoltorio() })

    result.current.mutate(undefined)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(descargarBlob).toHaveBeenCalledWith(blob, 'gestion-comercial-2026-09-08.xlsx')
  })

  it('pasa fecha_desde/fecha_hasta a la API cuando se llama con filtros', async () => {
    vi.mocked(reportesApi.exportarComercial).mockResolvedValue({
      blob: new Blob(['x']),
      nombreArchivo: 'x.xlsx',
    })

    const { result } = renderHook(() => useExportarComercial(), { wrapper: envoltorio() })

    result.current.mutate({ fecha_desde: '2026-01-01', fecha_hasta: '2026-06-30' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(reportesApi.exportarComercial).toHaveBeenCalledWith({
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-06-30',
    })
  })
})
