import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { useAprobarSolicitud, useDenegarSolicitud, useSolicitudes } from '@/hooks/useSolicitudes'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { SolicitudDetalleModal } from './SolicitudDetalleModal'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

function rutaEntidad(s: Solicitud): string {
  return s.entidad_tipo === 'oportunidad' ? `/oportunidades/${s.entidad_id}` : `/empresas/${s.entidad_id}`
}

/**
 * Bandeja de aprobación (contrato §5), usada solo en /gerencia (roles
 * gerencia/admin) — el backend filtra el alcance por rol y ahí el 100% de
 * lo visible es responsabilidad del usuario. La vista de jdv vive fusionada
 * en /solicitudes (Task 12, decisión D1), no en este componente.
 */
export function BandejaSolicitudes() {
  const { message, notification } = App.useApp()
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const [pagina, setPagina] = useState(1)
  const [aDenegar, setADenegar] = useState<Solicitud | null>(null)
  const [aVerDetalle, setAVerDetalle] = useState<Solicitud | null>(null)
  const [formDenegar] = Form.useForm<{ motivo: string }>()

  const solicitudes = useSolicitudes(
    tab === 'pendientes' ? { estado: 'pendiente', page: pagina } : { page: pagina },
  )
  const aprobar = useAprobarSolicitud()
  const denegar = useDenegarSolicitud()

  const onAprobar = (s: Solicitud) => {
    aprobar.mutate(s.id, {
      onSuccess: () => message.success('Solicitud aprobada — el cambio ya está aplicado'),
      onError: (e) => {
        const codigo = codigoDeError(e)
        if (codigo === 'SOLICITUD_YA_RESUELTA') {
          message.info('Otro aprobador ya resolvió esta solicitud — bandeja actualizada')
          return // el hook ya invalida la bandeja en onError
        }
        if (codigo === 'SOLICITUD_NO_APLICABLE') {
          notification.warning({
            message: 'La solicitud ya no aplica',
            description:
              'La entidad cambió y el efecto ya no puede aplicarse (p. ej. la oportunidad se cerró). Deniégala manualmente indicando el motivo.',
          })
          return
        }
        message.error(mensajeDeError(e, 'No se pudo aprobar la solicitud'))
      },
    })
  }

  const onDenegar = async () => {
    if (!aDenegar) return
    const { motivo } = await formDenegar.validateFields()
    denegar.mutate(
      { id: aDenegar.id, motivo },
      {
        onSuccess: () => {
          message.success('Solicitud denegada')
          formDenegar.resetFields()
          setADenegar(null)
        },
        onError: (e) => {
          if (codigoDeError(e) === 'SOLICITUD_YA_RESUELTA') {
            message.info('Otro aprobador ya resolvió esta solicitud — bandeja actualizada')
            formDenegar.resetFields()
            setADenegar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo denegar la solicitud'))
        },
      },
    )
  }

  const columnasBase: ColumnsType<Solicitud> = [
    {
      title: 'Solicitante',
      key: 'solicitante',
      render: (_, s) => nombreCompleto(s.solicitante),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      render: (t: Solicitud['tipo']) => <Tag>{ETIQUETA_TIPO_SOLICITUD[t]}</Tag>,
    },
    {
      title: 'Entidad',
      key: 'entidad',
      render: (_, s) => <Link to={rutaEntidad(s)}>{s.entidad_descripcion}</Link>,
    },
    {
      title: 'Cambio solicitado',
      key: 'payload',
      render: (_, s) => descripcionPayloadSolicitud(s),
    },
    { title: 'Motivo', dataIndex: 'motivo' },
    {
      title: 'Fecha',
      dataIndex: 'created_at',
      render: (f: string) => formatoFecha(f),
    },
  ]

  const columnasPendientes: ColumnsType<Solicitud> = [
    ...columnasBase,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAVerDetalle(s)}>
            Ver detalle
          </Button>
          <Popconfirm
            title={`¿Aprobar y aplicar "${descripcionPayloadSolicitud(s)}"?`}
            okText="Aprobar"
            cancelText="Cancelar"
            onConfirm={() => onAprobar(s)}
          >
            <Button type="primary" size="small" loading={aprobar.isPending}>
              Aprobar
            </Button>
          </Popconfirm>
          <Button danger size="small" onClick={() => setADenegar(s)}>
            Denegar
          </Button>
        </span>
      ),
    },
  ]

  const columnasHistorial: ColumnsType<Solicitud> = [
    ...columnasBase,
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: Solicitud['estado']) => (
        <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_SOLICITUD[e]}</Tag>
      ),
    },
    {
      title: 'Resolutor',
      key: 'resolutor',
      render: (_, s) => (s.resolutor ? nombreCompleto(s.resolutor) : '—'),
    },
    {
      title: 'Resuelta',
      dataIndex: 'resolved_at',
      render: (f: string | null) => (f ? formatoFecha(f) : '—'),
    },
    {
      title: 'Motivo de denegación',
      dataIndex: 'motivo_resolucion',
      render: (m: string | null) => m ?? '—',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <Button size="small" onClick={() => setAVerDetalle(s)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <>
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
      <Table
        rowKey="id"
        loading={solicitudes.isLoading}
        dataSource={solicitudes.data?.data ?? []}
        columns={tab === 'pendientes' ? columnasPendientes : columnasHistorial}
        pagination={{
          current: pagina,
          total: solicitudes.data?.meta?.total ?? 0,
          pageSize: solicitudes.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <Modal
        title="Denegar solicitud"
        open={aDenegar !== null}
        onCancel={() => {
          formDenegar.resetFields()
          setADenegar(null)
        }}
        onOk={() => void onDenegar()}
        okText="Denegar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={denegar.isPending}
        destroyOnHidden
      >
        <Form form={formDenegar} layout="vertical" requiredMark={false}>
          <Form.Item
            name="motivo"
            label="Motivo de la denegación (se notificará al solicitante)"
            rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <SolicitudDetalleModal solicitud={aVerDetalle} onClose={() => setAVerDetalle(null)} />
    </>
  )
}
