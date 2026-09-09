import { Alert } from 'antd'
import { estadoHttpDeError } from '@/api/client'
import type { TipoActividad } from '@/types'
import { useAuditoriaActividad } from '@/hooks/useActividades'
import { TimelineAuditoria } from './TimelineAuditoria'

interface Props {
  tipo: TipoActividad
  id: number
  /**
   * Igual que en PanelComentarios: no pedir si la ficha está cerrada. Solo que
   * la auditoría pesa más, así que apagado es más importante acá.
   */
  activo?: boolean
}

/**
 * Panel conectado del registro de auditoría (quién cambió qué y cuándo).
 */
export function PanelAuditoria({ tipo, id, activo = true }: Props) {
  const auditoria = useAuditoriaActividad(tipo, id, activo)

  // El 404 del backend también aplica a la auditoría (informe §7).
  if (auditoria.isError && estadoHttpDeError(auditoria.error) === 404) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Auditoría no disponible"
        description="Esta actividad no existe o no tienes acceso a ella."
      />
    )
  }

  return (
    <TimelineAuditoria
      cambios={auditoria.data ?? []}
      cargando={auditoria.isLoading}
      error={auditoria.isError ? auditoria.error : undefined}
      onReintentar={() => void auditoria.refetch()}
    />
  )
}
