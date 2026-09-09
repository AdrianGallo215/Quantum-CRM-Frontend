import { Alert } from 'antd'
import { estadoHttpDeError } from '@/api/client'
import type { TipoActividad } from '@/types'
import { useComentariosActividad, useCrearComentario } from '@/hooks/useActividades'
import { ListaComentarios } from './ListaComentarios'
import { FormularioComentario } from './FormularioComentario'

interface Props {
  tipo: TipoActividad
  id: number
  /**
   * `false` mientras la ficha que lo contiene esté cerrada: evita pedir
   * comentarios que nadie va a ver. Por defecto `true` porque el uso normal es
   * dentro de un modal que solo se monta abierto.
   */
  activo?: boolean
}

/**
 * Comentarios de seguimiento de una actividad: lista + alta.
 *
 * Componente CONECTADO — es el único lugar del módulo que junta las dos queries
 * de comentarios. Se reutiliza en `ActividadDetalleModal`, `TareaDetalleModal` y
 * `EventoDetalleModal`.
 */
export function PanelComentarios({ tipo, id, activo = true }: Props) {
  const comentarios = useComentariosActividad(tipo, id, activo)
  const crear = useCrearComentario(tipo, id)

  // El 404 del backend significa "no existe O no lo puedes ver" — es ambiguo a
  // propósito (informe §7), así que el mensaje no puede afirmar ninguna de las
  // dos cosas por separado.
  if (comentarios.isError && estadoHttpDeError(comentarios.error) === 404) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Sin comentarios disponibles"
        description="Esta actividad no existe o no tienes acceso a ella."
      />
    )
  }

  return (
    <div className="space-y-4">
      <ListaComentarios
        comentarios={comentarios.data ?? []}
        cargando={comentarios.isLoading}
        error={comentarios.isError ? comentarios.error : undefined}
        onReintentar={() => void comentarios.refetch()}
      />
      <FormularioComentario
        enviando={crear.isPending}
        onEnviar={(texto) => crear.mutateAsync({ texto })}
      />
    </div>
  )
}
