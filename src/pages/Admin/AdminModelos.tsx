import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useActualizarModelo, useCrearModelo, useModelos } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Modelo } from '@/types'
import { formatoMonto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { NeutralTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

const APLICACIONES = ['urbano', 'interprovincial', 'turismo', 'personal', 'otro']

interface FormValues {
  codigo: string
  longitud?: number | null
  capacidad_tanques?: string | null
  max_asientos?: number | null
  precio_base: number
  ficha_tecnica?: string | null
  aplicaciones: string[]
}

export function AdminModelos() {
  const { message } = App.useApp()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Modelo | null>(null)
  const [form] = Form.useForm<FormValues>()

  const modelos = useModelos()
  const crear = useCrearModelo()
  const actualizar = useActualizarModelo()

  const abrir = (m: Modelo | null) => {
    setEditando(m)
    if (m) {
      form.setFieldsValue({
        codigo: m.codigo,
        longitud: m.longitud ? Number(m.longitud) : null,
        capacidad_tanques: m.capacidad_tanques,
        max_asientos: m.max_asientos,
        precio_base: Number(m.precio_base),
        ficha_tecnica: m.ficha_tecnica,
        aplicaciones: m.aplicaciones,
      })
    } else {
      form.resetFields()
    }
    setModalAbierto(true)
  }

  const onGuardar = async () => {
    const v = await form.validateFields()
    const input = {
      codigo: v.codigo,
      longitud: v.longitud != null ? v.longitud.toFixed(2) : null,
      capacidad_tanques: v.capacidad_tanques ?? null,
      max_asientos: v.max_asientos ?? null,
      precio_base: v.precio_base.toFixed(2),
      ficha_tecnica: v.ficha_tecnica ?? null,
      aplicaciones: v.aplicaciones,
    }
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input })
        message.success('Modelo actualizado')
      } else {
        await crear.mutateAsync(input)
        message.success('Modelo creado')
      }
      setModalAbierto(false)
    } catch (e) {
      // El backend responde MODELO_SIN_APLICACIONES si el array llega vacío.
      message.error(mensajeDeError(e, 'No se pudo guardar el modelo'))
    }
  }

  const columnas: ColumnsType<Modelo> = [
    { title: 'Código', dataIndex: 'codigo', render: (c: string) => <span style={{ fontWeight: 600 }}>{c}</span> },
    { title: 'Longitud (m)', dataIndex: 'longitud', render: (v: string | null) => v ?? '—' },
    { title: 'Tanques', dataIndex: 'capacidad_tanques', render: (v: string | null) => v ?? '—' },
    { title: 'Asientos máx.', dataIndex: 'max_asientos', render: (v: number | null) => v ?? '—' },
    {
      title: 'Precio base',
      dataIndex: 'precio_base',
      render: (v: string) => <span className="metric-value">{formatoMonto(v)}</span>,
    },
    {
      title: 'Aplicaciones',
      dataIndex: 'aplicaciones',
      render: (apps: string[]) => (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {apps.map((a) => (
            <NeutralTag key={a}>{a}</NeutralTag>
          ))}
        </span>
      ),
    },
    {
      title: '',
      key: 'acciones',
      render: (_, m) => (
        <Button size="small" onClick={() => abrir(m)}>
          Editar
        </Button>
      ),
    },
  ]

  if (modelos.isLoading) return <Cargando />
  if (modelos.isError) return <ErrorCarga error={modelos.error} onReintentar={() => void modelos.refetch()} />

  return (
    <div className="bento-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="eyebrow">Catálogo de modelos KinWin</span>
        <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => abrir(null)}>
          Nuevo modelo
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={modelos.data ?? []}
        columns={columnas}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editando ? 'Editar modelo' : 'Nuevo modelo'}
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        onOk={() => void onGuardar()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={crear.isPending || actualizar.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="KinWin K12" />
          </Form.Item>
          <Form.Item name="longitud" label="Longitud (m)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="capacidad_tanques" label="Capacidad de tanques">
            <Input placeholder="2x100L" />
          </Form.Item>
          <Form.Item name="max_asientos" label="Asientos máximos">
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
          <Form.Item name="precio_base" label="Precio base (USD)" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="ficha_tecnica" label="Ficha técnica (URL)">
            <Input />
          </Form.Item>
          <Form.Item
            name="aplicaciones"
            label="Aplicaciones"
            rules={[{ required: true, message: 'El modelo necesita al menos una aplicación' }]}
          >
            <Select mode="multiple" options={APLICACIONES.map((a) => ({ value: a, label: a }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
