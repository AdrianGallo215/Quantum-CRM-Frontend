import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderConProviders, screen, userEvent, within } from '@/test/utilidades'
import { PropuestaFinanciera } from './PropuestaFinanciera'
import { propuestaDesdeCalculadora, propuestaDesdeSimulacion } from '@/utils/propuesta'
import type { DatosPropuesta } from '@/utils/propuesta'
import type { Cronograma, FilaCronograma, Simulacion } from '@/types/simulacion'
import type { CalculadoraInput, CalculadoraResultado } from '@/types/calculadora'

/**
 * T7.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.6.
 *
 * El caso central es `cantidad: null` (K29/D26): sin ítem NO se inventa un `1` ni
 * se muestra un total por N unidades. Es la decisión que el encargo §8.2 delega
 * explícitamente al diseño, y la que un refactor bienintencionado rompería.
 */

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
    id_oportunidad: 3,
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

function resultadoCalculadora(): CalculadoraResultado {
  return {
    empresa: { id: 5, razon_social: 'Transportes del Sur S.A.C.' },
    modelo: { id: 2, codigo: 'KW-12' },
    cronograma: cronograma(),
  }
}

function inputCalculadora(): CalculadoraInput {
  return {
    modo: 'credito_directo',
    precio_venta: '275000.00',
    cuota_inicial: '45000.00',
    plazo_meses: 36,
    tea: '14.00',
    valor_residual: '25000.00',
  }
}

/** Los datos "completos": con ítem, con empresa y con modelo. */
function datosCompletos(): DatosPropuesta {
  return {
    ...propuestaDesdeSimulacion(simulacion(), cronograma(), 8),
    empresa: 'Transportes del Sur S.A.C.',
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PropuestaFinanciera', () => {
  it('es el mismo componente para una simulación y para la Calculadora', () => {
    // §5.6: "Es la MISMA <PropuestaFinanciera/> para el módulo Simulaciones y para
    // la Calculadora. Un solo componente." Los dos orígenes entran por adaptadores
    // (D26) y salen por el mismo render, sin que el efímero finja ser una fila.
    const desdeSimulacion = renderConProviders(
      <PropuestaFinanciera datos={propuestaDesdeSimulacion(simulacion(), cronograma(), 8)} />,
    )
    expect(
      within(desdeSimulacion.container).getByText('Leasing 48m · KW-12'),
    ).toBeInTheDocument()
    desdeSimulacion.unmount()

    const desdeCalculadora = renderConProviders(
      <PropuestaFinanciera
        datos={propuestaDesdeCalculadora(resultadoCalculadora(), inputCalculadora())}
      />,
    )
    expect(within(desdeCalculadora.container).getByText('Cotización financiera')).toBeInTheDocument()
    expect(
      within(desdeCalculadora.container).getByText('Transportes del Sur S.A.C.'),
    ).toBeInTheDocument()
  })

  it('omite la cantidad y el total cuando no hay ítem', () => {
    // D26 (resolución de §8.2): sin cantidad no se inventa 1 — se muestran solo
    // las cifras por unidad, con la leyenda "Cotización por unidad".
    renderConProviders(<PropuestaFinanciera datos={{ ...datosCompletos(), cantidad: null }} />)

    expect(screen.getByText(/cotización por unidad/i)).toBeInTheDocument()
    expect(screen.queryByText(/total.*unidades/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cantidad de unidades/i)).not.toBeInTheDocument()
  })

  it('muestra la cantidad de unidades y el modelo cuando los hay', () => {
    // §5.6 / reglas §11: la propuesta muestra la cantidad de unidades del ítem y
    // el modelo, que NO participan del cálculo — solo se muestran.
    renderConProviders(<PropuestaFinanciera datos={datosCompletos()} />)

    const cantidad = screen.getByRole('group', { name: /cantidad de unidades/i })
    expect(cantidad).toHaveTextContent('8')
    expect(cantidad).toHaveTextContent('KW-12')

    // El total por N unidades es una derivación de PRESENTACIÓN: cuota final × 8.
    const total = screen.getByRole('group', { name: /total por 8 unidades/i })
    expect(total).toHaveTextContent('65,751.20')

    // Y la leyenda de "por unidad" NO aparece cuando sí hay cantidad.
    expect(screen.queryByText(/cotización por unidad/i)).not.toBeInTheDocument()
  })

  it('omite el bloque de empresa cuando no hay empresa', () => {
    renderConProviders(<PropuestaFinanciera datos={{ ...datosCompletos(), empresa: null }} />)

    expect(screen.queryByRole('group', { name: /empresa cliente/i })).not.toBeInTheDocument()
  })

  it('muestra el encabezado, las métricas y el pie del documento', () => {
    renderConProviders(<PropuestaFinanciera datos={datosCompletos()} />)

    expect(screen.getByRole('heading', { name: /quantum investment/i })).toBeInTheDocument()

    // Las métricas se consultan DENTRO de su sección: `CronogramaTabla` publica sus
    // propios agregados con rótulos homónimos ("Cuota final", "Valor de venta") y
    // una búsqueda global encontraría los dos.
    const resumen = within(screen.getByRole('region', { name: /resumen de la propuesta/i }))
    expect(resumen.getByRole('group', { name: /^cuota final$/i })).toHaveTextContent('8,218.90')
    expect(resumen.getByRole('group', { name: /^tea$/i })).toHaveTextContent('14.00%')
    expect(resumen.getByRole('group', { name: /^valor de venta$/i })).toHaveTextContent('275,000.00')
    expect(resumen.getByRole('group', { name: /^plazo$/i })).toHaveTextContent('48 meses')
    expect(resumen.getByRole('group', { name: /^modalidad$/i })).toHaveTextContent('Leasing')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/validez/i)
  })

  it('incluye el cronograma reutilizando CronogramaTabla, con las columnas del modo', () => {
    // No se reimplementa la tabla (T1.1, D23): leasing NO lleva columna de IGV.
    renderConProviders(<PropuestaFinanciera datos={datosCompletos()} />)

    expect(screen.getByRole('columnheader', { name: /^Saldo Inicial$/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^IGV$/ })).not.toBeInTheDocument()
  })

  it('descarga el PDF con window.print y el botón no sale impreso', async () => {
    // D27: PDF por impresión nativa, 0 KB de dependencias. El botón lleva
    // `no-imprimir` para no aparecer en la hoja (§5.6: no se almacena nada).
    const imprimir = vi.fn()
    vi.stubGlobal('print', imprimir)

    renderConProviders(<PropuestaFinanciera datos={datosCompletos()} />)

    const boton = screen.getByRole('button', { name: /descargar pdf/i })
    expect(boton.closest('.no-imprimir')).not.toBeNull()

    await userEvent.click(boton)
    expect(imprimir).toHaveBeenCalledTimes(1)
  })

  it('renderiza los textos del servidor como texto plano, nunca como HTML', () => {
    // `CLAUDE.md` regla 9: nunca `dangerouslySetInnerHTML` con datos del servidor.
    // La razón social y el nombre llegan del backend: si se inyectaran como HTML,
    // este `<img onerror>` se convertiría en un nodo real.
    const veneno = '<img src=x onerror="alert(1)">'
    const { container } = renderConProviders(
      <PropuestaFinanciera
        datos={{ ...datosCompletos(), empresa: veneno, titulo: veneno, modelo: veneno }}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getAllByText(veneno).length).toBeGreaterThan(0)
  })
})
