import {
  columnasCronogramaPorModo,
  valorCrudoCronograma,
  type DefinicionColumnaCronograma,
} from './columnasCronograma'
import type { ModoSimulacion } from '@/types/enums'
import type { Cronograma } from '@/types/simulacion'

/**
 * Formato de moneda para las celdas de monto de la hoja: 2 decimales, separador
 * de miles. "Con el formato de las hojas actuales" (§5.6) — sin símbolo de
 * moneda propio porque el LEASING.xlsx original tampoco lo llevaba en la hoja de
 * cronograma, solo en los agregados.
 */
const FORMATO_MONTO_EXCEL = '#,##0.00'

const ANCHO_COLUMNA_MES = 6
const ANCHO_COLUMNA_MONTO = 16

/**
 * Convierte el valor crudo de una celda del cronograma a lo que Excel necesita:
 * un `number` para que `numFmt` aplique de verdad (una celda de texto con
 * `numFmt` no se formatea), o `null` para las celdas del mes 0 que van vacías
 * (§5.4 — igual que `CronogramaTabla`, nunca "0.00").
 *
 * `Number(null)` es `0`, así que el chequeo de `null`/`undefined` va ANTES de
 * convertir — si no, el mes 0 exportaría ceros disfrazados de "vacío".
 */
function valorCeldaExcel(crudo: string | number | null): number | null {
  if (crudo === null || crudo === undefined) return null
  if (typeof crudo === 'number') return crudo
  const n = Number(crudo)
  return Number.isNaN(n) ? null : n
}

/**
 * Construye el `Workbook` del cronograma, sin tocar el DOM ni disparar ninguna
 * descarga — separado a propósito de `descargarCronogramaExcel` para poder
 * testear la construcción del libro sin `Blob` ni `URL.createObjectURL`.
 *
 * Las columnas (cuáles hay, en qué orden, según `modo`) vienen de
 * `utils/columnasCronograma.ts`, el MISMO origen que usa `CronogramaTabla`
 * (§5.4, D23, plan-05 T7.2 paso 4) — así la hoja no puede divergir de lo que el
 * usuario vio en pantalla.
 */
export async function construirLibro(cronograma: Cronograma, modo: ModoSimulacion) {
  /**
   * `exceljs` se carga bajo demanda: solo lo descarga quien exporta. Elegida
   * sobre `xlsx` por su historial de vulnerabilidades en el registro público —
   * ver Plan 04 D28 y docs/AUDITORIA-SEGURIDAD-2026-08-13.md.
   */
  const ExcelJS = await import('exceljs')

  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Cronograma')

  const columnas: readonly DefinicionColumnaCronograma[] = columnasCronogramaPorModo(modo)

  hoja.columns = columnas.map((col) => ({
    header: col.titulo,
    key: col.clave,
    width: col.clave === 'mes' ? ANCHO_COLUMNA_MES : ANCHO_COLUMNA_MONTO,
  }))

  // Encabezado en negrita (§5.6).
  const filaEncabezado = hoja.getRow(1)
  filaEncabezado.font = { bold: true }

  const ultimoIndice = cronograma.filas.length - 1

  cronograma.filas.forEach((fila, indice) => {
    const valores: Record<string, number | null> = {}
    for (const col of columnas) {
      valores[col.clave] = valorCeldaExcel(valorCrudoCronograma(fila, col.clave))
    }
    const filaExcel = hoja.addRow(valores)

    // Formato de moneda en las columnas numéricas (todas menos `#`), 2
    // decimales — igual que `formatoMonto` en la tabla (§5.6).
    for (const col of columnas) {
      if (!col.numerica) continue
      filaExcel.getCell(col.clave).numFmt = FORMATO_MONTO_EXCEL
    }

    // El balloon: la última fila de saldo final va destacada, igual que en
    // `CronogramaTabla` (§5.4) — acá con negrita, que es lo que Excel ofrece
    // sin depender de color (accesible en blanco y negro también).
    if (indice === ultimoIndice) {
      const claveSaldoFinal = columnas.find((c) => c.clave === 'saldo_final')?.clave
      if (claveSaldoFinal) {
        filaExcel.getCell(claveSaldoFinal).font = { bold: true }
      }
    }
  })

  return libro
}

/**
 * Dispara la descarga del cronograma como `.xlsx`, vía `Blob` + un enlace
 * temporal clickeado programáticamente. No se almacena en ningún lado — se
 * genera y descarga on demand (§5.6).
 */
export async function descargarCronogramaExcel(
  cronograma: Cronograma,
  modo: ModoSimulacion,
  nombreArchivo: string,
): Promise<void> {
  const libro = await construirLibro(cronograma, modo)
  const buffer = await libro.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
  } finally {
    URL.revokeObjectURL(url)
  }
}
