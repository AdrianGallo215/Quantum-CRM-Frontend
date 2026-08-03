import { useMemo, useState } from 'react'
import { Pagination, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useProspeccion } from '@/hooks/usePantallas'
import type { ProspeccionItem } from '@/types'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { NuevaOportunidadModal } from '@/components/NuevaOportunidadModal'

type FiltroEstado = 'todos' | 'requiere_accion' | 'prospeccion'

/** ¿La fila exige acción ya? (3/3 hitos o estancada sin avance) */
const requiereAccion = (i: ProspeccionItem) =>
  i.lista_para_convertir || (i.checkpoints_completados === 0 && i.dias_sin_actividad > 14)

export function ProspeccionPage() {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState(1)
  const prospeccion = useProspeccion(pagina)
  const [convertir, setConvertir] = useState<ProspeccionItem | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')

  const itemsPagina = prospeccion.data?.data ?? []

  // GET /prospeccion no acepta filtros (contrato §16): este filtro se aplica
  // sobre la página cargada, no sobre el total. La etiqueta del control lo dice
  // explícitamente para que nadie lo lea como un filtro global.
  const filas = useMemo(() => {
    if (filtroEstado === 'requiere_accion') return itemsPagina.filter(requiereAccion)
    if (filtroEstado === 'prospeccion') return itemsPagina.filter((i) => !requiereAccion(i))
    return itemsPagina
  }, [itemsPagina, filtroEstado])

  const meta = prospeccion.data?.meta
  const total = meta?.total ?? filas.length
  const porPagina = meta?.per_page ?? 20
  const listaParaConvertir = itemsPagina.find((i) => i.lista_para_convertir) ?? null

  return (
    <div className="proto-teal bg-background min-h-full font-body-md text-body-md text-on-background">
      <main className="p-4 md:p-8">
        <div className="max-w-[1200px] mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">
              Prospección Comercial
            </h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg">
              Empresas sin oportunidades activas que requieren contacto
            </p>
          </div>

          {/* Filters Bar */}
          <section className="bg-surface-container-lowest border border-border-subtle p-4 rounded-xl flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-outline uppercase tracking-widest">
                Filtrar esta página
              </span>
            </div>
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 bg-surface-muted border border-border-subtle rounded-lg text-body-md font-body-md focus:border-primary focus:ring-0 outline-none cursor-pointer"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              >
                <option value="todos">Estado: Todos</option>
                <option value="requiere_accion">Requieren acción</option>
                <option value="prospeccion">En prospección</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                expand_more
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 text-primary font-medium hover:bg-secondary-container rounded-full transition-colors"
                onClick={() => setFiltroEstado('todos')}
              >
                <span className="material-symbols-outlined">restart_alt</span>
                Limpiar
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-primary font-medium hover:bg-secondary-container rounded-full transition-colors disabled:opacity-40"
                disabled={prospeccion.isFetching}
                onClick={() => void prospeccion.refetch()}
              >
                <span className="material-symbols-outlined">refresh</span>
                {prospeccion.isFetching ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          </section>

          {/* Data Table Container */}
          {prospeccion.isLoading ? (
            <Cargando />
          ) : prospeccion.isError ? (
            <ErrorCarga error={prospeccion.error} onReintentar={() => void prospeccion.refetch()} />
          ) : (
            <section className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted border-b border-border-subtle">
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase">Empresa</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase text-center">Estado</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase">Último Contacto</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase">Probabilidad</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase">Segmento</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filas.map((item) => (
                    <Fila
                      key={item.id_empresa}
                      item={item}
                      onConvertir={() => setConvertir(item)}
                      onVerEmpresa={() => navigate(`/empresas/${item.id_empresa}`)}
                    />
                  ))}
                  {filas.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-center text-on-surface-variant" colSpan={6}>
                        Sin empresas en prospección
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Paginación real contra el servidor. Los chevrons del prototipo
                  no tenían onClick y `useProspeccion` nunca enviaba `page`: todo
                  lo que pasara del registro 20 era invisible. */}
              <div className="px-6 py-4 bg-surface-muted flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs text-on-surface-variant font-medium">
                  Mostrando {filas.length} de {total} prospecto{total === 1 ? '' : 's'}
                  {filtroEstado !== 'todos' && ' (filtrado en esta página)'}
                </span>
                <Pagination
                  size="small"
                  current={pagina}
                  total={total}
                  pageSize={porPagina}
                  showSizeChanger={false}
                  onChange={(p) => {
                    setPagina(p)
                    setFiltroEstado('todos')
                  }}
                />
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <div className="flex justify-between items-center gap-4 flex-wrap bg-surface-container-low p-6 rounded-2xl border border-border-subtle">
            <div>
              <h4 className="font-headline-md text-primary">Acciones rápidas</h4>
              <p className="text-sm text-on-surface-variant">
                Convierte la primera empresa con sus 3 hitos completados o registra una actividad.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                className="flex items-center gap-2 px-8 py-3 bg-[#9cd2d3] text-[#114c5f] font-button rounded-full hover:opacity-90 transition-all shadow-sm"
                onClick={() => navigate('/actividades')}
              >
                <span className="material-symbols-outlined">edit_note</span>
                Registrar Actividad
              </button>
              {/* Antes: si no había ninguna empresa lista, abría el modal con
                  `null` y el clic no hacía nada ni decía por qué. */}
              <Tooltip
                title={
                  listaParaConvertir
                    ? `Convertir ${listaParaConvertir.razon_social}`
                    : 'Ninguna empresa de esta página tiene los 3 hitos completados'
                }
              >
                <button
                  className="flex items-center gap-2 px-8 py-3 bg-[#0799b6] text-white font-button rounded-full hover:opacity-90 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={listaParaConvertir === null}
                  onClick={() => setConvertir(listaParaConvertir)}
                >
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Crear Oportunidad
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </main>

      <NuevaOportunidadModal
        open={convertir !== null}
        onClose={() => setConvertir(null)}
        empresaPreseleccionada={
          convertir ? { id: convertir.id_empresa, razon_social: convertir.razon_social } : null
        }
      />
    </div>
  )
}

function Fila({
  item,
  onConvertir,
  onVerEmpresa,
}: {
  item: ProspeccionItem
  onConvertir: () => void
  onVerEmpresa: () => void
}) {
  const urgente = requiereAccion(item)
  const probabilidad =
    item.checkpoints_total > 0
      ? Math.round((item.checkpoints_completados / item.checkpoints_total) * 100)
      : 0
  const critico = item.dias_sin_actividad > 14

  return (
    <tr className="hover:bg-surface-container-low transition-colors group">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container border border-border-subtle flex items-center justify-center overflow-hidden text-primary font-bold text-xs">
            {item.razon_social.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="block font-semibold text-primary cursor-pointer" onClick={onVerEmpresa}>
              {item.razon_social}
            </span>
            <span className="text-xs text-on-surface-variant">RUC: {item.ruc}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        {urgente ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#fff7ed] text-[#9a3412] border border-[#ffedd5]">
            requiere_acción
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container border border-secondary-fixed">
            prospección
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          {item.ultima_actividad_at ? (
            <>
              <span className="text-body-md">{dayjs(item.ultima_actividad_at).format('DD MMM YYYY')}</span>
              {critico ? (
                <span className="text-xs text-error font-extrabold uppercase">
                  Crítico: {item.dias_sin_actividad} días
                </span>
              ) : (
                <span className="text-xs text-on-surface-variant">
                  Hace {item.dias_sin_actividad} días
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-body-md text-outline">Nunca</span>
              <span className="text-xs text-outline">-</span>
            </>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="w-32">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${probabilidad > 0 ? 'text-primary' : 'text-outline'}`}>
              {probabilidad}%
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5">
            <div
              className={`${probabilidad > 0 ? 'bg-primary' : 'bg-outline'} h-1.5 rounded-full`}
              style={{ width: `${probabilidad}%` }}
            ></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-wrap gap-1">
          {item.segmentos.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-[10px] font-bold uppercase tracking-tight"
            >
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
          {item.lista_para_convertir && (
            <button
              className="bg-primary-container text-on-primary-container p-2 rounded-full hover:shadow-md transition-all"
              title="Convertir a oportunidad"
              onClick={onConvertir}
            >
              <span className="material-symbols-outlined">add_circle</span>
            </button>
          )}
          <button
            className="bg-secondary-container text-on-secondary-container p-2 rounded-full hover:shadow-md transition-all"
            title="Ver empresa"
            onClick={onVerEmpresa}
          >
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>
      </td>
    </tr>
  )
}
