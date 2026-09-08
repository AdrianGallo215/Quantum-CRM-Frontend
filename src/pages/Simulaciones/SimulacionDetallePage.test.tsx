import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { SimulacionDetallePage } from './SimulacionDetallePage'
import type { Cronograma, FilaCronograma, Simulacion } from '@/types/simulacion'
import type { Oportunidad } from '@/types/oportunidad'

/**
 * Cableado post-T7.2: "Exportar Excel". Se mockea `descargarCronogramaExcel`
 * para no ejercitar la carga real de `exceljs` acá — esa lógica ya está
 * probada aparte en `utils/exportarCronograma.test.ts`.
 */
const { mockDescargarCronogramaExcel } = vi.hoisted(() => ({
  mockDescargarCronogramaExcel: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/utils/exportarCronograma', () => ({
  descargarCronogramaExcel: mockDescargarCronogramaExcel,
}))

/**
 * Cableado post-T7.1 (encargo §5.6): botón "Ver Propuesta" en el detalle de
 * simulación. No existía test de esta página (T5.1 no lo necesitaba); esta
 * tarea sí, así que se crea acá.
 *
 * El caso central es la simulación NO huérfana: `cantidad` y `empresa` de la
 * propuesta salen de la oportunidad, que esta página no tiene cargada — hace
 * falta pedirla, y solo cuando el modal está abierto (mismo patrón "open-gated"
 * que `ModalEnlazarAOportunidad` en `CalculadoraPage`).
 */

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

const MES_0: FilaCronograma = {
  mes: 0,
  saldo_inicial: '275000.00',
  amortizacion: '45000.00',
  interes: null,
  igv: null,
  saldo_final: '230000.00',
  cuota: null,
  cuota_con_igv: null,
}

function cronograma(): Cronograma {
  return {
    cuota_final: '8218.90',
    cuota_financiera: '6965.17',
    valor_venta: '275000.00',
    igv: '49500.00',
    principal: '230000.00',
    tasa_nominal_mensual: '1.171491691350098',
    filas: [
      MES_0,
      {
        mes: 1,
        saldo_inicial: '230000.00',
        amortizacion: '4270.83',
        interes: '2694.34',
        igv: null,
        saldo_final: '225729.17',
        cuota: '6965.17',
        cuota_con_igv: '8218.90',
      },
    ],
  }
}

function simulacion(sobrescribe: Partial<Simulacion> = {}): Simulacion {
  return {
    id: 12,
    nombre: 'Leasing 48m · KW-12',
    nombre_es_manual: false,
    modo: 'leasing',
    id_oportunidad_item: 7,
    id_oportunidad: 501,
    id_modelo: 2,
    modelo: { id: 2, codigo: 'KW-12' },
    id_simulacion_origen: null,
    precio_venta: '275000.00',
    descuento: '0.00',
    cuota_inicial: '45000.00',
    plazo_meses: 48,
    tea: '14.00',
    valor_residual: '25000.00',
    dias_trabajados: 22,
    comision_estructuracion: '1180.00',
    cuota_final: '8218.90',
    es_principal: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    eliminacion_prevista_el: null,
    ...sobrescribe,
  }
}

function oportunidad(): Oportunidad {
  return {
    id: 501,
    id_empresa: 9,
    empresa: { id: 9, razon_social: 'Transportes del Sur S.A.C.' },
    id_vendedor: 3,
    vendedor: { id: 3, nombres: 'Juana', apellidos: 'Pérez' },
    id_financiadora: null,
    financiadora: null,
    estado: 'evaluacion_calidda',
    items: [
      {
        id: 7,
        id_modelo: 2,
        modelo: { id: 2, codigo: 'KW-12', precio_base: '275000.00' },
        cantidad: 8,
        precio_venta: '275000.00',
        descuento: '0.00',
        cuota_financiadora: '937.50',
        cuota_quantum: null,
        cuota_total: null,
        monto_item: '2200000.00',
        advertencias: [],
      },
    ],
    monto_total: '2200000.00',
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

function handlersBase(sim: Simulacion) {
  return [
    http.get(`${BASE_API}/simulaciones/${sim.id}`, () => envelope(sim)),
    http.get(`${BASE_API}/simulaciones/${sim.id}/cronograma`, () => envelope(cronograma())),
  ]
}

function montar() {
  return renderConProviders(
    <Routes>
      <Route path="/simulaciones/:id" element={<SimulacionDetallePage />} />
    </Routes>,
    { rutaInicial: '/simulaciones/12' },
  )
}

describe('SimulacionDetallePage — Ver Propuesta', () => {
  it('abre la propuesta con cantidad y empresa resueltas desde la oportunidad', async () => {
    let oportunidadPedida = false
    servidorMock.use(
      ...handlersBase(simulacion()),
      http.get(`${BASE_API}/oportunidades/501`, () => {
        oportunidadPedida = true
        return envelope(oportunidad())
      }),
    )
    const user = userEvent.setup()
    montar()

    // Antes de abrir el modal, la oportunidad NO se pide (gating "solo con el
    // modal abierto", mismo patrón que ModalEnlazarAOportunidad).
    await screen.findByRole('button', { name: 'Ver Propuesta' })
    expect(oportunidadPedida).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Ver Propuesta' }))

    expect(await screen.findByText('Cronograma de pagos')).toBeInTheDocument()
    expect(await screen.findByText('Transportes del Sur S.A.C.')).toBeInTheDocument()
    const cantidad = await screen.findByRole('group', { name: /cantidad de unidades/i })
    expect(cantidad).toHaveTextContent('8')
    expect(oportunidadPedida).toBe(true)
  }, 15000)

  it('en una simulación huérfana omite cantidad y empresa sin pedir ninguna oportunidad', async () => {
    let oportunidadPedida = false
    servidorMock.use(
      ...handlersBase(
        simulacion({ id_oportunidad_item: null, id_oportunidad: null, es_principal: false }),
      ),
      http.get(`${BASE_API}/oportunidades/501`, () => {
        oportunidadPedida = true
        return envelope(oportunidad())
      }),
    )
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Ver Propuesta' }))

    expect(await screen.findByText(/cotización por unidad/i)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /empresa cliente/i })).not.toBeInTheDocument()
    expect(oportunidadPedida).toBe(false)
  }, 15000)
})

describe('SimulacionDetallePage — Exportar Excel', () => {
  it('el botón está deshabilitado hasta que el cronograma carga, y luego exporta', async () => {
    // Cableado post-T7.2: mismo guard que "Ver Propuesta"
    // (`disabled={!cronograma.data}`) — sin cronograma no hay nada que exportar.
    servidorMock.use(...handlersBase(simulacion()))
    montar()

    const boton = await screen.findByRole('button', { name: 'Exportar Excel' })
    await waitFor(() => expect(boton).toBeEnabled())

    await userEvent.setup().click(boton)

    await waitFor(() => expect(mockDescargarCronogramaExcel).toHaveBeenCalledTimes(1))
    const [cronogramaRecibido, modoRecibido, nombreArchivo] =
      mockDescargarCronogramaExcel.mock.calls[0] as [unknown, string, string]
    expect(cronogramaRecibido).toEqual(cronograma())
    expect(modoRecibido).toBe('leasing')
    expect(nombreArchivo).toBe('cronograma-simulacion-12.xlsx')
  }, 15000)
})
