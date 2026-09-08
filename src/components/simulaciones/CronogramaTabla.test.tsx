import { describe, expect, it } from 'vitest'
import { renderConProviders, screen, within } from '@/test/utilidades'
import { CronogramaTabla } from './CronogramaTabla'
import type { Cronograma, FilaCronograma } from '@/types/simulacion'

/**
 * Los seis casos de T1.1, uno por regla del encargo §5.4 / `reglas_simulaciones.md`
 * §3.3 y §3.4. Cada regla es contraintuitiva y su incumplimiento COMPILA y se ve
 * razonable — por eso cada una tiene su test:
 *
 *   1) leasing NO lleva columna de IGV (no es la misma tabla con celdas vacías);
 *   2) crédito directo SÍ la lleva;
 *   3) el mes 0 va EN BLANCO, nunca "0.00" ni un guion;
 *   4) 48 meses son 48 filas + el mes 0 = 49; NO existe la "cuota 49" del Excel;
 *   5) la última celda de saldo final va destacada: es el balloon;
 *   6) la tasa nominal mensual NO se redondea a 2 decimales (§3.1).
 */

/** El mes 0 es la fila de la cuota inicial: interés, IGV, cuota y cuota con IGV
 *  llegan `null` del backend (ver `FilaCronograma` en `src/types/simulacion.ts`). */
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

/**
 * Genera el mes 0 más `meses` filas (1..meses). Con `meses = 48` son 49 filas de
 * datos, que es exactamente lo que la tabla debe renderizar: ni una más.
 */
function filasDe(meses: number, igv: string | null = null): FilaCronograma[] {
  const filas: FilaCronograma[] = [MES_0]
  for (let mes = 1; mes <= meses; mes += 1) {
    filas.push({
      mes,
      saldo_inicial: '230000.00',
      amortizacion: '4270.83',
      interes: '2694.34',
      igv,
      saldo_final: mes === meses ? '25000.00' : '225729.17',
      cuota: '6965.17',
      cuota_con_igv: '8218.90',
    })
  }
  return filas
}

function cronograma(sobrescribe: Partial<Cronograma> = {}): Cronograma {
  return {
    cuota_final: '8218.90',
    cuota_financiera: '6965.17',
    valor_venta: '275000.00',
    igv: '49500.00',
    principal: '230000.00',
    // Sin redondear a propósito: así llega del backend (§3.1).
    tasa_nominal_mensual: '1.171491691350098',
    filas: filasDe(48),
    ...sobrescribe,
  }
}

/** Las filas de datos: todas las `row` menos la del encabezado. */
function filasDeDatos(): HTMLElement[] {
  return screen.getAllByRole('row').slice(1)
}

/** Acceso por índice que falla con un mensaje claro en vez de propagar `undefined`
 *  (el proyecto compila con `noUncheckedIndexedAccess`). */
function filaEn(indice: number): HTMLElement {
  const fila = filasDeDatos()[indice]
  if (fila === undefined) throw new Error(`No existe la fila de datos ${indice}`)
  return fila
}

function celdaEn(fila: HTMLElement, indice: number): HTMLElement {
  const celda = within(fila).getAllByRole('cell')[indice]
  if (celda === undefined) throw new Error(`La fila no tiene la celda ${indice}`)
  return celda
}

describe('CronogramaTabla', () => {
  it('en leasing NO muestra la columna de IGV', () => {
    // §5.4: "Leasing: # | Saldo Inicial | Amortización | Interés | Saldo Final |
    // Cuota | Cuota con IGV — sin columna de IGV". No es la misma tabla con celdas
    // vacías: la columna NO EXISTE en el DOM (D23: si existiera oculta, se colaría
    // en la exportación a Excel de T7.2).
    renderConProviders(<CronogramaTabla cronograma={cronograma()} modo="leasing" />)

    expect(screen.queryByRole('columnheader', { name: /^IGV$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Saldo Inicial$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Cuota con IGV$/i })).toBeInTheDocument()
    // Y cada fila de datos tiene exactamente 7 celdas, no 8.
    for (const fila of filasDeDatos()) {
      expect(within(fila).getAllByRole('cell')).toHaveLength(7)
    }
  })

  it('en crédito directo SÍ muestra la columna de IGV', () => {
    renderConProviders(
      <CronogramaTabla
        cronograma={cronograma({ filas: filasDe(48, '484.98') })}
        modo="credito_directo"
      />,
    )

    expect(screen.getByRole('columnheader', { name: /^IGV$/ })).toBeInTheDocument()
    // §5.4: en crédito directo la última columna se rotula distinto.
    expect(
      screen.getByRole('columnheader', { name: /^Cuota con IGV de Intereses$/i }),
    ).toBeInTheDocument()
    for (const fila of filasDeDatos()) {
      expect(within(fila).getAllByRole('cell')).toHaveLength(8)
    }
  })

  it('renderiza el mes 0 en blanco, no como 0.00 ni como guion', () => {
    // §5.4: "Se renderiza en blanco, no como 0.00". Tampoco "—" ni "-": un guion
    // suelto se lee como un monto vacío y está prohibido.
    renderConProviders(
      <CronogramaTabla
        cronograma={cronograma({ filas: filasDe(12) })}
        modo="credito_directo"
      />,
    )

    const filaMes0 = filaEn(0)
    expect(within(filaMes0).queryByText('0.00')).not.toBeInTheDocument()
    expect(within(filaMes0).queryByText(/^\$?\s*0[.,]00$/)).not.toBeInTheDocument()
    expect(within(filaMes0).queryByText('—')).not.toBeInTheDocument()
    expect(within(filaMes0).queryByText('-')).not.toBeInTheDocument()

    // Las celdas que no aplican quedan literalmente vacías: interés, IGV, cuota
    // y cuota con IGV (índices 3, 4, 6 y 7 en crédito directo).
    for (const indice of [3, 4, 6, 7]) {
      expect(celdaEn(filaMes0, indice).textContent).toBe('')
    }
  })

  it('no agrega una fila extra para el balloon', () => {
    // §5.4: "El LEASING.xlsx original tenía una 'cuota 49'; era un artificio de la
    // hoja. Si el cronograma tiene 48 meses, se muestran 48 filas más el mes 0."
    renderConProviders(<CronogramaTabla cronograma={cronograma()} modo="leasing" />)

    expect(screen.getAllByRole('row')).toHaveLength(49 + 1) // +1 del encabezado
    // La última fila es el mes 48, no una "cuota 49" inventada.
    expect(celdaEn(filaEn(48), 0)).toHaveTextContent('48')
    expect(screen.queryByText('49')).not.toBeInTheDocument()
  })

  it('destaca la última celda de saldo final: es el balloon', () => {
    // §5.4: "La última celda de saldo final va destacada: es el balloon
    // (valor_residual)". Se destaca con `secondary-container` de DESIGN.md.
    renderConProviders(<CronogramaTabla cronograma={cronograma()} modo="leasing" />)

    const filas = filasDeDatos()
    const destacado = celdaEn(filaEn(48), 4).querySelector('.bg-secondary-container')
    expect(destacado).not.toBeNull()
    expect(destacado).toHaveTextContent('25,000.00')

    // Y NINGUNA otra fila lleva el destacado: si lo llevaran todas, no destacaría nada.
    for (const fila of filas.slice(0, 48)) {
      expect(fila.querySelector('.bg-secondary-container')).toBeNull()
    }
  })

  it('no redondea la tasa nominal mensual a 2 decimales', () => {
    // §3.1: "La Tasa Nominal Mensual no se redondea nunca". Va con `formatoTasa`,
    // jamás con `formatoMonto` ni con `formatoPorcentaje` (2 decimales).
    renderConProviders(<CronogramaTabla cronograma={cronograma()} modo="leasing" />)

    const tasa = screen.getByRole('group', { name: /tasa nominal mensual/i })
    expect(tasa).toHaveTextContent('1.171492%')
    expect(tasa).not.toHaveTextContent('1.17%')
  })

  it('deja el cronograma con scroll interno, sin paginación (K32)', () => {
    // K32: 49 filas se leen de corrido. Paginarlas rompe la lectura del cronograma.
    const { container } = renderConProviders(
      <CronogramaTabla cronograma={cronograma()} modo="leasing" />,
    )

    const contenedor = container.querySelector('[data-testid="cronograma-scroll"]')
    expect(contenedor).not.toBeNull()
    expect(contenedor?.className).toContain('overflow-y-auto')
    // Sin paginador de antd ni ningún control de páginas.
    expect(container.querySelector('.ant-pagination')).toBeNull()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
