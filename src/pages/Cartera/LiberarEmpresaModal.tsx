import { App, Form, Modal, Select } from 'antd'
import { useCambiarCarteraMaestra } from '@/hooks/useEmpresas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'

interface Props {
  empresa: { id: number; razon_social: string } | null
  onClose: () => void
}

/** Libera una empresa de la Cartera Maestra asignándole vendedor (contrato §4.6). */
export function LiberarEmpresaModal({ empresa, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ id_vendedor: number }>()
  const vendedores = useVendedoresAsignables(empresa !== null)
  const cambiar = useCambiarCarteraMaestra(empresa?.id ?? 0)

  const onLiberar = async () => {
    const { id_vendedor } = await form.validateFields()
    try {
      await cambiar.mutateAsync({ en_cartera_maestra: false, id_vendedor })
      message.success('Empresa liberada — el vendedor asignado fue notificado')
      form.resetFields()
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo liberar la empresa'))
    }
  }

  return (
    <Modal
      title={empresa ? `Liberar "${empresa.razon_social}"` : 'Liberar empresa'}
      open={empresa !== null}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onLiberar()}
      okText="Liberar y asignar"
      cancelText="Cancelar"
      confirmLoading={cambiar.isPending}
      destroyOnHidden
      width={440}
    >
      <p style={{ marginBottom: 16 }}>
        La empresa saldrá de la Cartera Maestra y será visible para el vendedor asignado y el
        Jefe de Ventas.
      </p>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="id_vendedor"
          label="Vendedor asignado"
          rules={[{ required: true, message: 'Elige el vendedor que la recibirá' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={vendedores.isLoading}
            options={(vendedores.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.nombres} ${e.apellidos}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
