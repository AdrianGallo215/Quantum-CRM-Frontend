import { useMemo, useState } from 'react'
import { Alert, App, Pagination, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useEliminarOportunidad, useOportunidades } from '@/hooks/useOportunidades'
import { mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_ADMIN, ROLES_APOYO, tieneRol } from '@/store/authStore'
import type { EstadoOportunidad, Oportunidad } from '@/types'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { NuevaOportunidadModal } from '@/components/NuevaOportunidadModal'
import { TablaOportunidades } from './TablaOportunidades'

/** Columnas con los títulos y bordes literales del prototipo pipeline_kanban */
const COLUMNAS: { estado: EstadoOportunidad; titulo: string; borde: string }[] = [
  { estado: 'evaluacion_calidda', titulo: 'Evaluación', borde: 'border-brand-primary' },
  { estado: 'documentos_legales', titulo: 'Documentos Legales', borde: 'border-brand-secondary' },
  { estado: 'facturado', titulo: 'Facturado', borde: 'border-emerald-500' },
]

/** Máximo que admite el contrato (§4). Se pide el tope para que el kanban muestre lo más posible de una vez. */
const POR_PAGINA = 100

export function PipelinePage() {
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
  const [mostrarCerradas, setMostrarCerradas] = useState(false)
  const [modalNueva, setModalNueva] = useState(false)
  const [vista, setVista] = useState<'kanban' | 'tabla'>('kanban')
  const [pagina, setPagina] = useState(1)

  const oportunidades = useOportunidades({
    incluir_cerradas: mostrarCerradas,
    per_page: POR_PAGINA,
    page: pagina,
  })

  const lista = oportunidades.data?.data ?? []
  const total = oportunidades.data?.meta?.total ?? lista.length
  // El listado está paginado: sin este aviso, a partir de la oportunidad 101 los
  // registros simplemente desaparecían del kanban y de la tabla sin señal alguna.
  const hayMasPaginas = total > POR_PAGINA

  const cambiarCerradas = () => {
    setMostrarCerradas((v) => !v)
    setPagina(1)
  }

  const porEtapa = useMemo(() => {
    const grupos = new Map<EstadoOportunidad, Oportunidad[]>()
    for (const c of COLUMNAS) grupos.set(c.estado, [])
    if (mostrarCerradas) grupos.set('cerrado', [])
    for (const o of lista) {
      grupos.get(o.estado)?.push(o)
    }
    return grupos
  }, [lista, mostrarCerradas])

  return (
    <section className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 h-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Pipeline de Ventas</h1>
          <p className="text-on-surface-variant font-body-md">
            Visualiza y gestiona el flujo de tus oportunidades comerciales
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-white border border-outline-variant rounded-pill p-1">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-pill font-medium text-body-sm transition-all ${vista === 'kanban' ? 'bg-brand-primary text-white' : 'text-on-surface-variant hover:bg-surface'}`}
              onClick={() => setVista('kanban')}
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
              Kanban
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-pill font-medium text-body-sm transition-all ${vista === 'tabla' ? 'bg-brand-primary text-white' : 'text-on-surface-variant hover:bg-surface'}`}
              onClick={() => setVista('tabla')}
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
              Tabla
            </button>
          </div>
          <button
            className="flex items-center gap-2 bg-white border border-outline-variant px-5 py-2.5 rounded-pill text-on-surface hover:bg-surface transition-all font-medium text-body-sm"
            onClick={cambiarCerradas}
          >
            <span className="material-symbols-outlined">filter_list</span>
            {mostrarCerradas ? 'Ocultar cerradas' : 'Mostrar cerradas'}
          </button>
          {!esRolDeApoyo && (
            <button
              className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-pill hover:bg-brand-primary/90 transition-all font-bold text-body-sm shadow-lg shadow-brand-primary/20"
              onClick={() => setModalNueva(true)}
            >
              <span className="material-symbols-outlined">add</span>
              Nueva Oportunidad
            </button>
          )}
        </div>
      </div>

      {hayMasPaginas && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 4 }}
          message={`Hay ${total} oportunidades en total y esta vista muestra ${POR_PAGINA} por página. Usa el paginador de abajo para ver el resto.`}
        />
      )}

      {oportunidades.isLoading ? (
        <Cargando />
      ) : oportunidades.isError ? (
        <ErrorCarga error={oportunidades.error} onReintentar={() => void oportunidades.refetch()} />
      ) : vista === 'tabla' ? (
        <div className="flex-1 overflow-auto pb-6">
          <TablaOportunidades oportunidades={lista} />
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {COLUMNAS.map((col) => (
            <Columna
              key={col.estado}
              titulo={col.titulo}
              borde={col.borde}
              esFacturado={col.estado === 'facturado'}
              oportunidades={porEtapa.get(col.estado) ?? []}
            />
          ))}
          {mostrarCerradas && (
            <Columna
              titulo="Cerradas"
              borde="border-error"
              esFacturado={false}
              oportunidades={porEtapa.get('cerrado') ?? []}
            />
          )}
        </div>
      )}

      {hayMasPaginas && !oportunidades.isLoading && !oportunidades.isError && (
        <div className="shrink-0 flex justify-end pt-2 pb-4">
          <Pagination
            current={pagina}
            total={total}
            pageSize={POR_PAGINA}
            showSizeChanger={false}
            onChange={setPagina}
            showTotal={(t) => `${t} oportunidades`}
          />
        </div>
      )}

      <NuevaOportunidadModal open={modalNueva} onClose={() => setModalNueva(false)} />
    </section>
  )
}

function Columna({
  titulo,
  borde,
  esFacturado,
  oportunidades,
}: {
  titulo: string
  borde: string
  esFacturado: boolean
  oportunidades: Oportunidad[]
}) {
  return (
    <div className="kanban-column flex flex-col">
      <div className={`flex items-center justify-between mb-4 px-2 border-t-4 ${borde} pt-2`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-brand-tertiary text-body-md">{titulo}</h3>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
        {oportunidades.map((o) => (
          <Tarjeta key={o.id} oportunidad={o} esFacturado={esFacturado} />
        ))}
      </div>
    </div>
  )
}

function Tarjeta({ oportunidad: o, esFacturado }: { oportunidad: Oportunidad; esFacturado: boolean }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  const eliminar = useEliminarOportunidad()
  // `created_at` es la antigüedad de la oportunidad, NO el tiempo en la etapa
  // actual: el rótulo decía "días en esta etapa" y mentía en cuanto la
  // oportunidad avanzaba. `entrada_etapa_actual` solo viene en el detalle
  // (OportunidadDetalle), no en el listado, así que aquí se nombra lo que hay.
  const dias = Math.max(0, dayjs().diff(dayjs(o.created_at), 'day'))
  // Sin drag & drop implementado, `cursor-grab` prometía un gesto inexistente.
  const clase = esFacturado
    ? 'bg-emerald-50/5 p-4 rounded shadow-sm border border-emerald-500/30 hover:shadow-md transition-shadow cursor-pointer'
    : 'bg-white p-4 rounded shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow cursor-pointer'
  return (
    <div className={clase} onClick={() => navigate(`/oportunidades/${o.id}`)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-on-surface text-body-md leading-tight">{o.empresa.razon_social}</h4>
        {esAdmin && (
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
              className="text-on-surface-variant hover:text-error shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="Eliminar oportunidad"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </Popconfirm>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-on-surface-variant text-xs">{o.cantidad} unidades</p>
        <p className="text-on-surface-variant text-[10px] opacity-70">
          Creada hace {dias} día{dias === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
