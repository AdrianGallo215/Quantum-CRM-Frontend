import { describe, expect, it, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { useAuthStore } from '@/store/authStore'
import type { Notificacion } from '@/types'

const navegar = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navegar }
})

const EMPLEADO = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Ruiz',
  email: 'ana@quantum.pe',
  rol: 'vendedor' as const,
  area: 'Ventas',
  puesto: 'Vendedor',
  activo: true,
}

function notificacionDeMeta(): Notificacion {
  return {
    id: 42,
    tipo: 'meta_aprobada',
    mensaje: 'Tu meta de ventas fue aprobada',
    entidad_tipo: 'meta_venta',
    entidad_id: 7,
    leida: false,
    created_at: '2026-08-18T10:00:00Z',
    actor: null,
  }
}

describe('NotificacionesDropdown', () => {
  beforeEach(() => {
    navegar.mockClear()
    useAuthStore.setState({ empleado: EMPLEADO, cargando: false })
  })

  it('lleva una notificación de meta_venta a /solicitudes, no a una ruta inexistente', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/notificaciones/no-leidas/count`, () =>
        HttpResponse.json({ data: { count: 1 }, meta: null, error: null }),
      ),
      http.get(`${BASE_API}/notificaciones`, () =>
        HttpResponse.json({ data: [notificacionDeMeta()], meta: null, error: null }),
      ),
      http.patch(`${BASE_API}/notificaciones/42/leida`, () =>
        HttpResponse.json({ data: null, meta: null, error: null }),
      ),
    )

    renderConProviders(<NotificacionesDropdown />)

    await userEvent.click(await screen.findByRole('button'))
    await userEvent.click(await screen.findByText('Tu meta de ventas fue aprobada'))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/solicitudes'))
    expect(navegar).not.toHaveBeenCalledWith(expect.stringContaining('undefined'))
  })
})
