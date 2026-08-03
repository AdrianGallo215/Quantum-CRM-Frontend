import { useState } from 'react'
import { Alert, DatePicker, Select, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import {
  useReporteDescuentos,
  useReporteEquipo,
  useReportePipeline,
  useReporteProspeccion,
  useReporteVelocidad,
  useReporteVentas,
} from '@/hooks/usePantallas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import type { ReporteEquipoItem, ReporteFiltros } from '@/types'
import { etiquetaEtapa } from '@/utils/etiquetas'
import { formatoMonto, formatoNumero, formatoPorcentaje } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { MetricCard } from '@/components/MetricCard'

const { RangePicker } = DatePicker

export function ReportesPage() {
  // Client state: filtros y tab activo. Default: mes calendario actual (PRD §9.8)
  const [rango, setRango] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')])
  const [idVendedor, setIdVendedor] = useState<number | undefined>(undefined)
  const [tab, setTab] = useState('ventas')

  const empleados = useVendedoresAsignables()

  const filtros: ReporteFiltros = {
    fecha_desde: rango[0].format('YYYY-MM-DD'),
    fecha_hasta: rango[1].format('YYYY-MM-DD'),
    id_vendedor: idVendedor,
  }
  const filtrosSinVendedor: ReporteFiltros = {
    fecha_desde: filtros.fecha_desde,
    fecha_hasta: filtros.fecha_hasta,
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            Reportes
          </Typography.Title>
          <span style={{ color: '#444750' }}>Indicadores comerciales del período</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <RangePicker
            value={rango}
            format="DD/MM/YYYY"
            allowClear={false}
            onChange={(fechas) => {
              if (fechas?.[0] && fechas[1]) setRango([fechas[0], fechas[1]])
            }}
          />
          <Select
            allowClear
            placeholder="Todos los vendedores"
            style={{ width: 220 }}
            value={idVendedor}
            onChange={setIdVendedor}
            options={(empleados.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.nombres} ${e.apellidos}`,
            }))}
          />
        </div>
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ marginTop: 8 }}
        items={[
          { key: 'ventas', label: 'Ventas', children: <ReporteVentasView filtros={filtros} activo={tab === 'ventas'} /> },
          { key: 'pipeline', label: 'Pipeline', children: <ReportePipelineView activo={tab === 'pipeline'} /> },
          { key: 'equipo', label: 'Equipo', children: <ReporteEquipoView filtros={filtrosSinVendedor} activo={tab === 'equipo'} /> },
          { key: 'velocidad', label: 'Velocidad por etapa', children: <ReporteVelocidadView activo={tab === 'velocidad'} /> },
          { key: 'prospeccion', label: 'Prospección', children: <ReporteProspeccionView filtros={filtros} activo={tab === 'prospeccion'} /> },
          { key: 'descuentos', label: 'Descuentos', children: <ReporteDescuentosView filtros={filtrosSinVendedor} activo={tab === 'descuentos'} /> },
        ]}
      />
    </div>
  )
}

const gridMetricas: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 24,
  marginBottom: 24,
}

function ReporteVentasView({ filtros, activo }: { filtros: ReporteFiltros; activo: boolean }) {
  const q = useReporteVentas(filtros, activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  const d = q.data
  return (
    <div>
      <div style={gridMetricas}>
        <MetricCard label="Monto vendido" valor={formatoMonto(d.monto_total)} acento="positivo" sublabel={`${d.operaciones_count} operaciones`} />
        <MetricCard label="Unidades" valor={formatoNumero(d.unidades_total)} sublabel="buses facturados" />
        <MetricCard label="Ticket promedio" valor={formatoMonto(d.ticket_promedio)} acento="primario" />
        <MetricCard label="Dcto. promedio" valor={formatoPorcentaje(d.dcto_promedio)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="bento-card">
          <span className="eyebrow">Por vendedor</span>
          <Table
            rowKey="id_vendedor"
            size="small"
            pagination={false}
            dataSource={d.por_vendedor}
            columns={[
              { title: 'Vendedor', dataIndex: 'nombre' },
              { title: 'Unidades', dataIndex: 'unidades', align: 'right' },
              { title: 'Monto', dataIndex: 'monto', align: 'right', render: (v: string) => formatoMonto(v) },
            ]}
          />
        </div>
        <div className="bento-card">
          <span className="eyebrow">Por modelo</span>
          <Table
            rowKey="modelo"
            size="small"
            pagination={false}
            dataSource={d.por_modelo}
            columns={[
              { title: 'Modelo', dataIndex: 'modelo' },
              { title: 'Unidades', dataIndex: 'unidades', align: 'right' },
              { title: 'Monto', dataIndex: 'monto', align: 'right', render: (v: string) => formatoMonto(v) },
            ]}
          />
        </div>
        <div className="bento-card">
          <span className="eyebrow">Por mes</span>
          <Table
            rowKey="mes"
            size="small"
            pagination={false}
            dataSource={d.por_mes}
            columns={[
              { title: 'Mes', dataIndex: 'mes' },
              { title: 'Operaciones', dataIndex: 'operaciones', align: 'right' },
              { title: 'Monto', dataIndex: 'monto', align: 'right', render: (v: string) => formatoMonto(v) },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function ReportePipelineView({ activo }: { activo: boolean }) {
  const q = useReportePipeline(activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  const d = q.data
  return (
    <div>
      <div style={gridMetricas}>
        <MetricCard label="Total activo" valor={formatoMonto(d.total_activo)} acento="primario" />
        <MetricCard
          label="Concentración Calidda"
          valor={formatoPorcentaje(d.concentracion_calidda_pct)}
          sublabel="del valor del pipeline"
        />
      </div>
      <div className="bento-card" style={{ marginBottom: 24 }}>
        <span className="eyebrow">Por etapa</span>
        <Table
          rowKey="etapa"
          size="small"
          pagination={false}
          dataSource={d.por_etapa}
          columns={[
            { title: 'Etapa', dataIndex: 'etapa', render: (e: string) => etiquetaEtapa(e) },
            { title: 'Oportunidades', dataIndex: 'count', align: 'right' },
            { title: 'Valor', dataIndex: 'valor', align: 'right', render: (v: string) => formatoMonto(v) },
            { title: 'Tiempo prom. (días)', dataIndex: 'tiempo_promedio_dias', align: 'right' },
            { title: 'Sobre promedio', dataIndex: 'oportunidades_sobre_promedio', align: 'right' },
          ]}
        />
      </div>
      <div className="bento-card">
        <span className="eyebrow">Oportunidades sin actividad</span>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={d.oportunidades_sin_actividad}
          columns={[
            { title: 'Empresa', dataIndex: 'empresa' },
            { title: 'Etapa', dataIndex: 'estado', render: (e: string) => etiquetaEtapa(e) },
            { title: 'Días sin actividad', dataIndex: 'dias_sin_actividad', align: 'right' },
            { title: 'Monto', dataIndex: 'monto_total', align: 'right', render: (v: string) => formatoMonto(v) },
            { title: 'Vendedor', dataIndex: 'vendedor' },
          ]}
        />
      </div>
    </div>
  )
}

function ReporteEquipoView({ filtros, activo }: { filtros: ReporteFiltros; activo: boolean }) {
  const q = useReporteEquipo(filtros, activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  const columnas: ColumnsType<ReporteEquipoItem> = [
    { title: 'Vendedor', key: 'v', render: (_, r) => <strong>{r.vendedor.nombre}</strong> },
    { title: 'Opp. activas', dataIndex: 'oportunidades_activas', align: 'right' },
    { title: 'Valor pipeline', dataIndex: 'valor_pipeline', align: 'right', render: (v: string) => formatoMonto(v) },
    { title: 'Cerradas (mes)', dataIndex: 'oportunidades_cerradas_mes', align: 'right' },
    { title: 'Valor cerrado', dataIndex: 'valor_cerrado_mes', align: 'right', render: (v: string) => formatoMonto(v) },
    { title: 'Tareas (semana)', dataIndex: 'tareas_completadas_semana', align: 'right' },
    {
      title: 'Vencidas',
      dataIndex: 'tareas_vencidas',
      align: 'right',
      render: (v: number) => <span style={{ color: v > 0 ? '#ba1a1a' : 'inherit', fontWeight: v > 0 ? 700 : 400 }}>{v}</span>,
    },
    { title: 'Dcto. prom.', dataIndex: 'dcto_promedio', align: 'right', render: (v: string) => formatoPorcentaje(v) },
    { title: 'Velocidad (días)', dataIndex: 'velocidad_promedio_dias', align: 'right' },
  ]
  return (
    <div className="bento-card">
      <Table rowKey={(r) => r.vendedor.id} size="small" pagination={false} dataSource={q.data} columns={columnas} />
    </div>
  )
}

function ReporteVelocidadView({ activo }: { activo: boolean }) {
  const q = useReporteVelocidad(activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  return (
    <div>
      {/* Advertencia de muestra pequeña que devuelve la API (PRD §9.8) */}
      {q.data.meta?.advertencia && (
        <Alert type="warning" showIcon message={q.data.meta.advertencia} style={{ marginBottom: 16, borderRadius: 4 }} />
      )}
      <div className="bento-card">
        <Table
          rowKey="etapa"
          size="small"
          pagination={false}
          dataSource={q.data.data}
          columns={[
            { title: 'Etapa', dataIndex: 'etapa', render: (e: string) => etiquetaEtapa(e) },
            { title: 'Días promedio', dataIndex: 'dias_promedio', align: 'right' },
            { title: 'Días mediana', dataIndex: 'dias_mediana', align: 'right' },
            { title: 'Muestra', dataIndex: 'muestra', align: 'right' },
          ]}
        />
      </div>
    </div>
  )
}

function ReporteProspeccionView({ filtros, activo }: { filtros: ReporteFiltros; activo: boolean }) {
  const q = useReporteProspeccion(filtros, activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  const d = q.data
  const embudo = [
    { etiqueta: 'Ingresadas', valor: d.ingresadas },
    { etiqueta: 'Hito 1', valor: d.hito_1_completado },
    { etiqueta: 'Hito 2', valor: d.hito_2_completado },
    { etiqueta: 'Hito 3', valor: d.hito_3_completado },
    { etiqueta: 'Convertidas', valor: d.convertidas_a_oportunidad },
  ]
  const max = Math.max(1, ...embudo.map((e) => e.valor))
  return (
    <div>
      <div style={gridMetricas}>
        <MetricCard label="Tasa de conversión" valor={formatoPorcentaje(d.tasa_conversion_pct)} acento="positivo" />
        <MetricCard label="Tiempo prom. conversión" valor={`${d.tiempo_promedio_conversion_dias} días`} acento="primario" />
      </div>
      <div className="bento-card" style={{ marginBottom: 24 }}>
        <span className="eyebrow">Embudo de conversión</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {embudo.map((e) => (
            <div key={e.etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 100, fontSize: 12, color: '#444750' }}>{e.etiqueta}</span>
              <div style={{ flex: 1, height: 20, background: '#dde1ff', borderRadius: 9999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(e.valor / max) * 100}%`,
                    height: '100%',
                    background: '#244481',
                    borderRadius: 9999,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span className="metric-value" style={{ width: 40, textAlign: 'right', fontWeight: 600 }}>
                {e.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="bento-card">
        <span className="eyebrow">Por origen del lead</span>
        <Table
          rowKey="origen"
          size="small"
          pagination={false}
          dataSource={d.por_origen_lead}
          columns={[
            { title: 'Origen', dataIndex: 'origen' },
            { title: 'Ingresadas', dataIndex: 'ingresadas', align: 'right' },
            { title: 'Convertidas', dataIndex: 'convertidas', align: 'right' },
            { title: 'Tasa', dataIndex: 'tasa_pct', align: 'right', render: (v: string) => formatoPorcentaje(v) },
          ]}
        />
      </div>
    </div>
  )
}

function ReporteDescuentosView({ filtros, activo }: { filtros: ReporteFiltros; activo: boolean }) {
  const q = useReporteDescuentos(filtros, activo)
  if (q.isLoading) return <Cargando />
  if (q.isError || !q.data) return <ErrorCarga error={q.error} onReintentar={() => void q.refetch()} />
  const d = q.data
  return (
    <div>
      <div style={gridMetricas}>
        <MetricCard label="Dcto. promedio global" valor={formatoPorcentaje(d.dcto_promedio_global)} acento="primario" />
      </div>
      <div className="bento-card">
        <span className="eyebrow">Por vendedor</span>
        <Table
          rowKey="vendedor"
          size="small"
          pagination={false}
          dataSource={d.por_vendedor}
          columns={[
            { title: 'Vendedor', dataIndex: 'vendedor' },
            { title: 'Dcto. promedio', dataIndex: 'dcto_promedio', align: 'right', render: (v: string) => formatoPorcentaje(v) },
            { title: 'Sin descuento', dataIndex: 'operaciones_sin_dcto', align: 'right' },
            { title: 'Con descuento', dataIndex: 'operaciones_con_dcto', align: 'right' },
            {
              title: 'Dcto. máximo',
              dataIndex: 'dcto_maximo_aplicado',
              align: 'right',
              render: (v: string) => (
                <span style={{ color: Number(v) >= 5 ? '#ba1a1a' : 'inherit', fontWeight: 600 }}>
                  {formatoPorcentaje(v)}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
