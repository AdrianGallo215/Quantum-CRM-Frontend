import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import type { Simulacion } from '@/types/simulacion'
import { SimulacionesPage } from './SimulacionesPage'

/**
 * T5.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.1.
 *
 * Reglas fijadas acá:
 *  - agrupación por `id_oportunidad` (§8.1/K30) con sección "Sin vincular"
 *    aparte para las huérfanas;
 *  - la huérfana avisa en la tarjeta, sin prometer un aviso futuro (§8.3);
 *  - marcar principal no se ofrece en una huérfana (§7.5/K33).
 */

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

function simulacion(overrides: Partial<Simulacion> = {}): Simulacion {
  return {
    id: 900,
    nombre: 'Transportes Lima SAC · KW-12 · Leasing · #1',
    nombre_es_manual: false,
    modo: 'leasing',
    id_oportunidad_item: 77,
    id_oportunidad: 501,
    id_modelo: 3,
    modelo: { id: 3, codigo: 'KW-12' },
    id_simulacion_origen: null,
    precio_venta: '150000.00',
    descuento: '5.00',
    cuota_inicial: '45000.00',
    plazo_meses: 48,
    tea: '14.00',
    valor_residual: '15000.00',
    dias_trabajados: 22,
    comision_estructuracion: '0.00',
    cuota_final: '2172.06',
    es_principal: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    eliminacion_prevista_el: null,
    ...overrides,
  }
}

function handlerListado(simulaciones: Simulacion[]) {
  return http.get(`${BASE_API}/simulaciones`, () => envelope(simulaciones))
}

function handlerModelos() {
  return http.get(`${BASE_API}/modelos`, () => envelope([{ id: 3, codigo: 'KW-12' }]))
}

describe('SimulacionesPage', () => {
  it('agrupa las simulaciones por oportunidad', async () => {
    servidorMock.use(
      handlerListado([
        simulacion({ id: 1, id_oportunidad: 501 }),
        simulacion({ id: 2, id_oportunidad: 501 }),
        simulacion({ id: 3, id_oportunidad: 777, nombre: 'Otra oportunidad' }),
      ]),
      handlerModelos(),
    )
    renderConProviders(<SimulacionesPage />)

    expect(await screen.findByText('Oportunidad #501')).toBeInTheDocument()
    expect(screen.getByText('Oportunidad #777')).toBeInTheDocument()
  })

  it('muestra las huérfanas en una sección "Sin vincular" aparte', async () => {
    servidorMock.use(
      handlerListado([
        simulacion({ id: 1, id_oportunidad: 501 }),
        simulacion({
          id: 2,
          id_oportunidad: null,
          id_oportunidad_item: null,
          es_principal: false,
          eliminacion_prevista_el: '2026-10-01T12:00:00Z',
          nombre: 'Sin enlazar · KW-12 · Leasing · #1',
        }),
      ]),
      handlerModelos(),
    )
    renderConProviders(<SimulacionesPage />)

    await screen.findByText('Oportunidad #501')
    expect(screen.getByText('Sin vincular')).toBeInTheDocument()
    expect(screen.getByText('Sin enlazar · KW-12 · Leasing · #1')).toBeInTheDocument()
    expect(screen.getByText(/se eliminará el/i)).toBeInTheDocument()
  })

  it('no ofrece marcar como principal en una tarjeta huérfana dentro del listado', async () => {
    servidorMock.use(
      handlerListado([
        simulacion({
          id: 2,
          id_oportunidad: null,
          id_oportunidad_item: null,
          es_principal: false,
        }),
      ]),
      handlerModelos(),
    )
    renderConProviders(<SimulacionesPage />)

    await screen.findByText('Sin vincular')
    expect(screen.queryByRole('button', { name: /principal/i })).not.toBeInTheDocument()
  })

  it('no promete que se va a avisar antes de eliminar una huérfana', async () => {
    servidorMock.use(
      handlerListado([
        simulacion({
          id: 2,
          id_oportunidad: null,
          id_oportunidad_item: null,
          eliminacion_prevista_el: '2026-10-01T12:00:00Z',
        }),
      ]),
      handlerModelos(),
    )
    renderConProviders(<SimulacionesPage />)

    await screen.findByText(/se eliminará el/i)
    expect(screen.queryByText(/te avisaremos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/siempre.*avis/i)).not.toBeInTheDocument()
  })

  it('muestra vacío cuando no hay simulaciones con los filtros aplicados', async () => {
    servidorMock.use(handlerListado([]), handlerModelos())
    renderConProviders(<SimulacionesPage />)

    expect(await screen.findByText(/no hay simulaciones/i)).toBeInTheDocument()
  })

  it('marcar como principal ya siendo principal no muestra error (no-op exitoso)', async () => {
    // K33: no-op exitoso. El PATCH responde 200 igual con la misma simulación.
    servidorMock.use(
      handlerListado([simulacion({ id: 1, id_oportunidad: 501, es_principal: true })]),
      handlerModelos(),
      http.patch(`${BASE_API}/simulaciones/1/principal`, () =>
        envelope(simulacion({ id: 1, id_oportunidad: 501, es_principal: true })),
      ),
    )
    renderConProviders(<SimulacionesPage />)

    const boton = await screen.findByRole('button', { name: /marcar como principal/i })
    boton.click()

    await waitFor(() => expect(screen.queryByText(/no se pudo marcar/i)).not.toBeInTheDocument())
  })
})
