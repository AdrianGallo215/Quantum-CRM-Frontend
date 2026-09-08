import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { crearQueryClientDePrueba } from '@/test/utilidades'
import type { Simulacion } from '@/types'
import { qk } from './queryKeys'
import {
  useActualizarSimulacion,
  useBifurcarSimulacion,
  useCrearSimulacion,
  useEliminarSimulacion,
  useHistorialSimulacion,
  useMarcarPrincipal,
  useRestaurarSimulacion,
  useSimulacion,
  useCronograma,
} from './useSimulaciones'
import { useCalculadora } from './useCalculadora'
import { useTipoCambio } from './useTipoCambio'

const ID_SIMULACION = 7
const ID_OPORTUNIDAD = 101

function simulacion(overrides: Partial<Simulacion> = {}): Simulacion {
  return {
    id: ID_SIMULACION,
    nombre: 'Leasing 48m',
    nombre_es_manual: false,
    modo: 'leasing',
    id_oportunidad_item: 55,
    id_oportunidad: ID_OPORTUNIDAD,
    id_modelo: 3,
    modelo: { id: 3, codigo: 'KW-12' },
    id_simulacion_origen: null,
    precio_venta: '150000.00',
    descuento: '0.00',
    cuota_inicial: '45000.00',
    plazo_meses: 48,
    tea: '14.00',
    valor_residual: '25000.00',
    dias_trabajados: 22,
    comision_estructuracion: '1180.00',
    cuota_final: '2172.06',
    es_principal: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    eliminacion_prevista_el: null,
    ...overrides,
  }
}

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

function envoltorio(queryClient: QueryClient) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

/**
 * Espía sobre `invalidateQueries` — mismo patrón que
 * `PropiedadesCard.test.tsx`. Registra la key de cada invalidación sin
 * impedirla, para poder afirmar sobre el CONJUNTO invalidado, que es lo que
 * la sincronización 360 promete (`TESTING-frontend.md` §4.4).
 */
function espiarInvalidaciones(queryClient: QueryClient): unknown[][] {
  const invalidadas: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = (filtro?: { queryKey?: readonly unknown[] }) => {
    if (filtro?.queryKey) invalidadas.push([...filtro.queryKey])
    return original(filtro)
  }
  return invalidadas
}

function tocaPrefijo(invalidadas: unknown[][], prefijo: readonly unknown[]): boolean {
  return invalidadas.some((key) => prefijo.every((parte, i) => key[i] === parte))
}

interface CasoDeEscritura {
  nombre: string
  handlers: ReturnType<typeof http.post>[]
  /**
   * Id de la simulación que la escritura deja tocada. Coincide con el del hook
   * salvo en `bifurcar`, que crea una fila NUEVA y deja el origen intacto (§23):
   * ahí lo que hay que refrescar es el cronograma de la nueva.
   */
  idEscrito: number
  ejecutar: (envuelve: ReturnType<typeof envoltorio>) => Promise<unknown>
}

/**
 * Las SEIS mutaciones del módulo. La tabla se recorre entera a propósito: el
 * bug que D18 previene es que alguien añada una mutación nueva y se olvide de
 * una sola invalidación — no falla ningún tipo, no falla el build, y la
 * oportunidad se queda con la cuota vieja en pantalla.
 */
const CASOS_DE_ESCRITURA: CasoDeEscritura[] = [
  {
    nombre: 'crear',
    idEscrito: ID_SIMULACION,
    handlers: [http.post(`${BASE_API}/simulaciones`, () => envelope(simulacion()))],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useCrearSimulacion(), { wrapper: envuelve })
      return result.current.mutateAsync({
        modo: 'leasing',
        precio_venta: '150000',
        cuota_inicial: '45000',
        plazo_meses: 48,
        tea: '14',
      })
    },
  },
  {
    nombre: 'actualizar',
    idEscrito: ID_SIMULACION,
    handlers: [
      http.patch(`${BASE_API}/simulaciones/${ID_SIMULACION}`, () => envelope(simulacion())),
    ],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useActualizarSimulacion(ID_SIMULACION), {
        wrapper: envuelve,
      })
      return result.current.mutateAsync({ plazo_meses: 60 })
    },
  },
  {
    nombre: 'eliminar',
    idEscrito: ID_SIMULACION,
    handlers: [
      http.delete(`${BASE_API}/simulaciones/${ID_SIMULACION}`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    ],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useEliminarSimulacion(), { wrapper: envuelve })
      // `DELETE` responde 204 sin body: el id de la oportunidad no puede salir
      // de la respuesta, así que lo aporta quien llama.
      return result.current.mutateAsync({
        id: ID_SIMULACION,
        idOportunidad: ID_OPORTUNIDAD,
      })
    },
  },
  {
    nombre: 'restaurar',
    idEscrito: ID_SIMULACION,
    handlers: [
      http.post(`${BASE_API}/simulaciones/${ID_SIMULACION}/restaurar`, () =>
        envelope(simulacion()),
      ),
    ],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useRestaurarSimulacion(ID_SIMULACION), {
        wrapper: envuelve,
      })
      return result.current.mutateAsync(9001)
    },
  },
  {
    nombre: 'bifurcar',
    idEscrito: 8,
    handlers: [
      http.post(`${BASE_API}/simulaciones/${ID_SIMULACION}/bifurcar`, () =>
        envelope(simulacion({ id: 8, id_simulacion_origen: ID_SIMULACION })),
      ),
    ],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useBifurcarSimulacion(ID_SIMULACION), {
        wrapper: envuelve,
      })
      return result.current.mutateAsync({ modo: 'credito_directo' })
    },
  },
  {
    nombre: 'marcarPrincipal',
    idEscrito: ID_SIMULACION,
    handlers: [
      http.patch(`${BASE_API}/simulaciones/${ID_SIMULACION}/principal`, () =>
        envelope(simulacion({ es_principal: true })),
      ),
    ],
    ejecutar: (envuelve) => {
      const { result } = renderHook(() => useMarcarPrincipal(), { wrapper: envuelve })
      return result.current.mutateAsync(ID_SIMULACION)
    },
  },
]

describe('sincronización 360 de las mutaciones de simulación (D18)', () => {
  it.each(CASOS_DE_ESCRITURA)(
    '$nombre invalida la oportunidad enlazada, no solo las keys de simulaciones',
    async ({ handlers, ejecutar }) => {
      // D18: cualquier escritura sobre una simulación cambia `cuota_quantum`
      // del ítem y con ella `cuota_quantum_total`, `cuota_total` y
      // `cuota_diaria_total` de la oportunidad. Si no se invalida, el Pipeline
      // y el detalle siguen mostrando la cuota vieja (CLAUDE.md regla 4).
      servidorMock.use(...handlers)
      const queryClient = crearQueryClientDePrueba()
      const invalidadas = espiarInvalidaciones(queryClient)

      await ejecutar(envoltorio(queryClient))

      await waitFor(() => expect(invalidadas.length).toBeGreaterThan(0))
      expect(invalidadas).toContainEqual(['oportunidades', 'detalle', ID_OPORTUNIDAD])
      expect(invalidadas).toContainEqual(['oportunidades'])
    },
  )

  it.each(CASOS_DE_ESCRITURA)(
    '$nombre invalida también las cuatro keys del propio módulo',
    async ({ handlers, ejecutar, idEscrito }) => {
      servidorMock.use(...handlers)
      const queryClient = crearQueryClientDePrueba()
      const invalidadas = espiarInvalidaciones(queryClient)

      await ejecutar(envoltorio(queryClient))

      await waitFor(() => expect(invalidadas.length).toBeGreaterThan(0))
      // El cronograma se recalcula server-side en cada lectura (K26): tras una
      // escritura, el cacheado ya no vale.
      expect(tocaPrefijo(invalidadas, qk.simulaciones)).toBe(true)
      expect(tocaPrefijo(invalidadas, qk.simulacionCronograma(idEscrito))).toBe(true)
      expect(tocaPrefijo(invalidadas, qk.simulacionHistorial(idEscrito))).toBe(true)
      expect(tocaPrefijo(invalidadas, qk.simulacion(idEscrito))).toBe(true)
    },
  )

  it('no construye una key de detalle con id null cuando la simulación no está enlazada', async () => {
    // Una simulación de la Calculadora guardada sin ítem tiene
    // `id_oportunidad: null` (§23). Invalidar `qk.oportunidad(null)` construiría
    // una key basura (`['oportunidades','detalle',null]`); se omite esa
    // llamada puntual, pero la LISTA se invalida igual porque enlazar/
    // desenlazar cambia lo que el Pipeline agrega.
    //
    // OJO — esto NO significa que ningún detalle de oportunidad quede
    // invalidado: `qk.oportunidades` (`['oportunidades']`) es PREFIJO de
    // `qk.oportunidad(id)` (`['oportunidades','detalle',id]`), e
    // `invalidateQueries` matchea por prefijo — así que invalidar la lista ya
    // alcanza a TODOS los detalles abiertos, incluido cualquiera que hubiera
    // (hallazgo C2, auditoría T6.1). Lo único que este test garantiza es que
    // no se llama explícitamente a `invalidar` con una key que contenga
    // `null` — no que los detalles queden "menos invalidados".
    servidorMock.use(
      http.post(`${BASE_API}/simulaciones`, () =>
        envelope(simulacion({ id_oportunidad: null, id_oportunidad_item: null })),
      ),
    )
    const queryClient = crearQueryClientDePrueba()
    const invalidadas = espiarInvalidaciones(queryClient)

    const { result } = renderHook(() => useCrearSimulacion(), {
      wrapper: envoltorio(queryClient),
    })
    await result.current.mutateAsync({
      modo: 'leasing',
      precio_venta: '150000',
      cuota_inicial: '45000',
      plazo_meses: 48,
      tea: '14',
    })

    await waitFor(() => expect(invalidadas.length).toBeGreaterThan(0))
    expect(invalidadas.some((key) => key.includes(null))).toBe(false)
    expect(invalidadas).toContainEqual(['oportunidades'])
  })
})

describe('queries de simulación', () => {
  it('lee el detalle de una simulación', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/simulaciones/${ID_SIMULACION}`, () => envelope(simulacion())),
    )
    const { result } = renderHook(() => useSimulacion(ID_SIMULACION), {
      wrapper: envoltorio(crearQueryClientDePrueba()),
    })
    await waitFor(() => expect(result.current.data?.cuota_final).toBe('2172.06'))
  })

  it('no dispara la query con un id inválido', () => {
    // Sin este guard, montar la vista antes de resolver el id del router
    // pediría `/simulaciones/NaN` y MSW cortaría la suite con "unhandled".
    const { result } = renderHook(() => useSimulacion(Number.NaN), {
      wrapper: envoltorio(crearQueryClientDePrueba()),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('el cronograma y el historial son queries propias, no derivados del detalle', async () => {
    // K26: cada uno tiene su endpoint y su key. Que el detalle esté en cache no
    // los da por sabidos.
    servidorMock.use(
      http.get(`${BASE_API}/simulaciones/${ID_SIMULACION}/cronograma`, () =>
        envelope({
          cuota_final: '2172.06',
          cuota_financiera: '2100.00',
          valor_venta: '150000.00',
          igv: '27000.00',
          principal: '105000.00',
          tasa_nominal_mensual: '1.0948912345',
          filas: [],
        }),
      ),
      http.get(`${BASE_API}/simulaciones/${ID_SIMULACION}/historial`, () =>
        envelope([
          { id_evento_log: 1, tipo_evento: 'creada', created_at: 'x', created_by: null, diff: [] },
        ]),
      ),
    )
    const queryClient = crearQueryClientDePrueba()
    const cronograma = renderHook(() => useCronograma(ID_SIMULACION), {
      wrapper: envoltorio(queryClient),
    })
    const historial = renderHook(() => useHistorialSimulacion(ID_SIMULACION), {
      wrapper: envoltorio(queryClient),
    })

    await waitFor(() =>
      expect(cronograma.result.current.data?.tasa_nominal_mensual).toBe('1.0948912345'),
    )
    await waitFor(() => expect(historial.result.current.data).toHaveLength(1))
  })
})

describe('useCalculadora (D17)', () => {
  it('es una mutación: no dispara ninguna petición al montarse', () => {
    // Es un POST efímero sin persistencia (reglas §9). Como query, TanStack lo
    // lanzaría solo al montar y volvería a lanzarlo al reenfocar la ventana,
    // dando a entender que hay un recurso guardado del otro lado.
    const { result } = renderHook(() => useCalculadora(), {
      wrapper: envoltorio(crearQueryClientDePrueba()),
    })
    expect(typeof result.current.mutateAsync).toBe('function')
    expect(result.current.isIdle).toBe(true)
  })

  it('no invalida ninguna query al calcular', async () => {
    // Cero persistencia ⇒ no hay nada que sincronizar. Invalidar acá provocaría
    // refetches en cadena por un cálculo que el backend no guardó.
    servidorMock.use(
      http.post(`${BASE_API}/calculadora`, () =>
        envelope({
          empresa: null,
          modelo: null,
          cronograma: {
            cuota_final: '2172.06',
            cuota_financiera: '2100.00',
            valor_venta: '150000.00',
            igv: '27000.00',
            principal: '105000.00',
            tasa_nominal_mensual: '1.0948912345',
            filas: [],
          },
        }),
      ),
    )
    const queryClient = crearQueryClientDePrueba()
    const invalidadas = espiarInvalidaciones(queryClient)

    const { result } = renderHook(() => useCalculadora(), {
      wrapper: envoltorio(queryClient),
    })
    const resultado = await result.current.mutateAsync({
      modo: 'leasing',
      precio_venta: '150000',
      cuota_inicial: '45000',
      plazo_meses: 48,
      tea: '14',
    })

    expect(resultado.cronograma.cuota_final).toBe('2172.06')
    expect(invalidadas).toEqual([])
  })
})

describe('useTipoCambio (D16)', () => {
  it('trata `data: null` con 200 como valor válido, no como error', async () => {
    // §22: el job diario todavía no pobló ninguna fila. No es un 404.
    servidorMock.use(http.get(`${BASE_API}/tipo-cambio`, () => envelope(null)))
    const { result } = renderHook(() => useTipoCambio(), {
      wrapper: envoltorio(crearQueryClientDePrueba()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('devuelve compra y venta cuando hay dato', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/tipo-cambio`, () =>
        envelope({ fecha: '2026-09-07', compra: 3.72, venta: 3.735 }),
      ),
    )
    const { result } = renderHook(() => useTipoCambio(), {
      wrapper: envoltorio(crearQueryClientDePrueba()),
    })
    await waitFor(() => expect(result.current.data?.venta).toBe(3.735))
  })

  it('no refetchea al enfocar la ventana y mantiene el dato fresco una hora', async () => {
    // Cambia una vez al día (job de las 09:30 Lima): refetchear al enfocar sería
    // tráfico por un dato que no se movió. Se comprueba sobre las opciones del
    // observador —no sobre las de la Query, que no las llevan— y encima con el
    // contador de peticiones, que es lo que el usuario paga.
    let peticiones = 0
    servidorMock.use(
      http.get(`${BASE_API}/tipo-cambio`, () => {
        peticiones += 1
        return envelope({ fecha: '2026-09-07', compra: 3.72, venta: 3.735 })
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const primera = renderHook(() => useTipoCambio(), { wrapper: envoltorio(queryClient) })
    await waitFor(() => expect(primera.result.current.isSuccess).toBe(true))

    const observador = queryClient.getQueryCache().find({ queryKey: qk.tipoCambio })
      ?.observers[0]
    expect(observador?.options.staleTime).toBe(60 * 60 * 1000)
    expect(observador?.options.refetchOnWindowFocus).toBe(false)

    // Montar el indicador otra vez (p. ej. al cambiar de página) no vuelve a
    // pedirlo: el dato sigue fresco.
    const segunda = renderHook(() => useTipoCambio(), { wrapper: envoltorio(queryClient) })
    await waitFor(() => expect(segunda.result.current.isSuccess).toBe(true))
    expect(peticiones).toBe(1)
  })
})
