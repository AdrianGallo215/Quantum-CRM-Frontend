import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAprobarMetaVenta, useMetasVenta, useRechazarMetaVenta } from '@/hooks/useMetasVenta'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EstadoMeta, MetaVenta } from '@/types'
import { ETIQUETA_ESTADO_META } from '@/utils/etiquetas'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { MetaVentaFormModal } from './MetaVentaFormModal'

const COLOR_ESTADO: Record<EstadoMeta, string> = {
  propuesta: 'gold',
  aprobada: 'green',
  rechazada: 'red',
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_DISPONIBLES = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1]

/** Bandeja de aprobación de metas, usada solo en /gerencia (roles gerencia/admin). */
export function BandejaMetasVenta() {
  const { message } = App.useApp()
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL)
  const [pagina, setPagina] = useState(1)
  const [aRechazar, setARechazar] = useState<MetaVenta | null>(null)
  const [aEditar, setAEditar] = useState<MetaVenta | null>(null)
  const [creando, setCreando] = useState(false)
  const [formRechazar] = Form.useForm<{ motivo: string }>()

  const vendedores = useVendedoresAsignables()
  const metas = useMetasVenta({
    anio,
    page: pagina,
    ...(tab === 'pendientes' ? { estado: 'propuesta' as const } : {}),
  })
  const aprobar = useAprobarMetaVenta()
  const rechazar = useRechazarMetaVenta()

  const onAprobar = (m: MetaVenta) => {
    aprobar.mutate(m.id, {
      onSuccess: () => message.success('Meta aprobada'),
      onError: (e) => {
        if (codigoDeError(e) === 'META_YA_RESUELTA') {
          message.info('Otro usuario ya resolvió esta meta — bandeja actualizada')
          return
        }
        message.error(mensajeDeError(e, 'No se pudo aprobar la meta'))
      },
    })
  }

  const onRechazar = async () => {
    if (!aRechazar) return
    const { motivo } = await formRechazar.validateFields()
    rechazar.mutate(
      { id: aRechazar.id, motivo },
      {
        onSuccess: () => {
          message.success('Meta rechazada')
          formRechazar.resetFields()
          setARechazar(null)
        },
        onError: (e) => {
          if (codigoDeError(e) === 'META_YA_RESUELTA') {
            message.info('Otro usuario ya resolvió esta meta — bandeja actualizada')
            formRechazar.resetFields()
            setARechazar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo rechazar la meta'))
        },
      },
    )
  }

  const columnasBase: ColumnsType<MetaVenta> = [
    { title: 'Vendedor', key: 'empleado', render: (_, m) => nombreCompleto(m.empleado) },
    { title: 'Año', dataIndex: 'anio' },
    { title: 'Meta anual', dataIndex: 'meta_anual', render: (v: number) => `${v} unidades` },
    { title: 'Propuesto por', key: 'propuesto_por', render: (_, m) => nombreCompleto(m.propuesto_por) },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
  ]

  const columnasPendientes: ColumnsType<MetaVenta> = [
    ...columnasBase,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, m) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAEditar(m)}>
            Editar y aprobar
          </Button>
          <Popconfirm
            title={`¿Aprobar la meta de ${nombreCompleto(m.empleado)} para ${m.anio}?`}
            okText="Aprobar"
            cancelText="Cancelar"
            onConfirm={() => onAprobar(m)}
          >
            <Button type="primary" size="small" loading={aprobar.isPending}>
              Aprobar
            </Button>
          </Popconfirm>
          <Button danger size="small" onClick={() => setARechazar(m)}>
            Rechazar
          </Button>
        </span>
      ),
    },
  ]

  const columnasHistorial: ColumnsType<MetaVenta> = [
    ...columnasBase,
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: EstadoMeta) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_META[e]}</Tag>,
    },
    { title: 'Motivo de rechazo', dataIndex: 'motivo_rechazo', render: (m: string | null) => m ?? '—' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => {
            setTab(k as 'pendientes' | 'historial')
            setPagina(1)
          }}
          items={[
            { key: 'pendientes', label: 'Pendientes' },
            { key: 'historial', label: 'Historial' },
          ]}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select
            value={anio}
            style={{ width: 110 }}
            onChange={(v) => {
              setAnio(v)
              setPagina(1)
            }}
            options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
          />
          <Button type="primary" onClick={() => setCreando(true)}>
            Crear meta
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={metas.isLoading}
        dataSource={metas.data?.data ?? []}
        columns={tab === 'pendientes' ? columnasPendientes : columnasHistorial}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: pagina,
          total: metas.data?.meta?.total ?? 0,
          pageSize: metas.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <Modal
        title="Rechazar meta"
        open={aRechazar !== null}
        onCancel={() => {
          formRechazar.resetFields()
          setARechazar(null)
        }}
        onOk={() => void onRechazar()}
        okText="Rechazar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={rechazar.isPending}
        destroyOnHidden
      >
        <Form form={formRechazar} layout="vertical" requiredMark={false}>
          <Form.Item
            name="motivo"
            label="Motivo del rechazo (se notificará al JDV)"
            rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <MetaVentaFormModal
        open={aEditar !== null}
        onClose={() => setAEditar(null)}
        modo="editar"
        tituloModal="Editar y aprobar meta"
        textoBoton="Guardar y aprobar"
        empleadosDisponibles={vendedores.data ?? []}
        metaAEditar={aEditar}
      />

      <MetaVentaFormModal
        open={creando}
        onClose={() => setCreando(false)}
        modo="nueva"
        tituloModal="Crear meta de venta"
        textoBoton="Crear meta"
        empleadosDisponibles={vendedores.data ?? []}
      />
    </>
  )
}
