import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor, within } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import type { CalculadoraResultado } from '@/types/calculadora'
import type { Oportunidad } from '@/types/oportunidad'
import { CalculadoraPage } from './CalculadoraPage'

/**
 * T3.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.3.
 *
 * Reglas fijadas acá:
 *  - la Calculadora NUNCA persiste al calcular (reglas §9): solo
 *    `POST /calculadora`, nunca `POST /simulaciones`;
 *  - el resultado no trae "cuota total" — el tipo `CalculadoraResultado` no
 *    tiene ese campo, así que ningún texto de esa naturaleza puede aparecer
 *    (§5.3/§6.2);
 *  - "Enlazar a Oportunidad" se habilita con el resultado en pantalla, y es
 *    literalmente `POST /simulaciones` con `id_oportunidad_item` (§24);
 *  - "Ver Propuesta" queda deshabilitado hasta T7.1.
 */

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

function resultadoCalculadora(overrides: Partial<CalculadoraResultado> = {}): CalculadoraResultado {
  return {
    empresa: null,
    modelo: null,
    cronograma: {
      cuota_final: '2172.06',
      cuota_financiera: '1950.00',
      valor_venta: '150000.00',
      igv: '22881.36',
      principal: '105000.00',
      tasa_nominal_mensual: '1.09912345',
      filas: [
        {
          mes: 0,
          saldo_inicial: '105000.00',
          amortizacion: '45000.00',
          interes: null,
          igv: null,
          saldo_final: '105000.00',
          cuota: null,
          cuota_con_igv: null,
        },
        {
          mes: 1,
          saldo_inicial: '105000.00',
          amortizacion: '1800.00',
          interes: '150.00',
          igv: null,
          saldo_final: '103200.00',
          cuota: '1950.00',
          cuota_con_igv: '1950.00',
        },
      ],
    },
    ...overrides,
  }
}

function oportunidadUnItem(): Oportunidad {
  return {
    id: 501,
    id_empresa: 9,
    empresa: { id: 9, razon_social: 'Transportes Andinos SAC' },
    id_vendedor: 3,
    vendedor: { id: 3, nombres: 'Juana', apellidos: 'Pérez' },
    id_financiadora: null,
    financiadora: null,
    estado: 'evaluacion_calidda',
    items: [
      {
        id: 77,
        id_modelo: 3,
        modelo: { id: 3, codigo: 'KW-12', precio_base: '150000.00' },
        cantidad: 1,
        precio_venta: '150000.00',
        descuento: '0.00',
        cuota_financiadora: '937.50',
        cuota_quantum: null,
        cuota_total: null,
        monto_item: '150000.00',
        advertencias: [],
      },
    ],
    monto_total: '150000.00',
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

/** Handlers que TODA la página necesita para montar: los selectores
 *  opcionales de Empresa y Modelo disparan sus queries al montar. */
function handlersBase() {
  return [
    http.get(`${BASE_API}/empresas`, () => envelope([])),
    http.get(`${BASE_API}/modelos`, () => envelope([])),
  ]
}

async function calcular(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/precio de venta/i), '150000')
  await user.click(screen.getByRole('button', { name: 'Calcular' }))
}

describe('CalculadoraPage', () => {
  it('NO muestra la cuota total', async () => {
    // §5.3/§6.2: "Sin ítem no hay cuota_financiadora que sumar. Solo cuota
    // Quantum." El tipo CalculadoraResultado ni siquiera trae ese campo.
    servidorMock.use(
      ...handlersBase(),
      http.post(`${BASE_API}/calculadora`, () => envelope(resultadoCalculadora())),
    )
    const user = userEvent.setup()
    renderConProviders(<CalculadoraPage />)

    await calcular(user)

    await screen.findByText('Enlazar a Oportunidad')
    expect(screen.queryByText(/cuota mensual total/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cuota total/i)).not.toBeInTheDocument()
  }, 15000)

  it('calcula sin persistir nada', async () => {
    // reglas §9: cero persistencia. Al calcular solo debe salir POST
    // /calculadora — nunca POST /simulaciones.
    const simulacionesLlamado = vi.fn()
    servidorMock.use(
      ...handlersBase(),
      http.post(`${BASE_API}/calculadora`, () => envelope(resultadoCalculadora())),
      http.post(`${BASE_API}/simulaciones`, () => {
        simulacionesLlamado()
        return envelope({})
      }),
    )
    const user = userEvent.setup()
    renderConProviders(<CalculadoraPage />)

    await calcular(user)
    await screen.findByText('Enlazar a Oportunidad')

    expect(simulacionesLlamado).not.toHaveBeenCalled()
  }, 15000)

  it('ofrece "Enlazar a Oportunidad" con el resultado en pantalla', async () => {
    servidorMock.use(
      ...handlersBase(),
      http.post(`${BASE_API}/calculadora`, () => envelope(resultadoCalculadora())),
    )
    const user = userEvent.setup()
    renderConProviders(<CalculadoraPage />)

    // Antes de calcular no hay resultado, así que el botón no aparece.
    expect(screen.queryByRole('button', { name: 'Enlazar a Oportunidad' })).not.toBeInTheDocument()

    await calcular(user)

    const boton = await screen.findByRole('button', { name: 'Enlazar a Oportunidad' })
    expect(boton).toBeEnabled()
  }, 15000)

  it('el botón "Ver Propuesta" está deshabilitado', async () => {
    // T7.1 todavía no existe (<PropuestaFinanciera/>). Cableado con TODO en el
    // componente, deshabilitado hasta que exista.
    servidorMock.use(
      ...handlersBase(),
      http.post(`${BASE_API}/calculadora`, () => envelope(resultadoCalculadora())),
    )
    const user = userEvent.setup()
    renderConProviders(<CalculadoraPage />)

    await calcular(user)

    expect(await screen.findByRole('button', { name: 'Ver Propuesta' })).toBeDisabled()
  }, 15000)

  it('enlaza a la oportunidad con id_oportunidad_item cuando tiene un solo ítem (D24)', async () => {
    // Encargo §5.2/reglas §1.1, D24: con un solo ítem se enlaza directo y el
    // usuario nunca ve un selector de ítem.
    let bodyRecibido: unknown = null
    servidorMock.use(
      ...handlersBase(),
      http.post(`${BASE_API}/calculadora`, () => envelope(resultadoCalculadora())),
      http.get(`${BASE_API}/oportunidades`, () => envelope([oportunidadUnItem()])),
      http.post(`${BASE_API}/simulaciones`, async ({ request }) => {
        bodyRecibido = await request.json()
        return envelope({ id: 1, id_oportunidad: 501 })
      }),
    )
    const user = userEvent.setup()
    renderConProviders(<CalculadoraPage />)

    await calcular(user)
    await user.click(await screen.findByRole('button', { name: 'Enlazar a Oportunidad' }))

    const dialogo = await screen.findByRole('dialog')
    // Con un solo ítem, el selector de ítem NUNCA se muestra (D24).
    expect(within(dialogo).queryByLabelText(/ítem a enlazar/i)).not.toBeInTheDocument()

    await user.click(within(dialogo).getByRole('combobox', { name: 'Oportunidad' }))
    await user.click(await screen.findByText(/Transportes Andinos SAC/i))

    await user.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(bodyRecibido).not.toBeNull())
    expect((bodyRecibido as { id_oportunidad_item: number }).id_oportunidad_item).toBe(77)
  }, 15000)
})
