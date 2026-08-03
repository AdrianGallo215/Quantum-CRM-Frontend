import type { ReactNode } from 'react'
import { Icono } from './Icono'

interface Props {
  /** Etiqueta del campo (uppercase, estilo ficha) */
  label: string
  /** Contenido cuando NO se está editando (valor formateado) */
  display: ReactNode
  /** Contenido del control de edición (Input, Select, DatePicker…) */
  edit?: ReactNode
  /** ¿El campo admite edición? Si es false, nunca muestra lápiz ni control */
  editable?: boolean
  /** ¿El campo está actualmente en modo edición? */
  enEdicion?: boolean
  /** Alterna el modo edición de este campo */
  onToggle?: () => void
  /** Ocupa las dos columnas de la grilla */
  ancho?: boolean
}

/**
 * Fila de una ficha de detalle. Muestra el valor y, si el campo es editable,
 * un lápiz sutil que lo convierte en un control de edición inline.
 */
export function CampoEditable({
  label,
  display,
  edit,
  editable = false,
  enEdicion = false,
  onToggle,
  ancho = false,
}: Props) {
  return (
    <div className={ancho ? 'col-span-2' : undefined}>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-label-md text-on-surface-variant uppercase">{label}</p>
        {editable && !enEdicion && (
          <button
            type="button"
            aria-label={`Editar ${label}`}
            title={`Editar ${label}`}
            className="text-outline hover:text-primary transition-colors leading-none"
            onClick={onToggle}
          >
            <Icono nombre="edit" tamano={15} />
          </button>
        )}
      </div>
      {editable && enEdicion ? (
        <div>{edit}</div>
      ) : (
        <div className="text-body-lg font-semibold text-on-surface">{display}</div>
      )}
    </div>
  )
}
