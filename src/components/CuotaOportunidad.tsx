import { Tooltip } from 'antd'
import { formatoCuota } from '@/utils/simulaciones'
import type { Oportunidad } from '@/types'

/**
 * Los tres campos de cuota de nivel oportunidad (encargo §4.1).
 *
 * Son `null` LOS TRES A LA VEZ si cualquier ítem no tiene cuota calculable — por eso
 * se comprueban juntos y no uno por uno. Se muestra "Todavía no se puede calcular",
 * jamás cero ni un guion que parezca un monto (D12). Es degradación silenciosa
 * esperada: **nunca** un toast, un color de error ni un `role="alert"`.
 *
 * ⚠ `cuota_total` de la raíz NO es `cuota_total` del ítem: acá es el total mensual de
 * toda la operación, ya multiplicado por cantidades; en el ítem es la cuota de una
 * sola unidad de ese modelo. Por eso las etiquetas son distintas (D13): la raíz dice
 * "total", el ítem dice "por unidad" (ver `FilaItem` en `PropiedadesCard`).
 *
 * Nada se calcula acá: los tres valores llegan resueltos del backend. Si vienen
 * `null`, no se estiman (`reglas_simulaciones.md` §3 es del backend).
 */
export function CuotaOportunidad({ oportunidad }: { oportunidad: Oportunidad }) {
  const { cuota_quantum_total, cuota_total, cuota_diaria_total } = oportunidad
  const sinCalcular =
    cuota_quantum_total === null || cuota_total === null || cuota_diaria_total === null

  if (sinCalcular) {
    return (
      <Tooltip title="Algún ítem no tiene una cuota calculable todavía. Revisa que todos tengan modelo, cantidad y precio.">
        <span className="font-body-md text-on-surface-variant italic">
          Todavía no se puede calcular
        </span>
      </Tooltip>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Metrica
        etiqueta="Cuota mensual total"
        // La cuota de TODA la operación, ya multiplicada por cantidades.
        valor={cuota_total}
        detalle="Toda la operación, al mes"
      />
      <Metrica
        etiqueta="Cuota Quantum total"
        valor={cuota_quantum_total}
        detalle="Solo el financiamiento de Quantum"
      />
      <Metrica
        etiqueta="Cuota diaria"
        valor={cuota_diaria_total}
        detalle="Cuota mensual total entre 22 días trabajados"
      />
    </div>
  )
}

/**
 * Un valor de cuota con su rótulo. `role="group"` + `aria-label` mantienen unidos
 * etiqueta y monto: es lo que permite afirmar, en la UI y en el test, que el total
 * de la operación no muestra el valor de una unidad.
 */
function Metrica({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: string
  detalle: string
}) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="font-label-md text-label-md text-on-surface-variant uppercase block mb-1">
        {etiqueta}
      </span>
      <span className="font-bold text-body-lg font-mono text-primary">{formatoCuota(valor)}</span>
      <span className="font-body-sm text-on-surface-variant block mt-1">{detalle}</span>
    </div>
  )
}
