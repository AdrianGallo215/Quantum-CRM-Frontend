import { Descriptions, Modal, Tag } from 'antd'
import { useSolicitud } from '@/hooks/useSolicitudes'
import type { Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

interface Props {
  /** Fila de la tabla que originó la apertura; se usa solo para el id — el
   * contenido se refresca siempre desde GET /solicitudes/:id (contrato §4.3). */
  solicitud: Solicitud | null
  onClose: () => void
}

/** Detalle completo de una solicitud, de solo lectura (punto P9 confirmado). */
export function SolicitudDetalleModal({ solicitud, onClose }: Props) {
  const detalle = useSolicitud(solicitud?.id ?? null)
  const s = detalle.data ?? solicitud

  return (
    <Modal
      title="Detalle de la solicitud"
      open={solicitud !== null}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
      {!s ? null : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Tipo">{ETIQUETA_TIPO_SOLICITUD[s.tipo]}</Descriptions.Item>
          <Descriptions.Item label="Estado">
            <Tag color={COLOR_ESTADO[s.estado]}>{ETIQUETA_ESTADO_SOLICITUD[s.estado]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Entidad">{s.entidad_descripcion}</Descriptions.Item>
          <Descriptions.Item label="Cambio solicitado">
            {descripcionPayloadSolicitud(s)}
          </Descriptions.Item>
          <Descriptions.Item label="Solicitante">{nombreCompleto(s.solicitante)}</Descriptions.Item>
          <Descriptions.Item label="Motivo">{s.motivo}</Descriptions.Item>
          <Descriptions.Item label="Enviada">{formatoFecha(s.created_at)}</Descriptions.Item>
          {s.estado !== 'pendiente' && (
            <>
              <Descriptions.Item label="Resolutor">
                {s.resolutor ? nombreCompleto(s.resolutor) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Resuelta">
                {s.resolved_at ? formatoFecha(s.resolved_at) : '—'}
              </Descriptions.Item>
              {s.estado === 'denegada' && (
                <Descriptions.Item label="Motivo de denegación">
                  {s.motivo_resolucion ?? '—'}
                </Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      )}
    </Modal>
  )
}
