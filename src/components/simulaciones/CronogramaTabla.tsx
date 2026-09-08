import { formatoMonto } from '@/utils/formato'
import { formatoTasa } from '@/utils/simulaciones'
import { columnasCronogramaPorModo, valorCrudoCronograma } from '@/utils/columnasCronograma'
import type { ModoSimulacion } from '@/types/enums'
import type { Cronograma } from '@/types/simulacion'

/**
 * El mes 0 es la fila de la cuota inicial: `interes`, `igv`, `cuota` y
 * `cuota_con_igv` llegan `null` del backend y van EN BLANCO (§5.4). No "0.00", no
 * "-", no "—": literalmente vacías. Un guion suelto se lee como un monto vacío y el
 * encargo lo prohíbe.
 *
 * ⚠ NO usar `formatoMonto` a secas: devuelve "—" para `null`, que es justo lo que
 * esta celda no puede mostrar.
 */
function celda(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return ''
  return formatoMonto(valor)
}

/**
 * Las columnas (cuáles hay, en qué orden, según el modo) viven en
 * `utils/columnasCronograma.ts` — módulo compartido con `exportarCronograma`
 * (T7.2) para que tabla y Excel no puedan divergir (§5.4, D23). Ver el
 * comentario de ese archivo para el porqué de los dos arrays.
 */

/**
 * Cronograma de amortización. **Componente tonto** (D23): recibe el `Cronograma` ya
 * calculado por el backend más el `modo`, no consulta nada por su cuenta y NO
 * calcula, deriva ni corrige ninguna fila. Si un dato falta, se muestra vacío; no se
 * deduce (`reglas_simulaciones.md` §3: el motor de cálculo es del backend).
 *
 * Lo reutilizan el simulador de la oportunidad, la Calculadora, el detalle del
 * módulo y la propuesta financiera.
 *
 * Reglas fijadas por `CronogramaTabla.test.tsx`, todas del encargo §5.4:
 *  - dos juegos de columnas según `modo`, no uno con `hidden`;
 *  - mes 0 en blanco, nunca "0.00";
 *  - sin fila extra para el balloon (la "cuota 49" del LEASING.xlsx era un artificio
 *    de la hoja: 48 meses son 48 filas más el mes 0);
 *  - última celda de saldo final destacada: es el balloon (`valor_residual`);
 *  - `tasa_nominal_mensual` con `formatoTasa`, nunca redondeada a 2 decimales (§3.1).
 */
export function CronogramaTabla({
  cronograma,
  modo,
}: {
  cronograma: Cronograma
  modo: ModoSimulacion
}) {
  const columnas = columnasCronogramaPorModo(modo)
  const ultimoIndice = cronograma.filas.length - 1

  return (
    <div className="font-body">
      <Agregados cronograma={cronograma} />

      {/*
        K32: 49 filas se leen de corrido, así que NO se paginan. Scroll interno
        acotado en vertical (la tabla no crece con la página) y scroll horizontal
        para que la tabla ancha no desborde en mobile.
      */}
      <div
        data-testid="cronograma-scroll"
        className="max-h-[480px] overflow-y-auto overflow-x-auto rounded border border-outline-variant"
      >
        <table className="w-full border-collapse text-body-md">
          <caption className="sr-only">Cronograma de amortización</caption>
          <thead className="sticky top-0 bg-surface-container-high">
            <tr className="border-b border-surface-container-high">
              {columnas.map((col) => (
                <th
                  key={col.clave}
                  scope="col"
                  className={`whitespace-nowrap px-2 py-3 text-label-md font-semibold uppercase tracking-wider text-on-surface-variant ${
                    col.numerica ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cronograma.filas.map((fila, indice) => (
              <tr
                key={fila.mes}
                className="border-b border-surface-container-high transition-colors hover:bg-surface-container-lowest"
              >
                {columnas.map((col) => {
                  // El balloon: la ÚLTIMA celda de saldo final es el valor residual
                  // y va destacada (§5.4). Solo esa: si se destacaran todas, no
                  // destacaría ninguna.
                  const esBalloon = col.clave === 'saldo_final' && indice === ultimoIndice
                  const crudo = valorCrudoCronograma(fila, col.clave)
                  const texto = col.clave === 'mes' ? String(crudo) : celda(crudo as string | null)
                  return (
                    <td
                      key={col.clave}
                      className={`whitespace-nowrap px-2 py-4 ${
                        col.numerica ? 'text-right font-medium tabular-nums' : 'text-left'
                      }`}
                    >
                      {esBalloon ? (
                        <span className="inline-block rounded-full bg-secondary-container px-2 py-0.5 font-semibold text-on-secondary-container">
                          {texto}
                        </span>
                      ) : (
                        texto
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Los agregados que el backend devuelve junto a las filas. `tasa_nominal_mensual`
 * va con `formatoTasa` y NO con `formatoMonto` ni `formatoPorcentaje`: llega sin
 * redondear a propósito y no se redondea nunca a 2 decimales (§3.1, K19).
 */
function Agregados({ cronograma }: { cronograma: Cronograma }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Agregado etiqueta="Cuota final" valor={formatoMonto(cronograma.cuota_final)} />
      <Agregado etiqueta="Cuota financiera" valor={formatoMonto(cronograma.cuota_financiera)} />
      <Agregado etiqueta="Valor de venta" valor={formatoMonto(cronograma.valor_venta)} />
      <Agregado etiqueta="IGV total" valor={formatoMonto(cronograma.igv)} />
      <Agregado etiqueta="Principal" valor={formatoMonto(cronograma.principal)} />
      <Agregado
        etiqueta="Tasa nominal mensual"
        valor={formatoTasa(cronograma.tasa_nominal_mensual)}
      />
    </div>
  )
}

/** `role="group"` + `aria-label` mantienen unidos etiqueta y valor: es lo que
 *  permite afirmar, en la UI y en el test, cuál valor lleva cuál rótulo. */
function Agregado({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="mb-1 block text-label-md uppercase tracking-wider text-on-surface-variant">
        {etiqueta}
      </span>
      <span className="text-body-lg font-semibold tabular-nums text-on-surface">{valor}</span>
    </div>
  )
}
