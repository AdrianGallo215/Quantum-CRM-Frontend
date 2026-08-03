import { List, Typography } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router-dom'
import { useInicio } from '@/hooks/usePantallas'
import { tieneRol, useAuthStore } from '@/store/authStore'
import { etiquetaEtapa } from '@/utils/etiquetas'
import { formatoFechaHora, formatoMonto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { MetricCard } from '@/components/MetricCard'
import { Icono } from '@/components/Icono'
import { NeutralTag, PositivoTag, UrgenteTag } from '@/components/EstadoTag'
import { GaugeMeta } from '@/components/GaugeMeta'

export function InicioPage() {
  const empleado = useAuthStore((s) => s.empleado)
  const navigate = useNavigate()
  // Una sola llamada HTTP: GET /inicio
  const inicio = useInicio()

  if (inicio.isLoading) return <Cargando />
  if (inicio.isError || !inicio.data)
    return <ErrorCarga error={inicio.error} onReintentar={() => void inicio.refetch()} />

  const d = inicio.data
  // Solo JDV, gerencia y admin ven montos en USD; vendedor y analista solo cantidades.
  const puedeVerMontos = tieneRol(empleado, ['admin', 'gerencia', 'jdv'])
  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
        Hola, {empleado?.nombres} 👋
      </Typography.Title>
      <span style={{ color: '#444750' }}>{dayjs().format('dddd D [de] MMMM, YYYY')}</span>

      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
          marginTop: 24,
        }}
      >
        <MetricCard
          label="Valor del pipeline"
          valor={
            <span>
              {d.resumen_pipeline.cantidad_unidades}
              <span
                style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, color: 'var(--on-surface-variant)' }}
              >
                unidades
              </span>
            </span>
          }
          sublabel={
            <>
              <div>{d.resumen_pipeline.oportunidades_activas} oportunidades activas</div>
              {puedeVerMontos && (
                <div style={{ fontWeight: 600, color: '#244481' }}>
                  {formatoMonto(d.resumen_pipeline.valor_total)}
                </div>
              )}
            </>
          }
          acento="primario"
        />
        <MetricCard
          label="Tareas pendientes"
          valor={d.tareas_pendientes.length}
          sublabel={`${d.tareas_pendientes.filter((t) => t.esta_vencida).length} vencidas`}
          acento={d.tareas_pendientes.some((t) => t.esta_vencida) ? 'negativo' : 'neutro'}
        />
        <MetricCard
          label="En prospección"
          valor={d.resumen_prospeccion.total}
          sublabel={`${d.resumen_prospeccion.listas_para_convertir} listas para convertir`}
          acento="positivo"
        />
        <MetricCard
          label="Requieren atención"
          valor={d.resumen_prospeccion.requieren_atencion}
          sublabel="prospecciones estancadas"
          acento={d.resumen_prospeccion.requieren_atencion > 0 ? 'negativo' : 'neutro'}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 24,
          marginTop: 24,
          alignItems: 'start',
        }}
      >
        {/* Tareas del día */}
        <div className="bento-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow">Tareas pendientes</span>
            <Link to="/pipeline" style={{ fontSize: 12, fontWeight: 600 }}>
              Ver pipeline →
            </Link>
          </div>
          <List
            dataSource={d.tareas_pendientes}
            locale={{ emptyText: 'Sin tareas pendientes' }}
            renderItem={(t) => (
              <List.Item
                style={{ padding: '12px 0', cursor: 'pointer' }}
                onClick={() =>
                  navigate(t.id_oportunidad ? `/oportunidades/${t.id_oportunidad}` : `/empresas/${t.empresa.id}`)
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{t.descripcion}</div>
                  <div style={{ fontSize: 12, color: '#747781' }}>
                    {t.empresa.razon_social} · {formatoFechaHora(t.fecha_ejecucion)}
                    {t.contacto ? ` · ${t.contacto.nombres} ${t.contacto.apellidos}` : ''}
                  </div>
                </div>
                {t.esta_vencida ? (
                  <UrgenteTag>Vencida</UrgenteTag>
                ) : t.es_hoy ? (
                  <PositivoTag>Hoy</PositivoTag>
                ) : (
                  <NeutralTag>Próxima</NeutralTag>
                )}
              </List.Item>
            )}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Eventos por seguir */}
          <div className="bento-card">
            <span className="eyebrow">Eventos por seguir</span>
            <List
              dataSource={d.eventos_por_seguir}
              locale={{ emptyText: 'Sin eventos por seguir' }}
              renderItem={(ev) => {
                const fecha = dayjs(ev.fecha_seguimiento)
                return (
                  <List.Item
                    style={{ padding: '12px 0', cursor: 'pointer' }}
                    onClick={() =>
                      navigate(
                        ev.id_oportunidad ? `/oportunidades/${ev.id_oportunidad}` : `/empresas/${ev.empresa.id}`,
                      )
                    }
                  >
                    {/* Bloque de fecha según DESIGN.md §9.7 */}
                    <div
                      style={{
                        minWidth: 56,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 4,
                        padding: '8px 4px',
                        marginRight: 16,
                        background: ev.seguimiento_vencido ? '#ba1a1a' : '#e4e7ff',
                        color: ev.seguimiento_vencido ? '#ffffff' : '#444750',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {fecha.format('MMM')}
                      </span>
                      <span className="headline" style={{ fontSize: 20, fontWeight: 700 }}>
                        {fecha.format('D')}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {ev.nombre} {ev.seguimiento_vencido && <UrgenteTag>Vencido</UrgenteTag>}
                      </div>
                      <div style={{ fontSize: 12, color: '#244481', fontWeight: 600 }}>
                        {ev.empresa.razon_social}
                      </div>
                    </div>
                    <Icono nombre="chevron_right" tamano={20} color="#747781" />
                  </List.Item>
                )
              }}
            />
          </div>

          {/* Resumen de pipeline por etapa */}
          <div className="bento-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow">Pipeline por etapa</span>
              <Link to="/pipeline" style={{ fontSize: 12, fontWeight: 600 }}>
                Abrir →
              </Link>
            </div>
            <List
              dataSource={Object.entries(d.resumen_pipeline.por_etapa)}
              renderItem={([etapa, resumen]) => (
                <List.Item style={{ padding: '10px 0' }}>
                  <span style={{ flex: 1 }}>{etiquetaEtapa(etapa)}</span>
                  <span style={{ color: '#747781', marginRight: 12, fontSize: 12 }}>
                    {resumen.count} op.
                  </span>
                  <span className="metric-value" style={{ fontWeight: 600, marginRight: puedeVerMontos ? 16 : 0 }}>
                    {resumen.cantidad_unidades} und.
                  </span>
                  {puedeVerMontos && (
                    <span className="metric-value" style={{ fontWeight: 600, color: '#244481' }}>
                      {formatoMonto(resumen.valor)}
                    </span>
                  )}
                </List.Item>
              )}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px solid #e4e7ff',
              }}
            >
              <span className="eyebrow">Total activo</span>
              <span className="metric-value" style={{ fontWeight: 700, color: '#244481' }}>
                {puedeVerMontos
                  ? formatoMonto(d.resumen_pipeline.valor_total)
                  : `${d.resumen_pipeline.cantidad_unidades} unidades`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Medidor de metas de venta — el dato decide su propia visibilidad, sin chequeo de rol duplicado */}
      {d.meta_ventas && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="bento-card">
            <span className="eyebrow">Mi meta de venta</span>
            <div
              style={{
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                marginTop: 12,
              }}
            >
              <GaugeMeta titulo="Este mes" periodo={d.meta_ventas.mensual} />
              <GaugeMeta titulo="Este año" periodo={d.meta_ventas.anual} />
            </div>
          </div>
          {d.meta_ventas.equipo && (
            <div className="bento-card">
              <span className="eyebrow">Meta del equipo</span>
              <div
                style={{
                  display: 'flex',
                  gap: 24,
                  flexWrap: 'wrap',
                  justifyContent: 'space-around',
                  marginTop: 12,
                }}
              >
                <GaugeMeta titulo="Este mes" periodo={d.meta_ventas.equipo.mensual} />
                <GaugeMeta titulo="Este año" periodo={d.meta_ventas.equipo.anual} />
              </div>
            </div>
          )}
        </div>
      )}
      {/* `dataUpdatedAt` es cuándo respondió realmente GET /inicio. Antes se
          imprimía `dayjs()` del render, así que decía "hoy" incluso con datos
          servidos del cache de hace rato. */}
      <div style={{ marginTop: 24, fontSize: 12, color: '#747781' }}>
        Última actualización: {formatoFechaHora(dayjs(inicio.dataUpdatedAt).toISOString())}
      </div>
    </div>
  )
}
