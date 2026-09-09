import { Modal, Tabs } from 'antd'
import type { Actividad } from '@/types'
import { ETIQUETA_TIPO_ACTIVIDAD, fechaDisplayActividad } from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { CampoEditable } from '@/components/CampoEditable'
import { PanelComentarios } from './PanelComentarios'
import { PanelAuditoria } from './PanelAuditoria'

interface Props {
  /** Actividad a mostrar; `null` mantiene el modal cerrado. */
  actividad: Actividad | null
  onClose: () => void
  /** Navega al detalle de la oportunidad o empresa relacionada (opcional). */
  irADetalle?: () => void
}

/**
 * Ficha de una actividad del historial unificado: cabecera de solo lectura +
 * pestañas de comentarios y de cambios (informe §14).
 *
 * Es SOLO LECTURA sobre la actividad: para editar una tarea o un evento están
 * `TareaDetalleModal` y `EventoDetalleModal`, que hablan con los endpoints de
 * sus propios módulos. Este modal solo escribe comentarios.
 */
export function ActividadDetalleModal({ actividad, onClose, irADetalle }: Props) {
  if (!actividad) {
    return <Modal open={false} footer={null} />
  }

  const { tipo, id } = actividad

  return (
    <Modal
      title={`${ETIQUETA_TIPO_ACTIVIDAD[tipo]} · ${actividad.titulo}`}
      open
      onCancel={onClose}
      width={640}
      footer={null}
    >
      <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
        <CampoEditable label="Empresa" display={actividad.empresa?.razon_social ?? '—'} />
        <CampoEditable label="Responsable" display={nombreCompleto(actividad.empleado)} />
        <CampoEditable label="Estado" display={actividad.estado} />
        {/* Una sola fecha visible: `fecha_hora` si existe, si no `fecha_dia`.
            Los dos campos NO se mezclan (informe §3, WARNING). */}
        <CampoEditable label="Fecha" display={fechaDisplayActividad(actividad)} />
        <CampoEditable label="Creada" display={formatoFechaHora(actividad.created_at)} />
        <CampoEditable label="Descripción" ancho display={actividad.descripcion ?? '—'} />
      </div>

      <Tabs
        items={[
          {
            key: 'comentarios',
            label: `Comentarios${actividad.comentarios > 0 ? ` (${actividad.comentarios})` : ''}`,
            children: <PanelComentarios tipo={tipo} id={id} />,
          },
          {
            key: 'auditoria',
            label: 'Cambios',
            children: <PanelAuditoria tipo={tipo} id={id} />,
          },
        ]}
      />

      {irADetalle && (
        <div className="mt-4">
          <button type="button" className="text-primary font-bold hover:underline" onClick={irADetalle}>
            Ver detalle relacionado
          </button>
        </div>
      )}
    </Modal>
  )
}
