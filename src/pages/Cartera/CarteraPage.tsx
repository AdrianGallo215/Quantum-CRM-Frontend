import { useState } from 'react'
import { Button, Input, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useAuthStore, ROLES_ADMIN, ROLES_BANDEJA_GERENCIA, tieneRol } from '@/store/authStore'
import type { EmpresaListItem, EstadoCartera } from '@/types'
import { ETIQUETA_CARTERA } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'
import { CarteraTag, NeutralTag } from '@/components/EstadoTag'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import { NuevaEmpresaModal } from '@/components/NuevaEmpresaModal'
import { EliminarEmpresaModal } from '@/components/EliminarEmpresaModal'
import { LiberarEmpresaModal } from './LiberarEmpresaModal'

const TABS: { key: string; estado?: EstadoCartera }[] = [
  { key: 'todas' },
  { key: 'no_contactado', estado: 'no_contactado' },
  { key: 'prospeccion', estado: 'prospeccion' },
  { key: 'oportunidad_activa', estado: 'oportunidad_activa' },
  { key: 'cliente', estado: 'cliente' },
  { key: 'no_interesado', estado: 'no_interesado' },
  { key: 'no_aplica', estado: 'no_aplica' },
]

export function CarteraPage() {
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  // El buscador global del topbar navega aquí con ?q=… — leerlo del querystring
  // es lo que hace que esa búsqueda llegue a alguna parte.
  const [searchParams, setSearchParams] = useSearchParams()
  const busqueda = searchParams.get('q') ?? ''

  // Client state puro: tab activo, página, modal
  const [tab, setTab] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [modalNueva, setModalNueva] = useState(false)
  const [aLiberar, setALiberar] = useState<{ id: number; razon_social: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; razon_social: string } | null>(null)

  const tabs = veCarteraMaestra ? [...TABS, { key: 'cartera_maestra' as const }] : TABS
  const esTabMaestra = tab === 'cartera_maestra'

  // Cambiar de tab o de búsqueda reinicia la paginación: quedarse en la página
  // 7 de un listado que ahora tiene 2 páginas devuelve una tabla vacía.
  const cambiarTab = (nuevo: string) => {
    setTab(nuevo)
    setPagina(1)
  }
  const cambiarBusqueda = (q: string) => {
    // `replace` para no llenar el historial con una entrada por búsqueda.
    setSearchParams(q.trim() ? { q: q.trim() } : {}, { replace: true })
    setPagina(1)
  }

  const estadoActivo = TABS.find((t) => t.key === tab)?.estado
  const empresas = useEmpresas({
    q: busqueda.trim() || undefined,
    estado_cartera: esTabMaestra ? undefined : estadoActivo,
    page: pagina,
    // P7 confirmado: por defecto el backend MEZCLA cartera maestra con el resto
    // para gerencia/admin. Para que los tabs normales no incluyan las empresas
    // reservadas, gerencia/admin deben enviar cartera_maestra=false explícito
    // ahí; en el tab Cartera Maestra, true. Otros roles nunca ven mezcla
    // (el backend ya excluye la cartera maestra para ellos, §3.4).
    ...(veCarteraMaestra ? { cartera_maestra: esTabMaestra } : {}),
  })

  const columnas: ColumnsType<EmpresaListItem> = [
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_, e) => (
        <div>
          <div style={{ fontWeight: 600 }}>{e.razon_social}</div>
          <div className="metric-value" style={{ fontSize: 12, color: '#747781' }}>
            RUC {e.ruc}
          </div>
        </div>
      ),
    },
    { title: 'Distrito', dataIndex: 'distrito', render: (d: string | null) => d ?? '—' },
    {
      title: 'Segmentos',
      dataIndex: 'segmentos',
      render: (segs: string[]) => (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {segs.map((s) => (
            <NeutralTag key={s}>{s}</NeutralTag>
          ))}
        </span>
      ),
    },
    {
      title: 'Vendedor',
      dataIndex: 'vendedor',
      render: (v: EmpresaListItem['vendedor']) => nombreCompleto(v),
    },
    {
      title: 'Contactos',
      dataIndex: 'contactos_count',
      align: 'center',
      render: (n: number) => <span className="metric-value">{n}</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado_cartera',
      render: (estado: EstadoCartera) => <CarteraTag estado={estado} />,
    },
  ]

  const columnasMaestra: ColumnsType<EmpresaListItem> = [
    ...columnas.filter((c) => c.key !== 'vendedor' && !('dataIndex' in c && c.dataIndex === 'vendedor')),
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, e) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            onClick={(ev) => {
              ev.stopPropagation() // no navegar al detalle al clickear el botón
              setALiberar({ id: e.id, razon_social: e.razon_social })
            }}
          >
            Liberar
          </Button>
          {esAdmin && (
            <Button
              size="small"
              danger
              onClick={(ev) => {
                ev.stopPropagation()
                setAEliminar({ id: e.id, razon_social: e.razon_social })
              }}
            >
              Eliminar
            </Button>
          )}
        </div>
      ),
    },
  ]

  const columnaEliminar: ColumnsType<EmpresaListItem>[number] = {
    title: 'Acciones',
    key: 'acciones',
    render: (_, e) => (
      <Button
        size="small"
        danger
        onClick={(ev) => {
          ev.stopPropagation()
          setAEliminar({ id: e.id, razon_social: e.razon_social })
        }}
      >
        Eliminar
      </Button>
    ),
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            Cartera
          </Typography.Title>
          <span style={{ color: '#444750' }}>Empresas de tu cartera por estado</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input.Search
            placeholder="Buscar por razón social o RUC"
            allowClear
            style={{ width: 300 }}
            defaultValue={busqueda}
            key={busqueda}
            onSearch={cambiarBusqueda}
            onChange={(e) => {
              if (e.target.value === '') cambiarBusqueda('')
            }}
          />
          <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => setModalNueva(true)}>
            Nueva empresa
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={tab}
        onChange={cambiarTab}
        items={tabs.map((t) => ({
          key: t.key,
          label:
            t.key === 'cartera_maestra' ? 'Cartera Maestra' : t.estado ? ETIQUETA_CARTERA[t.estado] : 'Todas',
        }))}
      />

      {empresas.isLoading ? (
        <Cargando />
      ) : empresas.isError ? (
        <ErrorCarga error={empresas.error} onReintentar={() => void empresas.refetch()} />
      ) : (
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            dataSource={empresas.data?.data ?? []}
            columns={esTabMaestra ? columnasMaestra : esAdmin ? [...columnas, columnaEliminar] : columnas}
            size="middle"
            onRow={(e) => ({
              onClick: () => navigate(`/empresas/${e.id}`),
              style: { cursor: 'pointer' },
            })}
            /* Paginación del SERVIDOR: `current` y `onChange` son obligatorios.
               Sin ellos AntD paginaba en cliente sobre los 20 registros ya
               cargados mientras dibujaba los botones con el total real, así que
               pulsar "2" mostraba una tabla vacía. */
            pagination={{
              current: pagina,
              total: empresas.data?.meta?.total ?? 0,
              pageSize: empresas.data?.meta?.per_page ?? 20,
              showSizeChanger: false,
              onChange: setPagina,
              showTotal: (total) => `${total} empresa${total === 1 ? '' : 's'}`,
            }}
          />
        </div>
      )}

      <NuevaEmpresaModal
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        onCreada={(e) => navigate(`/empresas/${e.id}`)}
      />
      <LiberarEmpresaModal empresa={aLiberar} onClose={() => setALiberar(null)} />
      <EliminarEmpresaModal empresa={aEliminar} onClose={() => setAEliminar(null)} />
    </div>
  )
}
