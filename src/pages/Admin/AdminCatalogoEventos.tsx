import { useState } from 'react'
import { App, Button, Form, Input, Modal, Select, Switch, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  useActualizarCatalogoEvento,
  useCatalogoEventos,
  useCrearCatalogoEvento,
} from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { CatalogoEvento, EstadoOportunidad } from '@/types'
import { ETAPAS_PIPELINE } from '@/types'
import { ETIQUETA_ETAPA } from '@/utils/etiquetas'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { PositivoTag, NeutralTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

interface FormValues {
  nombre: string
  etapa_asociada?: EstadoOportunidad | null
  dispara_cambio_estado: boolean
  estado_destino?: EstadoOportunidad | null
  es_recomendado: boolean
  es_hito_prospeccion: boolean
}

export function AdminCatalogoEventos() {
  const { message } = App.useApp()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<CatalogoEvento | null>(null)
  const [form] = Form.useForm<FormValues>()
  const dispara = Form.useWatch('dispara_cambio_estado', form)

  const catalogo = useCatalogoEventos()
  const crear = useCrearCatalogoEvento()
  const actualizar = useActualizarCatalogoEvento()

  const abrir = (c: CatalogoEvento | null) => {
    setEditando(c)
    if (c) {
      form.setFieldsValue({
        nombre: c.nombre,
        etapa_asociada: c.etapa_asociada,
        dispara_cambio_estado: c.dispara_cambio_estado,
        estado_destino: c.estado_destino,
        es_recomendado: c.es_recomendado,
        es_hito_prospeccion: c.es_hito_prospeccion,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        dispara_cambio_estado: false,
        es_recomendado: false,
        es_hito_prospeccion: false,
      })
    }
    setModalAbierto(true)
  }

  const onGuardar = async () => {
    const v = await form.validateFields()
    const input = {
      nombre: v.nombre,
      etapa_asociada: v.etapa_asociada ?? null,
      dispara_cambio_estado: v.dispara_cambio_estado,
      estado_destino: v.dispara_cambio_estado ? (v.estado_destino ?? null) : null,
      es_recomendado: v.es_recomendado,
      es_hito_prospeccion: v.es_hito_prospeccion,
    }
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, input })
        message.success('Evento actualizado')
      } else {
        await crear.mutateAsync(input)
        message.success('Evento creado')
      }
      setModalAbierto(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar el evento'))
    }
  }

  const columnas: ColumnsType<CatalogoEvento> = [
    { title: 'Nombre', dataIndex: 'nombre', render: (n: string) => <span style={{ fontWeight: 600 }}>{n}</span> },
    {
      title: 'Etapa asociada',
      dataIndex: 'etapa_asociada',
      render: (e: EstadoOportunidad | null) => (e ? ETIQUETA_ETAPA[e] : '—'),
    },
    {
      title: 'Dispara cambio',
      dataIndex: 'dispara_cambio_estado',
      render: (v: boolean, c) =>
        v ? (
          <PositivoTag>Sí → {c.estado_destino ? ETIQUETA_ETAPA[c.estado_destino] : '?'}</PositivoTag>
        ) : (
          <NeutralTag>No</NeutralTag>
        ),
    },
    {
      title: 'Recomendado',
      dataIndex: 'es_recomendado',
      render: (v: boolean) => (v ? 'Sí' : 'No'),
    },
    {
      title: 'Hito prospección',
      dataIndex: 'es_hito_prospeccion',
      render: (v: boolean) => (v ? 'Sí' : 'No'),
    },
    {
      title: '',
      key: 'acciones',
      render: (_, c) => (
        <Button size="small" onClick={() => abrir(c)}>
          Editar
        </Button>
      ),
    },
  ]

  if (catalogo.isLoading) return <Cargando />
  if (catalogo.isError) return <ErrorCarga error={catalogo.error} onReintentar={() => void catalogo.refetch()} />

  return (
    <div className="bento-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="eyebrow">Catálogo de eventos</span>
        <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => abrir(null)}>
          Nuevo evento
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={catalogo.data ?? []}
        columns={columnas}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editando ? 'Editar evento del catálogo' : 'Nuevo evento del catálogo'}
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
          <Form.Item name="etapa_asociada" label="Etapa asociada">
            <Select
              allowClear
              options={ETAPAS_PIPELINE.map((e) => ({ value: e, label: ETIQUETA_ETAPA[e] }))}
            />
          </Form.Item>
          <Form.Item name="dispara_cambio_estado" label="Dispara cambio de estado" valuePropName="checked">
            <Switch />
          </Form.Item>
          {dispara && (
            <Form.Item
              name="estado_destino"
              label="Estado destino"
              rules={[{ required: true, message: 'Requerido si dispara cambio' }]}
            >
              <Select options={ETAPAS_PIPELINE.map((e) => ({ value: e, label: ETIQUETA_ETAPA[e] }))} />
            </Form.Item>
          )}
          <Form.Item name="es_recomendado" label="Recomendado para su etapa" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="es_hito_prospeccion" label="Es hito de prospección" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
