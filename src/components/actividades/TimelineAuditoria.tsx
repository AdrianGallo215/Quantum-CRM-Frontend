import { Timeline } from 'antd'
import type { CambioAuditoria } from '@/types'
import { etiquetaCampoAuditado, valorAuditadoDisplay } from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'

interface Props {
  /** Ya vienen del más reciente al más antiguo (informe §9). NO reordenar. */
  cambios: CambioAuditoria[]
  cargando?: boolean
  error?: unknown
  onReintentar?: () => void
}

/**
 * Changelog campo a campo de una tarea o evento. Componente tonto.
 *
 * Cada entrada del backend es UN campo: una edición que tocó tres campos llega
 * como tres filas con el mismo `changed_at`. No se agrupan — agruparlas obligaría
 * a inventar una clave de "edición" que el backend no expone.
 */
export function TimelineAuditoria({ cambios, cargando, error, onReintentar }: Props) {
  if (cargando) return <Cargando mensaje="Cargando cambios…" />
  if (error) return <ErrorCarga error={error} onReintentar={onReintentar} />
  if (cambios.length === 0) {
    return <p className="text-body-md text-on-surface-variant py-4">Sin ediciones registradas.</p>
  }

  return (
    <Timeline
      items={cambios.map((c) => ({
        key: c.id,
        children: (
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-on-surface">{etiquetaCampoAuditado(c.campo)}</span>
              <span className="text-label-md text-on-surface-variant">
                {nombreCompleto(c.autor)} · {formatoFechaHora(c.changed_at)}
              </span>
            </div>
            <div className="text-body-md break-words">
              <span className="line-through text-on-surface-variant">
                {valorAuditadoDisplay(c.campo, c.valor_anterior)}
              </span>
              <span className="mx-2">→</span>
              <span className="text-on-surface">
                {valorAuditadoDisplay(c.campo, c.valor_nuevo)}
              </span>
            </div>
          </div>
        ),
      }))}
    />
  )
}
