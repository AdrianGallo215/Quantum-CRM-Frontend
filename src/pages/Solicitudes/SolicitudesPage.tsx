import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { useAprobarSolicitud, useDenegarSolicitud, useSolicitudes } from '@/hooks/useSolicitudes'
import { useAuthStore } from '@/store/authStore'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EstadoSolicitud, Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud, puedeResolverSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { SolicitudDetalleModal } from '@/components/SolicitudDetalleModal'
import { MisMetasEquipo } from '@/components/MisMetasEquipo'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

function rutaEntidad(s: Solicitud): string {
  return s.entidad_tipo === 'oportunidad' ? `/oportunidades/${s.entidad_id}` : `/empresas/${s.entidad_id}`
}

/**
 * "Solicitudes" — vista única para vendedor/analista/jdv (decisión D1,
 * confirmada 2026-07-16): fusiona la bandeja de aprobación del jdv (§5) y
 * "Mis solicitudes" (§6) en una sola tabla, porque el backend ya mezcla
 * ambos conjuntos para el rol jdv en GET /solicitudes sin filtros (§4.2).
 * Cada fila es accionable solo si el usuario es su rol_aprobador y sigue
 * pendiente — para vendedor/analista nunca ocurre, quedan en solo-lectura.
 */
export function SolicitudesPage() {
  const { message, notification } = App.useApp()
  const empleado = useAuthStore((s) => s.empleado)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoSolicitud | undefined>(undefined)
  const [pagina, setPagina] = useState(1)
  const [aDenegar, setADenegar] = useState<Solicitud | null>(null)
  const [aVerDetalle, setAVerDetalle] = useState<Solicitud | null>(null)
  const [formDenegar] = Form.useForm<{ motivo: string }>()

  const solicitudes = useSolicitudes({ estado: estadoFiltro, page: pagina })
  const aprobar = useAprobarSolicitud()
  const denegar = useDenegarSolicitud()

  const onAprobar = (s: Solicitud) => {
    aprobar.mutate(s.id, {
      onSuccess: () => message.success('Solicitud aprobada — el cambio ya está aplicado'),
      onError: (e) => {
        const codigo = codigoDeError(e)
        if (codigo === 'SOLICITUD_YA_RESUELTA') {
          message.info('Otro aprobador ya resolvió esta solicitud — lista actualizada')
          return
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
            message.info('Otro aprobador ya resolvió esta solicitud — lista actualizada')
            formDenegar.resetFields()
            setADenegar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo denegar la solicitud'))
        },
      },
    )
  }

  const columnas: ColumnsType<Solicitud> = [
    { title: 'Solicitante', key: 'solicitante', render: (_, s) => nombreCompleto(s.solicitante) },
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
    { title: 'Cambio solicitado', key: 'payload', render: (_, s) => descripcionPayloadSolicitud(s) },
    { title: 'Motivo', dataIndex: 'motivo' },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: Solicitud['estado']) => (
        <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_SOLICITUD[e]}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAVerDetalle(s)}>
            Ver detalle
          </Button>
          {puedeResolverSolicitud(s, empleado?.rol) && (
            <>
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
            </>
          )}
        </span>
      ),
    },
  ]

  const contenidoSolicitudes = (
    <>
      <Table
        rowKey="id"
        loading={solicitudes.isLoading}
        dataSource={solicitudes.data?.data ?? []}
        columns={columnas}
        scroll={{ x: 'max-content' }}
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

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            Solicitudes
          </Typography.Title>
          <span style={{ color: '#444750' }}>
            {empleado?.rol === 'jdv'
              ? 'Solicitudes que enviaste y las que tienes por aprobar'
              : 'Estado de tus solicitudes de aprobación'}
          </span>
        </div>
        <Select
          allowClear
          placeholder="Todos los estados"
          style={{ width: '100%', maxWidth: 260 }}
          value={estadoFiltro}
          onChange={(v) => {
            setEstadoFiltro(v)
            setPagina(1)
          }}
          options={(['pendiente', 'aprobada', 'denegada'] as const).map((e) => ({
            value: e,
            label: ETIQUETA_ESTADO_SOLICITUD[e],
          }))}
        />
      </div>

      {empleado?.rol === 'jdv' ? (
        <Tabs
          items={[
            { key: 'solicitudes', label: 'Solicitudes', children: contenidoSolicitudes },
            { key: 'metas', label: 'Metas de venta', children: <MisMetasEquipo /> },
          ]}
        />
      ) : (
        contenidoSolicitudes
      )}
    </div>
  )
}
