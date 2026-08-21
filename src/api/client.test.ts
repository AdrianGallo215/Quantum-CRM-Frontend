import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { useAuthStore } from '@/store/authStore'
import { codigoDeError, get, post } from './client'
import type { Empleado } from '@/types'

const EMPLEADO: Empleado = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Ruiz',
  email: 'ana@quantum.pe',
  rol: 'vendedor',
  area: 'Ventas',
  puesto: 'Vendedor',
  activo: true,
  requiere_cambio_contrasena: false,
}

function respuestaDeError(code: string, message: string) {
  return { data: null, meta: null, error: { code, message } }
}

describe('interceptor de respuesta de apiClient', () => {
  beforeEach(() => {
    useAuthStore.setState({ empleado: { ...EMPLEADO }, cargando: false })
  })

  it('no refresca ni reenvía cuando /auth/cambiar-contrasena responde 401', async () => {
    let refrescos = 0
    let intentosDeCambio = 0

    servidorMock.use(
      http.post(`${BASE_API}/auth/refresh`, () => {
        refrescos += 1
        return HttpResponse.json({ data: null, meta: null, error: null })
      }),
      http.post(`${BASE_API}/auth/cambiar-contrasena`, () => {
        intentosDeCambio += 1
        return HttpResponse.json(
          respuestaDeError('CREDENCIALES_INVALIDAS', 'La contraseña actual es incorrecta'),
          { status: 401 },
        )
      }),
    )

    const error = await post('/auth/cambiar-contrasena', {
      password_actual: 'equivocada',
      password_nueva: 'NuevaSegura123',
    }).then(
      () => null,
      (e: unknown) => e,
    )

    expect(codigoDeError(error)).toBe('CREDENCIALES_INVALIDAS')
    // La petición se envía UNA sola vez: reenviarla duplicaría el intento
    // fallido contra el contador del servidor.
    expect(intentosDeCambio).toBe(1)
    expect(refrescos).toBe(0)
  })

  it('marca requiere_cambio_contrasena en el store ante un 403 CAMBIO_CONTRASENA_REQUERIDO', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/oportunidades`, () =>
        HttpResponse.json(
          respuestaDeError('CAMBIO_CONTRASENA_REQUERIDO', 'Debes cambiar tu contraseña'),
          { status: 403 },
        ),
      ),
    )

    await expect(get('/oportunidades')).rejects.toBeDefined()

    expect(useAuthStore.getState().empleado?.requiere_cambio_contrasena).toBe(true)
  })

  it('no toca el store ante un 403 PERMISO_INSUFICIENTE', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/empleados`, () =>
        HttpResponse.json(
          respuestaDeError('PERMISO_INSUFICIENTE', 'No tienes permiso para esta acción'),
          { status: 403 },
        ),
      ),
    )

    await expect(get('/empleados')).rejects.toBeDefined()

    // Un 403 normal debe seguir llevando a la pantalla "Sin acceso".
    expect(useAuthStore.getState().empleado?.requiere_cambio_contrasena).toBe(false)
  })

  it('dispara un solo refresh para tres 401 en paralelo y reintenta las tres peticiones', async () => {
    let refrescos = 0
    const llamadasPorRecurso = new Map<string, number>()

    servidorMock.use(
      http.post(`${BASE_API}/auth/refresh`, async () => {
        refrescos += 1
        // El refresh tarda: mantiene la promesa en vuelo mientras llegan los
        // otros dos 401, que es justo lo que la deduplicación debe absorber.
        await delay(20)
        return HttpResponse.json({ data: null, meta: null, error: null })
      }),
      http.get(`${BASE_API}/recurso/:id`, ({ params }) => {
        const id = String(params.id)
        const previas = llamadasPorRecurso.get(id) ?? 0
        llamadasPorRecurso.set(id, previas + 1)
        if (previas === 0) {
          return HttpResponse.json(respuestaDeError('TOKEN_EXPIRADO', 'Sesión expirada'), {
            status: 401,
          })
        }
        return HttpResponse.json({ data: { id }, meta: null, error: null })
      }),
    )

    const resultados = await Promise.all([
      get<{ id: string }>('/recurso/1'),
      get<{ id: string }>('/recurso/2'),
      get<{ id: string }>('/recurso/3'),
    ])

    expect(resultados.map((r) => r.data.id)).toEqual(['1', '2', '3'])
    expect(refrescos).toBe(1)
    expect(llamadasPorRecurso.get('1')).toBe(2)
    expect(llamadasPorRecurso.get('2')).toBe(2)
    expect(llamadasPorRecurso.get('3')).toBe(2)
  })
})
