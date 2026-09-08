import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { useAuthStore } from '@/store/authStore'
import type { Empleado } from '@/types/empleado'
import type { Rol } from '@/types/enums'
import type { Oportunidad, OportunidadItem } from '@/types/oportunidad'
import type { Simulacion } from '@/types/simulacion'
import { SimuladorCard } from './SimuladorCard'

/**
 * T4.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.2.
 *
 * Reglas fijadas acá:
 *  - **con un solo ítem el usuario NUNCA ve un selector** (encargo §5.2 /
 *    `reglas_simulaciones.md` §1.1, D24) — es la regla que el encargo marca como
 *    "explícita y no se negocia", y la que más se pierde en una refactorización;
 *  - el permiso del `vendedor` es POR RECURSO (§2.15): solo en su oportunidad;
 *  - `modo` es INMUTABLE al editar una simulación existente (§7.1);
 *  - el `409 MODO_INMUTABLE` ofrece la vía autorizada: bifurcar (K34, D30).
 */

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

const EMPLEADO_ANALISTA: Empleado = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Lista',
  email: 'ana@quantum.pe',
  rol: 'analista',
  area: 'Comercial',
  puesto: 'Analista',
}

function empleadoCon(rol: Rol, id: number): Empleado {
  return { ...EMPLEADO_ANALISTA, id, rol }
}

function item(overrides: Partial<OportunidadItem> = {}): OportunidadItem {
  return {
    id: 77,
    id_modelo: 3,
    modelo: { id: 3, codigo: 'KW-12', precio_base: '150000.00' },
    cantidad: 2,
    precio_venta: '150000.00',
    descuento: '5.00',
    cuota_financiadora: '937.50',
    cuota_quantum: null,
    cuota_total: null,
    monto_item: '285000.00',
    advertencias: [],
    ...overrides,
  }
}

function oportunidad(items: OportunidadItem[]): Oportunidad {
  return {
    id: 501,
    id_empresa: 9,
    empresa: { id: 9, razon_social: 'Transportes Andinos SAC' },
    id_vendedor: 3,
    vendedor: { id: 3, nombres: 'Juana', apellidos: 'Pérez' },
    id_financiadora: null,
    financiadora: null,
    estado: 'evaluacion_calidda',
    items,
    monto_total: '285000.00',
    cuota_quantum_total: null,
    cuota_total: null,
    cuota_diaria_total: null,
    garantia: false,
    finc_paralelo: false,
    ficha_venta: null,
    drive_folder_id: null,
    notas: null,
    motivo_cierre: null,
    fecha_cierre_estimado: null,
    tareas_pendientes_count: 0,
    eventos_pendientes_count: 0,
    created_at: '2026-08-01T00:00:00Z',
  }
}

const CON_UN_ITEM = oportunidad([item()])
const CON_TRES_ITEMS = oportunidad([
  item({ id: 77 }),
  item({ id: 78, modelo: { id: 4, codigo: 'KW-15', precio_base: '180000.00' } }),
  item({ id: 79, modelo: { id: 5, codigo: 'KW-18', precio_base: '210000.00' } }),
])

function simulacion(overrides: Partial<Simulacion> = {}): Simulacion {
  return {
    id: 900,
    nombre: 'Leasing KW-12 48m',
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

/** El listado por ítem es lo que decide crear vs. editar. Sin handler, MSW corta. */
function handlerListado(simulaciones: Simulacion[] = []) {
  return http.get(`${BASE_API}/simulaciones`, () => envelope(simulaciones))
}

describe('SimuladorCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ empleado: EMPLEADO_ANALISTA, cargando: false })
  })

  it('NO muestra selector de ítem cuando la oportunidad tiene un solo ítem', async () => {
    // Encargo §5.2 / reglas §1.1 (D24): "Con un solo ítem se enlaza directo y el
    // usuario NUNCA ve un selector. Esto es explícito y no se negocia."
    servidorMock.use(handlerListado())
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    await screen.findByText('Simulador Financiero')
    expect(screen.queryByLabelText(/ítem|modelo a simular/i)).not.toBeInTheDocument()
  }, 15000)

  it('muestra selector cuando hay más de un ítem', async () => {
    servidorMock.use(handlerListado())
    renderConProviders(<SimuladorCard oportunidad={CON_TRES_ITEMS} />)

    expect(await screen.findByLabelText(/ítem|modelo a simular/i)).toBeInTheDocument()
  }, 15000)

  it('no se muestra al vendedor que no es el asignado', () => {
    // §2.15: para el vendedor el permiso es POR RECURSO — solo en su oportunidad.
    servidorMock.use(handlerListado())
    useAuthStore.setState({ empleado: empleadoCon('vendedor', 99), cargando: false })
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    expect(screen.queryByText('Simulador Financiero')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar Simulación' })).not.toBeInTheDocument()
  })

  it('sí se muestra al vendedor asignado', async () => {
    servidorMock.use(handlerListado())
    useAuthStore.setState({ empleado: empleadoCon('vendedor', 3), cargando: false })
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    expect(await screen.findByText('Simulador Financiero')).toBeInTheDocument()
  }, 15000)

  it('deshabilita el campo modo al editar una simulación existente', async () => {
    // §7.1: `modo` es INMUTABLE tras la creación.
    servidorMock.use(handlerListado([simulacion()]))
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    expect(await screen.findByLabelText(/^modo$/i)).toBeDisabled()
  }, 15000)

  it('deja editable el campo modo cuando todavía no hay simulación', async () => {
    servidorMock.use(handlerListado())
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    expect(await screen.findByLabelText(/^modo$/i)).not.toBeDisabled()
  }, 15000)

  it('prellena precio_venta y descuento del ítem al crear', async () => {
    servidorMock.use(handlerListado())
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    expect(await screen.findByLabelText(/precio de venta/i)).toHaveValue('150000.00')
    expect(screen.getByLabelText(/descuento/i)).toHaveValue('5.00')
  }, 15000)

  it('nunca envía cuota_final en el body al crear', async () => {
    // §7.2: `cuota_final` es SOLO LECTURA. La cuota buena es la de la respuesta.
    let body: Record<string, unknown> = {}
    servidorMock.use(
      handlerListado(),
      http.post(`${BASE_API}/simulaciones`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return envelope(simulacion())
      }),
    )
    const user = userEvent.setup()
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    await user.click(await screen.findByRole('button', { name: 'Guardar Simulación' }))

    await waitFor(() => expect(body.id_oportunidad_item).toBe(77))
    expect(body).not.toHaveProperty('cuota_final')
  }, 15000)

  it('ofrece "Guardar como Nueva Simulación" ante un 409 MODO_INMUTABLE', async () => {
    // K34/D30: no debería ocurrir con el campo deshabilitado, pero si el backend
    // lo devuelve, la salida ofrecida es la ÚNICA vía autorizada: bifurcar.
    const bifurcar = vi.fn()
    servidorMock.use(
      handlerListado([simulacion()]),
      http.patch(`${BASE_API}/simulaciones/900`, () =>
        HttpResponse.json(
          {
            data: null,
            meta: null,
            error: { code: 'MODO_INMUTABLE', message: 'El modo no se puede cambiar' },
          },
          { status: 409 },
        ),
      ),
      http.post(`${BASE_API}/simulaciones/900/bifurcar`, async ({ request }) => {
        bifurcar((await request.json()) as Record<string, unknown>)
        return envelope(simulacion({ id: 901, id_simulacion_origen: 900 }))
      }),
    )
    const user = userEvent.setup()
    renderConProviders(<SimuladorCard oportunidad={CON_UN_ITEM} />)

    await user.click(await screen.findByRole('button', { name: 'Guardar Simulación' }))

    const boton = await screen.findByRole('button', { name: /Guardar como Nueva Simulación/i })
    await user.click(boton)

    await waitFor(() => expect(bifurcar).toHaveBeenCalled())
  }, 15000)
})
