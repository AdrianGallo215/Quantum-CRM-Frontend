import { useEffect, useState } from 'react'
import { App, Button, Checkbox, Dropdown, Popconfirm, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { useEliminarOportunidad } from '@/hooks/useOportunidades'
import { mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_ADMIN, tieneRol } from '@/store/authStore'
import type { EstadoOportunidad, Oportunidad } from '@/types'
import { ETAPAS_PIPELINE } from '@/types/enums'
import { EtapaTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'
import { ETIQUETA_ETAPA } from '@/utils/etiquetas'
import {
  nombreCompleto,
  formatoMonto,
  formatoPorcentaje,
  formatoFecha,
  formatoFechaHora,
} from '@/utils/formato'
import { urlSegura } from '@/utils/url'

const CLAVE_SESION_COLUMNAS = 'quantum_pipeline_tabla_columnas'

/** Orden y unicidad de valores presentes en la data actual, para armar filtros dinámicos */
function valoresUnicos(oportunidades: Oportunidad[], obtener: (o: Oportunidad) => string): string[] {
  return Array.from(new Set(oportunidades.map(obtener))).sort((a, b) => a.localeCompare(b))
}

function compararTexto(a: string, b: string): number {
  return a.localeCompare(b)
}

function compararFecha(a: string | null, b: string | null): number {
  return (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0)
}

interface DefinicionColumna {
  key: string
  titulo: string
  visiblePorDefecto: boolean
  construir: (oportunidades: Oportunidad[]) => ColumnsType<Oportunidad>[number]
}

const DEFINICIONES: DefinicionColumna[] = [
  {
    key: 'id',
    titulo: 'Id',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Id',
      dataIndex: 'id',
      width: 70,
      sorter: (a, b) => a.id - b.id,
    }),
  },
  {
    key: 'nombre',
    titulo: 'Nombre de Oportunidad',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Nombre de Oportunidad',
      key: 'nombre',
      fixed: 'left',
      width: 220,
      render: (_, o) => o.modelo.codigo,
      sorter: (a, b) => compararTexto(a.modelo.codigo, b.modelo.codigo),
    }),
  },
  {
    key: 'vendedor',
    titulo: 'Vendedor Asignado',
    visiblePorDefecto: true,
    construir: (oportunidades) => ({
      title: 'Vendedor Asignado',
      key: 'vendedor',
      render: (_, o) => nombreCompleto(o.vendedor),
      sorter: (a, b) => compararTexto(nombreCompleto(a.vendedor), nombreCompleto(b.vendedor)),
      filters: valoresUnicos(oportunidades, (o) => nombreCompleto(o.vendedor)).map((v) => ({
        text: v,
        value: v,
      })),
      onFilter: (value, o) => nombreCompleto(o.vendedor) === value,
    }),
  },
  {
    key: 'empresa',
    titulo: 'Empresa',
    visiblePorDefecto: true,
    construir: (oportunidades) => ({
      title: 'Empresa',
      key: 'empresa',
      render: (_, o) => o.empresa.razon_social,
      sorter: (a, b) => compararTexto(a.empresa.razon_social, b.empresa.razon_social),
      filters: valoresUnicos(oportunidades, (o) => o.empresa.razon_social).map((v) => ({
        text: v,
        value: v,
      })),
      onFilter: (value, o) => o.empresa.razon_social === value,
    }),
  },
  {
    key: 'cantidad',
    titulo: 'Unidades',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Unidades',
      dataIndex: 'cantidad',
      align: 'center',
      sorter: (a, b) => a.cantidad - b.cantidad,
    }),
  },
  {
    key: 'monto_total',
    titulo: 'Monto Total',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Monto Total',
      dataIndex: 'monto_total',
      render: (v: Oportunidad['monto_total']) => formatoMonto(v),
      sorter: (a, b) => Number(a.monto_total) - Number(b.monto_total),
    }),
  },
  {
    key: 'estado',
    titulo: 'Etapa',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Etapa',
      dataIndex: 'estado',
      render: (estado: EstadoOportunidad) => <EtapaTag etapa={estado} />,
      sorter: (a, b) =>
        [...ETAPAS_PIPELINE, 'cerrado'].indexOf(a.estado) -
        [...ETAPAS_PIPELINE, 'cerrado'].indexOf(b.estado),
      filters: [...ETAPAS_PIPELINE, 'cerrado' as const].map((e) => ({
        text: ETIQUETA_ETAPA[e],
        value: e,
      })),
      onFilter: (value, o) => o.estado === value,
    }),
  },
  {
    key: 'notas',
    titulo: 'Notas',
    visiblePorDefecto: true,
    construir: () => ({
      title: 'Notas',
      dataIndex: 'notas',
      width: 240,
      ellipsis: true,
      render: (v: string | null) => (v ? <Tooltip title={v}>{v}</Tooltip> : '—'),
      sorter: (a, b) => compararTexto(a.notas ?? '', b.notas ?? ''),
    }),
  },
  // La columna "Persona Contacto" se eliminó: renderizaba '—' siempre porque el
  // DTO del listado (Oportunidad) no trae contactos — solo OportunidadDetalle.
  // Estaba visible por defecto, así que ocupaba ancho para no decir nada.
  {
    key: 'financiadora',
    titulo: 'Financiadora',
    visiblePorDefecto: false,
    construir: (oportunidades) => ({
      title: 'Financiadora',
      key: 'financiadora',
      render: (_, o) => o.financiadora?.nombre ?? '—',
      sorter: (a, b) => compararTexto(a.financiadora?.nombre ?? '', b.financiadora?.nombre ?? ''),
      filters: valoresUnicos(oportunidades, (o) => o.financiadora?.nombre ?? '—').map((v) => ({
        text: v,
        value: v,
      })),
      onFilter: (value, o) => (o.financiadora?.nombre ?? '—') === value,
    }),
  },
  {
    key: 'precio_unitario',
    titulo: 'Precio Unitario',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Precio Unitario',
      dataIndex: 'precio_unitario',
      render: (v: Oportunidad['precio_unitario']) => formatoMonto(v),
      sorter: (a, b) => Number(a.precio_unitario) - Number(b.precio_unitario),
    }),
  },
  {
    key: 'dcto',
    titulo: 'Descuento',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Descuento',
      dataIndex: 'dcto',
      render: (v: Oportunidad['dcto']) => formatoPorcentaje(v),
      sorter: (a, b) => Number(a.dcto) - Number(b.dcto),
    }),
  },
  {
    key: 'garantia',
    titulo: 'Garantía',
    visiblePorDefecto: false,
    construir: (oportunidades) => ({
      title: 'Garantía',
      dataIndex: 'garantia',
      render: (v: boolean) => (v ? 'Sí' : 'No'),
      sorter: (a, b) => Number(a.garantia) - Number(b.garantia),
      filters: valoresUnicos(oportunidades, (o) => (o.garantia ? 'Sí' : 'No')).map((v) => ({
        text: v,
        value: v,
      })),
      onFilter: (value, o) => (o.garantia ? 'Sí' : 'No') === value,
    }),
  },
  {
    key: 'finc_paralelo',
    titulo: 'Financiamiento Paralelo',
    visiblePorDefecto: false,
    construir: (oportunidades) => ({
      title: 'Financiamiento Paralelo',
      dataIndex: 'finc_paralelo',
      render: (v: boolean) => (v ? 'Sí' : 'No'),
      sorter: (a, b) => Number(a.finc_paralelo) - Number(b.finc_paralelo),
      filters: valoresUnicos(oportunidades, (o) => (o.finc_paralelo ? 'Sí' : 'No')).map((v) => ({
        text: v,
        value: v,
      })),
      onFilter: (value, o) => (o.finc_paralelo ? 'Sí' : 'No') === value,
    }),
  },
  {
    key: 'ficha_venta',
    titulo: 'Ficha de Venta',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Ficha de Venta',
      dataIndex: 'ficha_venta',
      render: (v: string | null) =>
        urlSegura(v) ? (
          <a
            href={urlSegura(v)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir ficha
          </a>
        ) : (
          '—'
        ),
      sorter: (a, b) => compararTexto(a.ficha_venta ?? '', b.ficha_venta ?? ''),
    }),
  },
  {
    key: 'motivo_cierre',
    titulo: 'Motivo de Cierre',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Motivo de Cierre',
      dataIndex: 'motivo_cierre',
      render: (v: string | null) => v ?? '—',
      sorter: (a, b) => compararTexto(a.motivo_cierre ?? '', b.motivo_cierre ?? ''),
    }),
  },
  {
    key: 'fecha_cierre_estimado',
    titulo: 'Fecha Cierre Estimado',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Fecha Cierre Estimado',
      dataIndex: 'fecha_cierre_estimado',
      render: (v: string | null) => formatoFecha(v),
      sorter: (a, b) => compararFecha(a.fecha_cierre_estimado, b.fecha_cierre_estimado),
    }),
  },
  {
    key: 'tareas_pendientes_count',
    titulo: 'Tareas Pendientes',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Tareas Pendientes',
      dataIndex: 'tareas_pendientes_count',
      align: 'center',
      sorter: (a, b) => a.tareas_pendientes_count - b.tareas_pendientes_count,
    }),
  },
  {
    key: 'eventos_pendientes_count',
    titulo: 'Eventos Pendientes',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Eventos Pendientes',
      dataIndex: 'eventos_pendientes_count',
      align: 'center',
      sorter: (a, b) => a.eventos_pendientes_count - b.eventos_pendientes_count,
    }),
  },
  {
    key: 'created_at',
    titulo: 'Creado',
    visiblePorDefecto: false,
    construir: () => ({
      title: 'Creado',
      dataIndex: 'created_at',
      render: (v: string) => formatoFechaHora(v),
      sorter: (a, b) => compararFecha(a.created_at, b.created_at),
    }),
  },
]

function columnasPorDefecto(): string[] {
  return DEFINICIONES.filter((d) => d.visiblePorDefecto).map((d) => d.key)
}

function leerColumnasGuardadas(): string[] {
  try {
    const guardado = sessionStorage.getItem(CLAVE_SESION_COLUMNAS)
    if (!guardado) return columnasPorDefecto()
    const claves = JSON.parse(guardado) as string[]
    const validas = new Set(DEFINICIONES.map((d) => d.key))
    const filtradas = claves.filter((k) => validas.has(k))
    return filtradas.length > 0 ? filtradas : columnasPorDefecto()
  } catch {
    return columnasPorDefecto()
  }
}

export function TablaOportunidades({ oportunidades }: { oportunidades: Oportunidad[] }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  const eliminar = useEliminarOportunidad()
  const [columnasActivas, setColumnasActivas] = useState<string[]>(leerColumnasGuardadas)

  useEffect(() => {
    sessionStorage.setItem(CLAVE_SESION_COLUMNAS, JSON.stringify(columnasActivas))
  }, [columnasActivas])

  const columnas: ColumnsType<Oportunidad> = DEFINICIONES.filter((d) =>
    columnasActivas.includes(d.key),
  ).map((d) => d.construir(oportunidades))

  if (esAdmin) {
    columnas.push({
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 80,
      render: (_, o) => (
        <Popconfirm
          title="¿Eliminar esta oportunidad?"
          description="Esta acción es irreversible."
          okText="Eliminar"
          okButtonProps={{ danger: true }}
          cancelText="Cancelar"
          onConfirm={() =>
            eliminar.mutate(
              { id: o.id, idEmpresa: o.id_empresa },
              {
                onSuccess: () => message.success('Oportunidad eliminada'),
                onError: (e) => message.error(mensajeDeError(e)),
              },
            )
          }
        >
          <button
            className="text-on-surface-variant hover:text-error"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </Popconfirm>
      ),
    })
  }

  return (
    <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
        <Dropdown
          trigger={['click']}
          popupRender={() => (
            <div
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              <Checkbox.Group
                value={columnasActivas}
                onChange={(v) => setColumnasActivas(v as string[])}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                options={DEFINICIONES.map((d) => ({ label: d.titulo, value: d.key }))}
              />
            </div>
          )}
        >
          <Button icon={<Icono nombre="view_column" tamano={18} />}>Columnas</Button>
        </Dropdown>
      </div>
      <Table
        rowKey="id"
        dataSource={oportunidades}
        columns={columnas}
        size="middle"
        scroll={{ x: 'max-content' }}
        onRow={(o) => ({
          onClick: () => navigate(`/oportunidades/${o.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={false}
      />
    </div>
  )
}
