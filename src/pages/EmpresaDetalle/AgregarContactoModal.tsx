import { useState } from 'react'
import { App, Button, Checkbox, Divider, Form, Input, Modal } from 'antd'
import { useBuscarContactos, useCrearContacto, useVincularContacto } from '@/hooks/useEmpresas'
import { mensajeDeError } from '@/api/client'
import { Icono } from '@/components/Icono'

interface Props {
  idEmpresa: number
  open: boolean
  onClose: () => void
}

interface NuevoContactoForm {
  nombres: string
  apellidos: string
  cargo?: string
  tlf_1?: string
  email_1?: string
  toma_decision: boolean
  es_principal: boolean
}

/**
 * Flujo anti-duplicados (PRD §9.7): primero buscar entre contactos existentes
 * y vincular; solo crear uno nuevo si no existe.
 */
export function AgregarContactoModal({ idEmpresa, open, onClose }: Props) {
  const { message } = App.useApp()
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [form] = Form.useForm<NuevoContactoForm>()
  const [vinculoForm] = Form.useForm<{ cargo?: string; toma_decision: boolean; es_principal: boolean }>()

  const resultados = useBuscarContactos(busqueda, open && !modoCrear)
  const vincular = useVincularContacto(idEmpresa)
  const crear = useCrearContacto()

  const cerrar = () => {
    setBusqueda('')
    setSeleccionado(null)
    setModoCrear(false)
    form.resetFields()
    vinculoForm.resetFields()
    onClose()
  }

  const onVincular = async () => {
    if (!seleccionado) return
    const v = await vinculoForm.validateFields()
    try {
      await vincular.mutateAsync({
        id_contacto: seleccionado,
        cargo: v.cargo ?? null,
        toma_decision: v.toma_decision ?? false,
        es_principal: v.es_principal ?? false,
      })
      message.success('Contacto vinculado')
      cerrar()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo vincular el contacto'))
    }
  }

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        nombres: v.nombres,
        apellidos: v.apellidos,
        email_1: v.email_1 ?? null,
        tlf_1: v.tlf_1 ?? null,
        id_empresa: idEmpresa,
        cargo: v.cargo ?? null,
        toma_decision: v.toma_decision ?? false,
        es_principal: v.es_principal ?? false,
      })
      message.success('Contacto creado y vinculado')
      cerrar()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo crear el contacto'))
    }
  }

  return (
    <Modal
      title="Agregar contacto"
      open={open}
      onCancel={cerrar}
      footer={null}
      destroyOnHidden
      width={520}
    >
      {!modoCrear ? (
        <>
          <span className="eyebrow">Buscar contacto existente</span>
          <Input
            placeholder="Nombre o teléfono (mín. 2 caracteres)"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setSeleccionado(null)
            }}
            style={{ marginTop: 8, marginBottom: 12 }}
            prefix={<Icono nombre="search" tamano={18} color="#747781" />}
          />

          {busqueda.trim().length >= 2 && (
            <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 12 }}>
              {(resultados.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSeleccionado(c.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    marginBottom: 4,
                    borderRadius: 4,
                    border: seleccionado === c.id ? '1px solid #244481' : '1px solid #c4c6d1',
                    background: seleccionado === c.id ? '#f3f2ff' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {c.nombres} {c.apellidos}
                  </div>
                  <div style={{ fontSize: 12, color: '#747781' }}>
                    {c.tlf_1 ?? 'Sin teléfono'}
                    {c.empresas && c.empresas.length > 0 &&
                      ` · ${c.empresas.map((e) => e.razon_social).join(', ')}`}
                  </div>
                </button>
              ))}
              {resultados.data && resultados.data.length === 0 && !resultados.isFetching && (
                <div style={{ color: '#747781', padding: 8 }}>Sin resultados</div>
              )}
            </div>
          )}

          {seleccionado && (
            <Form form={vinculoForm} layout="vertical" requiredMark={false}>
              <Form.Item name="cargo" label="Cargo en esta empresa">
                <Input placeholder="Gerente" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 24 }}>
                <Form.Item name="toma_decision" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Checkbox>Toma decisiones</Checkbox>
                </Form.Item>
                <Form.Item name="es_principal" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Checkbox>Contacto principal</Checkbox>
                </Form.Item>
              </div>
              <Button type="primary" block loading={vincular.isPending} onClick={() => void onVincular()}>
                Vincular contacto
              </Button>
            </Form>
          )}

          <Divider plain style={{ margin: '16px 0' }}>
            ¿No existe?
          </Divider>
          <Button block onClick={() => setModoCrear(true)}>
            Crear contacto nuevo
          </Button>
        </>
      ) : (
        <Form form={form} layout="vertical" requiredMark={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: 'Requerido' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="apellidos" label="Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="cargo" label="Cargo">
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="tlf_1" label="Teléfono">
              <Input />
            </Form.Item>
            <Form.Item name="email_1" label="Email" rules={[{ type: 'email', message: 'Email inválido' }]}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Form.Item name="toma_decision" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Checkbox>Toma decisiones</Checkbox>
            </Form.Item>
            <Form.Item name="es_principal" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Checkbox>Contacto principal</Checkbox>
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={() => setModoCrear(false)}>Volver a buscar</Button>
            <Button type="primary" style={{ flex: 1 }} loading={crear.isPending} onClick={() => void onCrear()}>
              Crear y vincular
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  )
}
