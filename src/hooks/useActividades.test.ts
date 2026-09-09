import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { crearQueryClientDePrueba } from '@/test/utilidades'
import type { Actividad } from '@/types'
import { useActividades, useComentariosActividad, useCrearComentario } from './useActividades'

function envoltorio(queryClient: QueryClient) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function actividad(): Actividad {
  return {
    tipo: 'tarea',
    id: 42,
    titulo: 'llamada',
    descripcion: 'Llamar al contacto',
    estado: 'pendiente',
    fecha_hora: '2026-09-10T15:00:00Z',
    fecha_dia: null,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'ACME SAC', distrito: 'Miraflores' },
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 3,
    created_at: '2026-09-01T10:00:00Z',
  }
}

/** Espía sobre invalidateQueries — mismo patrón que `useSimulaciones.test.ts`. */
function espiarInvalidaciones(queryClient: QueryClient): unknown[][] {
  const invalidadas: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = (filtro?: { queryKey?: readonly unknown[] }) => {
    if (filtro?.queryKey) invalidadas.push([...filtro.queryKey])
    return original(filtro)
  }
  return invalidadas
}

describe('useActividades', () => {
  it('no dispara la petición mientras id_empleado no sea válido', async () => {
    // `id_empleado` es obligatorio (informe §3). Sin él el backend responde 400;
    // la query se queda deshabilitada en vez de pedir algo que va a fallar.
    // No se declara NINGÚN handler: con `onUnhandledRequest: 'error'` en el
    // setup, cualquier request haría fallar este test — que es justo la aserción.
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(() => useActividades({ id_empleado: 0 }), {
      wrapper: envoltorio(qc),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('manda los filtros como query params y devuelve el envelope con meta', async () => {
    let urlVista = ''
    servidorMock.use(
      http.get(`${BASE_API}/actividades`, ({ request }) => {
        urlVista = request.url
        return HttpResponse.json({
          data: [actividad()],
          meta: { page: 1, per_page: 20, total: 47, total_pages: 3 },
          error: null,
        })
      }),
    )
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(
      () => useActividades({ id_empleado: 7, tipo: 'tarea', page: 2, per_page: 20 }),
      { wrapper: envoltorio(qc) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(urlVista).toContain('id_empleado=7')
    expect(urlVista).toContain('tipo=tarea')
    expect(urlVista).toContain('page=2')
    expect(result.current.data?.meta?.total).toBe(47)
    expect(result.current.data?.data).toHaveLength(1)
  })
})

describe('useComentariosActividad', () => {
  it('pide la URL con el tipo en minúscula y singular', async () => {
    let urlVista = ''
    servidorMock.use(
      http.get(`${BASE_API}/actividades/evento/15/comentarios`, ({ request }) => {
        urlVista = request.url
        return HttpResponse.json({ data: [], meta: null, error: null })
      }),
    )
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(() => useComentariosActividad('evento', 15), {
      wrapper: envoltorio(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(urlVista).toContain('/actividades/evento/15/comentarios')
  })
})

describe('useCrearComentario', () => {
  it('invalida todo el árbol de actividades, no solo la lista de comentarios', async () => {
    // Sincronización 360 (CLAUDE.md regla 4): el badge con el conteo
    // `comentarios` vive en la fila del historial, en OTRA query. Invalidar solo
    // los comentarios deja la tabla mostrando el número viejo.
    servidorMock.use(
      http.post(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json(
          {
            data: {
              id: 5,
              tipo: 'tarea',
              id_actividad: 42,
              texto: 'ok',
              created_at: '2026-09-08T10:00:00Z',
              created_by: 7,
              autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
            },
            meta: null,
            error: null,
          },
          { status: 201 },
        ),
      ),
    )
    const qc = crearQueryClientDePrueba()
    const invalidadas = espiarInvalidaciones(qc)
    const { result } = renderHook(() => useCrearComentario('tarea', 42), {
      wrapper: envoltorio(qc),
    })

    await result.current.mutateAsync({ texto: 'ok' })

    await waitFor(() =>
      expect(invalidadas.some((k) => k[0] === 'actividades' && k.length === 1)).toBe(true),
    )
  })
})
