import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { reportesApi } from './reportes'

describe('reportesApi.exportarComercial', () => {
  it('resuelve el blob y el nombre de archivo del Content-Disposition', async () => {
    const contenido = new TextEncoder().encode('contenido-xlsx-de-prueba')

    servidorMock.use(
      http.get(`${BASE_API}/reportes/exportar-comercial`, () => {
        return new HttpResponse(contenido, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="gestion-comercial-2026-09-08.xlsx"',
          },
        })
      }),
    )

    const resultado = await reportesApi.exportarComercial()

    expect(resultado.nombreArchivo).toBe('gestion-comercial-2026-09-08.xlsx')
    expect(resultado.blob).toBeInstanceOf(Blob)
    expect(resultado.blob.size).toBe(contenido.byteLength)
  })

  it('usa un nombre por defecto si el servidor no manda Content-Disposition', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/reportes/exportar-comercial`, () => {
        return new HttpResponse(new TextEncoder().encode('x'), {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        })
      }),
    )

    const resultado = await reportesApi.exportarComercial()

    expect(resultado.nombreArchivo).toBe('gestion-comercial.xlsx')
  })

  it('envía fecha_desde y fecha_hasta como query params cuando se pasan', async () => {
    const capturado: { params: URLSearchParams | null } = { params: null }

    servidorMock.use(
      http.get(`${BASE_API}/reportes/exportar-comercial`, ({ request }) => {
        capturado.params = new URL(request.url).searchParams
        return new HttpResponse(new TextEncoder().encode('x'))
      }),
    )

    await reportesApi.exportarComercial({ fecha_desde: '2026-01-01', fecha_hasta: '2026-06-30' })

    expect(capturado.params?.get('fecha_desde')).toBe('2026-01-01')
    expect(capturado.params?.get('fecha_hasta')).toBe('2026-06-30')
  })
})
