import { describe, expect, it } from 'vitest'
import { construirLibro } from './exportarCronograma'
import type { Cronograma, FilaCronograma } from '@/types/simulacion'

/**
 * Los mismos cuatro casos de T1.1 (`CronogramaTabla.test.tsx`), pero para la
 * exportación a Excel (encargo §5.6, D28): las columnas y el tratamiento de datos
 * son EXACTAMENTE los que el usuario vio en pantalla, porque ambos derivan de
 * `utils/columnasCronograma.ts` — no hay un tercer criterio para el Excel.
 *
 * `construirLibro` hace `import('exceljs')` dinámico (D28): la PRIMERA vez que
 * corre en el proceso de test, Vite tiene que transformar/pre-empaquetar esa
 * dependencia grande, lo que puede superar el timeout por defecto (5 s) en una
 * corrida en frío. Se sube el timeout de este archivo para no depender de que
 * ese primer `import()` sea instantáneo.
 */
const TIMEOUT_IMPORT_DINAMICO_MS = 20_000

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
    tasa_nominal_mensual: '1.171491691350098',
    filas: filasDe(48),
    ...sobrescribe,
  }
}

describe('construirLibro', () => {
  it('exporta las columnas del modo leasing, sin la de IGV', async () => {
    // Misma regla que la tabla (§5.4): no es la misma hoja con una columna vacía,
    // la columna directamente no existe.
    const wb = await construirLibro(cronograma(), 'leasing')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')
    const encabezados = hoja.getRow(1).values

    expect(encabezados).not.toContain('IGV')
    expect(encabezados).toContain('Saldo Inicial')
    expect(encabezados).toContain('Cuota con IGV')
  }, TIMEOUT_IMPORT_DINAMICO_MS)

  it('exporta la columna de IGV en crédito directo', async () => {
    const wb = await construirLibro(cronograma({ filas: filasDe(48, '484.98') }), 'credito_directo')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')
    const encabezados = hoja.getRow(1).values

    expect(encabezados).toContain('IGV')
    // §5.4: en crédito directo la última columna se rotula distinto.
    expect(encabezados).toContain('Cuota con IGV de Intereses')
    expect(encabezados).not.toContain('Cuota con IGV')
  }, TIMEOUT_IMPORT_DINAMICO_MS)

  it('no agrega una fila extra para el balloon', async () => {
    // Mismo artificio del Excel original que la tabla evita (§5.4): 48 meses son
    // 48 filas más el mes 0, nunca una "cuota 49" inventada.
    const wb = await construirLibro(cronograma(), 'leasing')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')

    // Fila 1 = encabezado, filas 2..50 = mes 0..48 → 49 filas de datos.
    expect(hoja.rowCount).toBe(50)
    const primeraColumna = hoja.getRow(hoja.rowCount).getCell(1).value
    expect(primeraColumna).toBe(48)
  }, TIMEOUT_IMPORT_DINAMICO_MS)

  it('el mes 0 exporta celdas vacías, no ceros', async () => {
    // Igual que la tabla (D23): las celdas que no aplican en el mes 0 van vacías,
    // no "0.00" ni un objeto con valor 0.
    const wb = await construirLibro(cronograma({ filas: filasDe(12) }), 'credito_directo')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')

    const filaMes0 = hoja.getRow(2) // fila 1 = encabezado, fila 2 = mes 0
    // Columnas de crédito directo: # | Saldo Inicial | Amortización | Interés |
    // IGV | Saldo Final | Cuota | Cuota con IGV de Intereses (índices 1-based).
    for (const indiceColumna of [4, 5, 7, 8]) {
      const valor = filaMes0.getCell(indiceColumna).value
      expect(valor === null || valor === undefined).toBe(true)
    }
    // Y las que sí aplican no quedan vacías.
    expect(filaMes0.getCell(2).value).not.toBeNull()
  }, TIMEOUT_IMPORT_DINAMICO_MS)

  it('formatea las columnas de monto con 2 decimales', async () => {
    // §5.6: "con el formato de las hojas actuales" — moneda con 2 decimales.
    const wb = await construirLibro(cronograma(), 'leasing')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')

    const celdaMonto = hoja.getRow(3).getCell(2) // mes 1, Saldo Inicial
    expect(celdaMonto.numFmt).toMatch(/0\.00/)
    expect(typeof celdaMonto.value).toBe('number')
  }, TIMEOUT_IMPORT_DINAMICO_MS)

  it('destaca en negrita el encabezado', async () => {
    const wb = await construirLibro(cronograma(), 'leasing')
    const hoja = wb.getWorksheet(1)
    if (!hoja) throw new Error('No se generó la hoja')
    expect(hoja.getRow(1).getCell(1).font?.bold).toBe(true)
  }, TIMEOUT_IMPORT_DINAMICO_MS)
})
