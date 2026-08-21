import { useMemo, useState } from 'react'
import { Badge, Button, Input, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import {
  useAuthStore,
  ROLES_ADMIN,
  ROLES_APOYO,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SUPERVISION,
  tieneRol,
} from '@/store/authStore'
import { SEGMENTOS, type EmpresaListItem, type EstadoCartera, type Segmento } from '@/types'
import { ETIQUETA_CARTERA, ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'
import { CarteraTag, NeutralTag } from '@/components/EstadoTag'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import { NuevaEmpresaModal } from '@/components/NuevaEmpresaModal'
import { EliminarEmpresaModal } from '@/components/EliminarEmpresaModal'
import { LiberarEmpresaModal } from './LiberarEmpresaModal'
import {
  FiltrosCarteraDrawer,
  type ClaveEstadoCartera,
  type FiltrosCartera,
} from './FiltrosCarteraDrawer'

/**
 * Opciones de estado de la Cartera. Alimentan a la vez la barra de tabs y el
 * select del panel de filtros: son el mismo control renderizado dos veces, así
 * que no pueden desincronizarse.
 * "Cartera Maestra" se añade aparte, solo para los roles que la ven.
 */
const OPCIONES_ESTADO: { value: ClaveEstadoCartera; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'no_contactado', label: ETIQUETA_CARTERA.no_contactado },
  { value: 'prospeccion', label: ETIQUETA_CARTERA.prospeccion },
  { value: 'oportunidad_activa', label: ETIQUETA_CARTERA.oportunidad_activa },
  { value: 'cliente', label: ETIQUETA_CARTERA.cliente },
  { value: 'no_interesado', label: ETIQUETA_CARTERA.no_interesado },
  { value: 'no_aplica', label: ETIQUETA_CARTERA.no_aplica },
]

const OPCION_MAESTRA: { value: ClaveEstadoCartera; label: string } = {
  value: 'maestra',
  label: 'Cartera Maestra',
}

/**
 * Lee y valida `?estado=`. Todo lo que no sea una clave conocida cae a 'todas',
 * igual que 'maestra' pedida por un rol que no la ve: el querystring lo escribe
 * el usuario y puede traer cualquier cosa.
 */
function leerEstado(crudo: string | null, veCarteraMaestra: boolean): ClaveEstadoCartera {
  if (crudo === null) return 'todas'
  if (crudo === 'maestra') return veCarteraMaestra ? 'maestra' : 'todas'
  const opcion = OPCIONES_ESTADO.find((o) => o.value === crudo)
  return opcion?.value ?? 'todas'
}

/** Lee un entero positivo del querystring; `undefined` si no lo es. */
function leerEnteroPositivo(crudo: string | null): number | undefined {
  if (crudo === null) return undefined
  const n = Number(crudo)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/** Lee y valida `?segmento=` contra el enum. */
function leerSegmento(crudo: string | null): Segmento | undefined {
  return SEGMENTOS.find((s) => s === crudo)
}

/** Estado completo de filtrado de la pantalla, tal y como vive en la URL. */
interface EstadoUrl {
  q: string
  estado: ClaveEstadoCartera
  vendedor?: number
  segmento?: Segmento
  page: number
}

export function CarteraPage() {
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  // El backend solo acepta `id_vendedor` de admin/gerencia/jdv, y `GET /empleados`
  // tiene esos mismos roles: para el resto no hay ni filtro ni lista que mostrar.
  const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)

  /* El querystring es la ÚNICA fuente de verdad del filtrado de esta pantalla.
     Antes solo `?q=` vivía aquí y el tab y la página estaban en useState: al
     refrescar se perdía medio estado y un link compartido no reproducía lo que
     el otro veía. */
  const [searchParams, setSearchParams] = useSearchParams()
  const busqueda = searchParams.get('q') ?? ''
  const estado = leerEstado(searchParams.get('estado'), veCarteraMaestra)
  const segmento = leerSegmento(searchParams.get('segmento'))
  const pagina = leerEnteroPositivo(searchParams.get('page')) ?? 1

  /* El filtro de vendedor se anula EN LECTURA en dos casos, no solo al escribir
     la URL: quien pega `?estado=maestra&vendedor=3` o `?vendedor=3` sin ser
     supervisión se saltaría cualquier invariante puesta solo en la escritura.
     Anularlo aquí lo apaga de una vez en la query, el badge, el chip y el panel. */
  const vendedorCrudo = leerEnteroPositivo(searchParams.get('vendedor'))
  const idVendedor = estado === 'maestra' || !esSupervision ? undefined : vendedorCrudo

  // Client state puro: apertura de modales y del panel
  const [modalNueva, setModalNueva] = useState(false)
  const [panelFiltros, setPanelFiltros] = useState(false)
  const [aLiberar, setALiberar] = useState<{ id: number; razon_social: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; razon_social: string } | null>(null)

  const opcionesEstado = veCarteraMaestra ? [...OPCIONES_ESTADO, OPCION_MAESTRA] : OPCIONES_ESTADO

  // Misma queryKey que usa el panel: TanStack Query deduplica, no hay petición extra.
  const vendedores = useVendedoresAsignables(esSupervision)

  /**
   * Único punto de escritura del querystring. Aplica dos invariantes que, si se
   * dejaran a cada llamador, se olvidarían tarde o temprano:
   *  1. En la Cartera Maestra no hay vendedor asignado → nunca se filtra por él.
   *  2. Cualquier cambio que no sea de página vuelve a la página 1: quedarse en
   *     la página 7 de un listado que ahora tiene 2 devuelve una tabla vacía.
   * Los valores por defecto no se escriben, para que /cartera siga siendo limpio.
   * `replace` evita una entrada de historial por cada tecleo.
   */
  const escribirUrl = (cambios: Partial<EstadoUrl>) => {
    const siguiente: EstadoUrl = {
      q: busqueda,
      estado,
      vendedor: idVendedor,
      segmento,
      page: pagina,
      ...cambios,
    }
    if (siguiente.estado === 'maestra') siguiente.vendedor = undefined
    if (cambios.page === undefined) siguiente.page = 1

    const params: Record<string, string> = {}
    if (siguiente.q.trim()) params.q = siguiente.q.trim()
    if (siguiente.estado !== 'todas') params.estado = siguiente.estado
    if (siguiente.vendedor !== undefined) params.vendedor = String(siguiente.vendedor)
    if (siguiente.segmento !== undefined) params.segmento = siguiente.segmento
    if (siguiente.page !== 1) params.page = String(siguiente.page)
    setSearchParams(params, { replace: true })
  }

  /* Identidad estable: es la prop `valor` del drawer, que la usa como dependencia
     de su useEffect de inicialización. Un objeto nuevo en cada render lo haría
     reinicializar el borrador continuamente. */
  const filtrosAplicados = useMemo<FiltrosCartera>(
    () => ({ estado, idVendedor, segmento }),
    [estado, idVendedor, segmento],
  )

  // El estado ya se ve permanentemente como tab activo: contarlo aquí sería
  // ruido. El badge cuenta solo lo que de otro modo quedaría invisible.
  const totalFiltros = (idVendedor !== undefined ? 1 : 0) + (segmento !== undefined ? 1 : 0)
  const vendedorFiltrado = (vendedores.data ?? []).find((v) => v.id === idVendedor)

  const empresas = useEmpresas({
    q: busqueda.trim() || undefined,
    estado_cartera: estado === 'todas' || estado === 'maestra' ? undefined : estado,
    // Ya viene anulado arriba si el rol no puede filtrar por vendedor: ocultar el
    // campo es UX, el que decide qué se envía es este derivado.
    id_vendedor: idVendedor,
    segmento,
    page: pagina,
    // P7 confirmado: por defecto el backend MEZCLA cartera maestra con el resto
    // para gerencia/admin. Para que los tabs normales no incluyan las empresas
    // reservadas, gerencia/admin deben enviar cartera_maestra=false explícito
    // ahí; en el tab Cartera Maestra, true. Otros roles nunca ven mezcla
    // (el backend ya excluye la cartera maestra para ellos, §3.4).
    ...(veCarteraMaestra ? { cartera_maestra: estado === 'maestra' } : {}),
  })

  const columnas: ColumnsType<EmpresaListItem> = [
    {
      title: 'Empresa',
      key: 'empresa',
      fixed: 'left',
      width: 220,
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: 420 }}>
          <Input.Search
            placeholder="Buscar por razón social o RUC"
            allowClear
            style={{ flex: 1, minWidth: 200 }}
            defaultValue={busqueda}
            key={busqueda}
            onSearch={(q) => escribirUrl({ q })}
            onChange={(e) => {
              if (e.target.value === '') escribirUrl({ q: '' })
            }}
          />
          {!esRolDeApoyo && (
            <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => setModalNueva(true)}>
              Nueva empresa
            </Button>
          )}
        </div>
      </div>

      {/* El botón vive en la barra de tabs (`tabBarExtraContent`) en vez de en la
          cabecera: así queda pegado al control de estado con el que se combina, y
          en móvil los tabs siguen scrolleando mientras el botón queda fijo. */}
      <Tabs
        activeKey={estado}
        onChange={(clave) => escribirUrl({ estado: clave as ClaveEstadoCartera })}
        items={opcionesEstado.map((o) => ({ key: o.value, label: o.label }))}
        tabBarExtraContent={{
          right: (
            <Badge count={totalFiltros} size="small">
              <Button icon={<Icono nombre="filter_list" tamano={18} />} onClick={() => setPanelFiltros(true)}>
                Filtros
              </Button>
            </Badge>
          ),
        }}
      />

      {totalFiltros > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          {idVendedor !== undefined && (
            <Tag closable onClose={() => escribirUrl({ vendedor: undefined })}>
              Vendedor: {vendedorFiltrado ? nombreCompleto(vendedorFiltrado) : `#${idVendedor}`}
            </Tag>
          )}
          {segmento !== undefined && (
            <Tag closable onClose={() => escribirUrl({ segmento: undefined })}>
              Segmento: {ETIQUETA_SEGMENTO[segmento]}
            </Tag>
          )}
          <Button
            type="link"
            size="small"
            style={{ paddingInline: 0 }}
            onClick={() => escribirUrl({ vendedor: undefined, segmento: undefined })}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {empresas.isLoading ? (
        <Cargando />
      ) : empresas.isError ? (
        <ErrorCarga error={empresas.error} onReintentar={() => void empresas.refetch()} />
      ) : (
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            dataSource={empresas.data?.data ?? []}
            columns={
              estado === 'maestra' ? columnasMaestra : esAdmin ? [...columnas, columnaEliminar] : columnas
            }
            size="middle"
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText:
                totalFiltros > 0
                  ? 'Ninguna empresa coincide con los filtros aplicados'
                  : 'Sin empresas',
            }}
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
              onChange: (page) => escribirUrl({ page }),
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

      <FiltrosCarteraDrawer
        open={panelFiltros}
        onClose={() => setPanelFiltros(false)}
        valor={filtrosAplicados}
        onAplicar={(f) =>
          escribirUrl({ estado: f.estado, vendedor: f.idVendedor, segmento: f.segmento })
        }
        opcionesEstado={opcionesEstado}
        mostrarVendedor={esSupervision}
        vendedores={vendedores.data ?? []}
        cargandoVendedores={vendedores.isLoading}
      />
    </div>
  )
}
