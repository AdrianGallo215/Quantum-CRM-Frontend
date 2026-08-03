import { App, Alert, Form, Input, Modal } from 'antd'
import { useCrearSolicitud } from '@/hooks/useSolicitudes'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { Solicitud } from '@/types'

/** Qué solicitud se va a crear. null = modal cerrado. */
export type SolicitudPendiente =
  | {
      tipo: 'descuento'
      idOportunidad: number
      /** dcto que el usuario intentó aplicar (numérico, del formulario) */
      dctoSolicitado: number
      /** message del 422 del backend — se muestra tal cual (autoridad) */
      mensajeBackend: string
    }
  | {
      tipo: 'reasignacion_cliente'
      idEmpresa: number
      idVendedorNuevo: number
      nombreVendedorNuevo: string
      mensajeBackend: string
    }

interface Props {
  solicitud: SolicitudPendiente | null
  onClose: () => void
  /** Se llama con la solicitud creada (para navegar, mostrar toast extra, etc.) */
  onEnviada?: (s: Solicitud) => void
}

/**
 * Modal genérico de "enviar solicitud de aprobación" (contrato §1.2, §3.1, §3.2).
 * Se abre cuando el backend respondió 422 APROBACION_REQUERIDA (descuento)
 * o 403 PERMISO_INSUFICIENTE (reasignación por jdv). El backend decide solo
 * el aprobador — este modal no lo envía.
 */
export function SolicitudModal({ solicitud, onClose, onEnviada }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ motivo: string }>()
  const crear = useCrearSolicitud()

  const onEnviar = async () => {
    if (!solicitud) return
    const { motivo } = await form.validateFields()
    try {
      const creada = await crear.mutateAsync(
        solicitud.tipo === 'descuento'
          ? {
              tipo: 'descuento',
              entidad_tipo: 'oportunidad',
              entidad_id: solicitud.idOportunidad,
              dcto_solicitado: solicitud.dctoSolicitado.toFixed(2),
              motivo,
            }
          : {
              tipo: 'reasignacion_cliente',
              entidad_tipo: 'empresa',
              entidad_id: solicitud.idEmpresa,
              id_vendedor_nuevo: solicitud.idVendedorNuevo,
              motivo,
            },
      )
      message.success('Solicitud enviada — te notificaremos cuando se resuelva')
      form.resetFields()
      onClose()
      onEnviada?.(creada)
    } catch (e) {
      if (codigoDeError(e) === 'SOLICITUD_DUPLICADA') {
        message.warning('Ya existe una solicitud pendiente del mismo tipo sobre esta entidad')
        form.resetFields()
        onClose()
        return
      }
      message.error(mensajeDeError(e, 'No se pudo enviar la solicitud'))
    }
  }

  const resumen =
    solicitud?.tipo === 'descuento'
      ? `Se enviará una solicitud para aplicar ${solicitud.dctoSolicitado}% de descuento.`
      : solicitud
        ? `Se enviará una solicitud para reasignar este cliente a ${solicitud.nombreVendedorNuevo}.`
        : ''

  return (
    <Modal
      title="Enviar solicitud de aprobación"
      open={solicitud !== null}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onEnviar()}
      okText="Enviar solicitud"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
      width={480}
    >
      {solicitud && (
        <div className="flex flex-col gap-4">
          {/* El mensaje del backend ES la explicación autoritativa (quién aprueba y por qué) */}
          <Alert type="info" showIcon message={solicitud.mensajeBackend} description={resumen} />
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="motivo"
              label="Motivo de la solicitud"
              rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Ej.: Cliente frecuente, tercera compra del año"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Form>
        </div>
      )}
    </Modal>
  )
}
