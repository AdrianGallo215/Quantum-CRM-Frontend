import type { ComentarioActividad } from '@/types'
import { formatoFechaHora, iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'

interface Props {
  /** Ya vienen ordenados cronológicamente (ASC) del backend. NO reordenar. */
  comentarios: ComentarioActividad[]
  cargando?: boolean
  error?: unknown
  onReintentar?: () => void
}

/**
 * Lista de comentarios de seguimiento. Componente tonto: recibe los datos ya
 * pedidos y no consulta nada.
 *
 * El texto se renderiza como nodo de texto con `whitespace-pre-wrap` para
 * preservar los saltos de línea. NUNCA `dangerouslySetInnerHTML`: es contenido
 * escrito por usuarios (CLAUDE.md regla 9).
 */
export function ListaComentarios({ comentarios, cargando, error, onReintentar }: Props) {
  if (cargando) return <Cargando mensaje="Cargando comentarios…" />
  if (error) return <ErrorCarga error={error} onReintentar={onReintentar} />
  if (comentarios.length === 0) {
    return <p className="text-body-md text-on-surface-variant py-4">Sin comentarios todavía.</p>
  }

  return (
    <ul className="space-y-4 list-none p-0 m-0">
      {comentarios.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div
            title={nombreCompleto(c.autor)}
            className="shrink-0 w-8 h-8 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[11px] font-bold"
          >
            {iniciales(c.autor?.nombres, c.autor?.apellidos)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-on-surface">{nombreCompleto(c.autor)}</span>
              <span className="text-label-md text-on-surface-variant">
                {formatoFechaHora(c.created_at)}
              </span>
            </div>
            <p
              data-testid="texto-comentario"
              className="text-body-md text-on-surface whitespace-pre-wrap break-words m-0"
            >
              {c.texto}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
