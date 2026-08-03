import { App, DatePicker, Form, Input, Modal, Radio, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { useCrearEventoEmpresa } from '@/hooks/useEventosTareas'
import { useCatalogoEventos } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'

interface FormValues {
  tipo: 'catalogo' | 'personalizado'
  id_catalogo_evento?: number
  nombre_personalizado?: string
  fecha_estimada?: Dayjs | null
  fecha_seguimiento?: Dayjs | null
  descripcion?: string
}

interface Props {
  idEmpresa: number
  open: boolean
  onClose: () => void
}

/**
 * Crea un evento a nivel empresa (sin oportunidad) — hitos de prospección u otros.
 * Pendiente en backend: ver docs/solicitud-backend-eventos-empresa.md
 */
export function CrearEventoEmpresaModal({ idEmpresa, open, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const tipoEvento = Form.useWatch('tipo', form)

  const catalogo = useCatalogoEventos()
  const crear = useCrearEventoEmpresa(idEmpresa)

  // Heurística provisional del frontend mientras no exista `aplica_a_empresa`
  // en catalogo-eventos (ver solicitud a backend): solo eventos sin etapa de
  // pipeline asociada, o marcados como hito de prospección.
  const opcionesCatalogo = (catalogo.data ?? []).filter(
    (c) => c.etapa_asociada === null || c.es_hito_prospeccion,
  )

  const cerrar = () => {
    form.resetFields()
    onClose()
  }

  const onCrear = async () => {
    const v = await form.validateFields()
    const fechas = {
      fecha_estimada: v.fecha_estimada ? v.fecha_estimada.format('YYYY-MM-DD') : null,
      fecha_seguimiento: v.fecha_seguimiento ? v.fecha_seguimiento.format('YYYY-MM-DD') : null,
      descripcion: v.descripcion ?? null,
    }
    try {
      if (v.tipo === 'personalizado') {
        await crear.mutateAsync({
          es_personalizado: true,
          nombre_personalizado: v.nombre_personalizado ?? '',
          ...fechas,
        })
      } else {
        await crear.mutateAsync({ id_catalogo_evento: v.id_catalogo_evento ?? 0, ...fechas })
      }
      message.success('Evento registrado')
      cerrar()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo registrar el evento'))
    }
  }

  return (
    <Modal
      title="Nuevo evento de la empresa"
      open={open}
      onCancel={cerrar}
      onOk={() => void onCrear()}
      okText="Registrar"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ tipo: 'catalogo' }}>
        <Form.Item name="tipo">
          <Radio.Group>
            <Radio.Button value="catalogo">Del catálogo</Radio.Button>
            <Radio.Button value="personalizado">Personalizado</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {tipoEvento !== 'personalizado' ? (
          <Form.Item
            name="id_catalogo_evento"
            label="Evento del catálogo"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Select
              loading={catalogo.isLoading}
              showSearch
              optionFilterProp="label"
              options={opcionesCatalogo.map((c) => ({
                value: c.id,
                label: `${c.nombre}${c.es_hito_prospeccion ? ' · Hito de prospección' : ''}`,
              }))}
              notFoundContent="Sin eventos de catálogo aplicables a empresa"
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="nombre_personalizado"
            label="Nombre del evento"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Input placeholder="Visita a cochera" />
          </Form.Item>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="fecha_estimada" label="Fecha estimada">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fecha_seguimiento" label="Fecha de seguimiento">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>
        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
