import { useState } from 'react'
import { App, Button, Form, Input, Modal, Select, Switch, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useActualizarEmpleado,
  useCambiarActivoEmpleado,
  useCrearEmpleado,
  useEmpleados,
} from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Empleado, Rol } from '@/types'
import { ETIQUETA_ROL } from '@/utils/etiquetas'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { PositivoTag, NeutralTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

const ROLES: Rol[] = ['admin', 'gerencia', 'jdv', 'vendedor', 'analista']

interface FormValues {
  nombres: string
  apellidos: string
  email: string
  password?: string
  rol: Rol
  area: string
  puesto: string
}

export function AdminEmpleados() {
  const { message } = App.useApp()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Empleado | null>(null)
  const [form] = Form.useForm<FormValues>()

  const empleados = useEmpleados({})
  const crear = useCrearEmpleado()
  const actualizar = useActualizarEmpleado()
  const cambiarActivo = useCambiarActivoEmpleado()

  const abrirCrear = () => {
    setEditando(null)
    form.resetFields()
    setModalAbierto(true)
  }

  const abrirEditar = (emp: Empleado) => {
    setEditando(emp)
    form.setFieldsValue({
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      email: emp.email,
      rol: emp.rol,
      area: emp.area,
      puesto: emp.puesto,
    })
    setModalAbierto(true)
  }

  const onGuardar = async () => {
    const values = await form.validateFields()
    try {
      if (editando) {
        const { password: _pw, ...resto } = values
        await actualizar.mutateAsync({ id: editando.id, input: resto })
        message.success('Empleado actualizado')
      } else {
        await crear.mutateAsync({ ...values, password: values.password ?? '' })
        message.success('Empleado creado')
      }
      setModalAbierto(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar el empleado'))
    }
  }

  const columnas: ColumnsType<Empleado> = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, e) => (
        <span style={{ fontWeight: 600 }}>
          {e.nombres} {e.apellidos}
        </span>
      ),
    },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Rol', dataIndex: 'rol', render: (rol: Rol) => ETIQUETA_ROL[rol] },
    { title: 'Área', dataIndex: 'area' },
    { title: 'Puesto', dataIndex: 'puesto' },
    {
      title: 'Estado',
      dataIndex: 'activo',
      render: (activo: boolean | undefined) =>
        activo === false ? <NeutralTag>Inactivo</NeutralTag> : <PositivoTag>Activo</PositivoTag>,
    },
    {
      title: '',
      key: 'acciones',
      render: (_, e) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button size="small" onClick={() => abrirEditar(e)}>
            Editar
          </Button>
          <Switch
            size="small"
            checked={e.activo !== false}
            checkedChildren="Activo"
            unCheckedChildren="Inactivo"
            loading={cambiarActivo.isPending}
            onChange={(activo) =>
              cambiarActivo.mutate(
                { id: e.id, activo },
                {
                  onError: (err) => message.error(mensajeDeError(err)),
                },
              )
            }
          />
        </div>
      ),
    },
  ]

  if (empleados.isLoading) return <Cargando />
  if (empleados.isError) return <ErrorCarga error={empleados.error} onReintentar={() => void empleados.refetch()} />

  return (
    <div className="bento-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="eyebrow">Equipo</span>
        <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={abrirCrear}>
          Nuevo empleado
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={empleados.data ?? []}
        columns={columnas}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editando ? 'Editar empleado' : 'Nuevo empleado'}
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        onOk={() => void onGuardar()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={crear.isPending || actualizar.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="apellidos" label="Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Requerido' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input />
          </Form.Item>
          {!editando && (
            <Form.Item
              name="password"
              label="Contraseña temporal"
              rules={[{ required: true, message: 'Requerido' }, { min: 8, message: 'Mínimo 8 caracteres' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="rol" label="Rol" rules={[{ required: true, message: 'Requerido' }]}>
            <Select options={ROLES.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))} />
          </Form.Item>
          <Form.Item name="area" label="Área" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="puesto" label="Puesto" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
