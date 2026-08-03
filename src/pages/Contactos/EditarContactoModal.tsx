import { useEffect } from 'react'
import { App, Form, Input, Modal } from 'antd'
import { useActualizarContactoDetalle } from '@/hooks/useContactos'
import { mensajeDeError } from '@/api/client'
import type { ContactoDetalle } from '@/types'

interface FormValues {
  nombres: string
  apellidos: string
  email_1?: string
  email_2?: string
  tlf_1?: string
  tlf_2?: string
  notas?: string
}

interface Props {
  contacto: ContactoDetalle
  open: boolean
  onClose: () => void
}

export function EditarContactoModal({ contacto, open, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const actualizar = useActualizarContactoDetalle(contacto.id)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        nombres: contacto.nombres,
        apellidos: contacto.apellidos,
        email_1: contacto.email_1 ?? undefined,
        email_2: contacto.email_2 ?? undefined,
        tlf_1: contacto.tlf_1 ?? undefined,
        tlf_2: contacto.tlf_2 ?? undefined,
        notas: contacto.notas ?? undefined,
      })
    }
  }, [open, contacto, form])

  const onGuardar = async () => {
    const v = await form.validateFields()
    try {
      await actualizar.mutateAsync({
        nombres: v.nombres,
        apellidos: v.apellidos,
        email_1: v.email_1 ?? null,
        email_2: v.email_2 ?? null,
        tlf_1: v.tlf_1 ?? null,
        tlf_2: v.tlf_2 ?? null,
        notas: v.notas ?? null,
      })
      message.success('Contacto actualizado')
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo actualizar el contacto'))
    }
  }

  return (
    <Modal
      title="Editar contacto"
      open={open}
      onCancel={onClose}
      onOk={() => void onGuardar()}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={actualizar.isPending}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="apellidos" label="Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="email_1" label="Correo principal" rules={[{ type: 'email', message: 'Correo inválido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email_2" label="Correo secundario" rules={[{ type: 'email', message: 'Correo inválido' }]}>
            <Input />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="tlf_1" label="Teléfono principal">
            <Input />
          </Form.Item>
          <Form.Item name="tlf_2" label="Teléfono secundario">
            <Input />
          </Form.Item>
        </div>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
