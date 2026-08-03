import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Switch, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useActualizarFinanciadora,
  useCrearFinanciadora,
  useFinanciadoras,
} from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Financiadora } from '@/types'
import { formatoMonto, formatoPorcentaje } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { PositivoTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

interface FormValues {
  nombre: string
  monto_por_unidad?: number | null
  plazo_meses?: number | null
  tea?: number | null
  cuota_por_unidad?: number | null
  es_default: boolean
  notas?: string | null
}

export function AdminFinanciadoras() {
  const { message } = App.useApp()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Financiadora | null>(null)
  const [form] = Form.useForm<FormValues>()

  const financiadoras = useFinanciadoras()
  const crear = useCrearFinanciadora()
  const actualizar = useActualizarFinanciadora()

  const abrir = (f: Financiadora | null) => {
    setEditando(f)
    if (f) {
      form.setFieldsValue({
        nombre: f.nombre,
        monto_por_unidad: f.monto_por_unidad ? Number(f.monto_por_unidad) : null,
        plazo_meses: f.plazo_meses,
        tea: f.tea ? Number(f.tea) : null,
        cuota_por_unidad: f.cuota_por_unidad ? Number(f.cuota_por_unidad) : null,
        es_default: f.es_default,
        notas: f.notas,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ es_default: false })
    }
    setModalAbierto(true)
  }

  const onGuardar = async () => {
    const v = await form.validateFields()
    const input = {
      nombre: v.nombre,
      monto_por_unidad: v.monto_por_unidad != null ? v.monto_por_unidad.toFixed(2) : null,
      plazo_meses: v.plazo_meses ?? null,
      tea: v.tea != null ? v.tea.toFixed(4) : null,
      cuota_por_unidad: v.cuota_por_unidad != null ? v.cuota_por_unidad.toFixed(2) : null,
      es_default: v.es_default,
      notas: v.notas ?? null,
    }
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input })
        message.success('Financiadora actualizada')
      } else {
        await crear.mutateAsync(input)
        message.success('Financiadora creada')
      }
      setModalAbierto(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar la financiadora'))
    }
  }

  const columnas: ColumnsType<Financiadora> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      render: (nombre: string, f) => (
        <span style={{ fontWeight: 600 }}>
          {nombre} {f.es_default && <PositivoTag>Default</PositivoTag>}
        </span>
      ),
    },
    {
      title: 'Monto por unidad',
      dataIndex: 'monto_por_unidad',
      render: (v: string | null) => <span className="metric-value">{formatoMonto(v)}</span>,
    },
    { title: 'Plazo (meses)', dataIndex: 'plazo_meses', render: (v: number | null) => v ?? '—' },
    {
      title: 'TEA',
      dataIndex: 'tea',
      render: (v: string | null) => <span className="metric-value">{v ? formatoPorcentaje(Number(v) * 100) : '—'}</span>,
    },
    {
      title: 'Cuota por unidad',
      dataIndex: 'cuota_por_unidad',
      render: (v: string | null) => <span className="metric-value">{formatoMonto(v)}</span>,
    },
    {
      title: '',
      key: 'acciones',
      render: (_, f) => (
        <Button size="small" onClick={() => abrir(f)}>
          Editar
        </Button>
      ),
    },
  ]

  if (financiadoras.isLoading) return <Cargando />
  if (financiadoras.isError)
    return <ErrorCarga error={financiadoras.error} onReintentar={() => void financiadoras.refetch()} />

  return (
    <div className="bento-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="eyebrow">Financiadoras</span>
        <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => abrir(null)}>
          Nueva financiadora
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={financiadoras.data ?? []}
        columns={columnas}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editando ? 'Editar financiadora' : 'Nueva financiadora'}
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        onOk={() => void onGuardar()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={crear.isPending || actualizar.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="monto_por_unidad" label="Monto por unidad (USD)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="plazo_meses" label="Plazo (meses)">
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
          <Form.Item name="tea" label="TEA (decimal, ej. 0.12)">
            <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.0001} />
          </Form.Item>
          <Form.Item name="cuota_por_unidad" label="Cuota por unidad (USD)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="es_default" label="Financiadora por defecto" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
