import { useState } from 'react'
import { Button, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMetasVenta } from '@/hooks/useMetasVenta'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
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

/**
 * Vista del JDV: propone metas para su equipo o para sí mismo. GET
 * /metas-venta sin filtro de id_empleado ya devuelve equipo + propia para
 * el rol jdv — no hay filtrado adicional del lado del frontend.
 */
export function MisMetasEquipo() {
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL)
  const [pagina, setPagina] = useState(1)
  const [proponiendo, setProponiendo] = useState(false)
  const [reproponiendo, setReproponiendo] = useState<MetaVenta | null>(null)

  const vendedores = useVendedoresAsignables()
  const metas = useMetasVenta({ anio, page: pagina })

  const columnas: ColumnsType<MetaVenta> = [
    { title: 'Vendedor', key: 'empleado', render: (_, m) => nombreCompleto(m.empleado) },
    { title: 'Año', dataIndex: 'anio' },
    { title: 'Meta anual', dataIndex: 'meta_anual', render: (v: number) => `${v} unidades` },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: EstadoMeta) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_META[e]}</Tag>,
    },
    { title: 'Motivo de rechazo', dataIndex: 'motivo_rechazo', render: (m: string | null) => m ?? '—' },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, m) =>
        m.estado === 'rechazada' ? (
          <Button size="small" onClick={() => setReproponiendo(m)}>
            Volver a proponer
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Select
          value={anio}
          style={{ width: 110 }}
          onChange={(v) => {
            setAnio(v)
            setPagina(1)
          }}
          options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
        />
        <Button type="primary" onClick={() => setProponiendo(true)}>
          Proponer meta
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={metas.isLoading}
        dataSource={metas.data?.data ?? []}
        columns={columnas}
        pagination={{
          current: pagina,
          total: metas.data?.meta?.total ?? 0,
          pageSize: metas.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <MetaVentaFormModal
        open={proponiendo}
        onClose={() => setProponiendo(false)}
        modo="nueva"
        tituloModal="Proponer meta de venta"
        textoBoton="Enviar propuesta"
        empleadosDisponibles={vendedores.data ?? []}
      />

      <MetaVentaFormModal
        open={reproponiendo !== null}
        onClose={() => setReproponiendo(null)}
        modo="nueva"
        tituloModal="Volver a proponer meta"
        textoBoton="Enviar propuesta"
        empleadosDisponibles={vendedores.data ?? []}
        metaAEditar={reproponiendo}
      />
    </>
  )
}
