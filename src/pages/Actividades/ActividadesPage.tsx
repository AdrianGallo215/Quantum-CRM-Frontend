import { useState } from 'react'
import { App, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  useActualizarTarea,
  useCancelarTarea,
  useCompletarTarea,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useInicio } from '@/hooks/usePantallas'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Tarea } from '@/types'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { CrearTareaModal } from '@/components/CrearTareaModal'

/** Pantalla de actividades según el prototipo gestión_de_actividades (paleta teal) */
export function ActividadesPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [modalNueva, setModalNueva] = useState(false)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)

  const empleados = useEmpleadosSeleccionables()

  const tareas = useTareas({ estado_accion: 'pendiente' })
  const inicio = useInicio()
  const completar = useCompletarTarea()
  const cancelar = useCancelarTarea()
  const actualizar = useActualizarTarea()

  const pendientes = tareas.data ?? []
  const eventos = inicio.data?.eventos_por_seguir ?? []

  return (
    <div className="proto-teal bg-surface min-h-full font-body-md text-body-md text-on-background">
      <div className="p-4 md:p-8 max-w-container-max mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestión de Actividades</h1>
          <p className="text-text-muted">
            Tareas del vendedor y eventos operativos externos en seguimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Tareas (col 4) */}
          <section className="lg:col-span-4 bg-surface-container-low rounded-lg border border-border-subtle flex flex-col">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-lg">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  assignment
                </span>
                <h2 className="font-headline-md text-headline-md">Tareas</h2>
              </div>
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md font-bold">
                {pendientes.length} pendientes
              </span>
            </div>
            <div className="flex-grow p-4 space-y-3 custom-scrollbar max-h-[calc(100vh-280px)] overflow-y-auto">
              {tareas.isLoading && <Cargando />}
              {tareas.isError && (
                <ErrorCarga error={tareas.error} onReintentar={() => void tareas.refetch()} />
              )}
              {pendientes.length === 0 && !tareas.isLoading && !tareas.isError && (
                <p className="text-center text-on-surface-variant py-6">Sin tareas pendientes 🎉</p>
              )}
              {pendientes.map((t) => {
                const vencida = dayjs(t.fecha_ejecucion).isBefore(dayjs())
                return (
                  <div
                    key={t.id}
                    className="bg-white p-3 border border-border-subtle rounded-lg hover:border-primary transition-all group cursor-pointer"
                    onClick={() => setTareaSel(t)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-label-md font-label-md text-text-muted">ID-{t.id}</span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="material-symbols-outlined text-[18px] text-outline hover:text-primary"
                          title="Completar"
                          onClick={() =>
                            completar.mutate(
                              { id: t.id },
                              {
                                onSuccess: () => message.success('Tarea completada'),
                                onError: (e) => message.error(mensajeDeError(e)),
                              },
                            )
                          }
                        >
                          check_circle
                        </button>
                        <Popconfirm
                          title="¿Cancelar esta tarea?"
                          okText="Sí, cancelar"
                          cancelText="No"
                          onConfirm={() =>
                            cancelar.mutate(t.id, {
                              onSuccess: () => message.success('Tarea cancelada'),
                              onError: (e) => message.error(mensajeDeError(e)),
                            })
                          }
                        >
                          <button
                            className="material-symbols-outlined text-[18px] text-outline hover:text-error"
                            title="Cancelar"
                          >
                            cancel
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                    <h3 className="font-bold text-on-surface mb-1">{ETIQUETA_TIPO_ACCION[t.tipo_accion]}</h3>
                    <p className="text-body-md text-text-muted line-clamp-1">
                      {t.descripcion} — {t.empresa.razon_social}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {vencida ? (
                        <div className="flex items-center gap-1.5 text-label-md text-error">
                          <span className="material-symbols-outlined text-[14px]">priority_high</span>
                          Vencida
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-label-md text-primary">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {dayjs(t.fecha_ejecucion).format('DD MMM, HH:mm')}
                        </div>
                      )}
                      <div className="flex -space-x-2">
                        <div
                          title={nombreCompleto(t.asignado)}
                          className="w-6 h-6 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                        >
                          {iniciales(t.asignado?.nombres, t.asignado?.apellidos)}
                        </div>
                        {(t.colaboradores ?? []).slice(0, 3).map((c) => (
                          <div
                            key={c.id}
                            title={nombreCompleto(c)}
                            className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                          >
                            {iniciales(c.nombres, c.apellidos)}
                          </div>
                        ))}
                        {(t.colaboradores ?? []).length > 3 && (
                          <div
                            title={`${(t.colaboradores ?? []).length - 3} colaborador(es) más`}
                            className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[9px] font-bold"
                          >
                            +{(t.colaboradores ?? []).length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-border-subtle">
              <button
                className="w-full text-primary font-bold text-button flex items-center justify-center gap-2 hover:bg-surface-container transition-colors py-2 rounded-lg"
                onClick={() => setModalNueva(true)}
              >
                <span className="material-symbols-outlined">add_circle</span>
                Nueva tarea
              </button>
            </div>
          </section>

          {/* Eventos (col 8) */}
          <section className="lg:col-span-8 space-y-gutter">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  hub
                </span>
                <h2 className="font-headline-md text-headline-md">Eventos Operativos</h2>
              </div>
            </div>

            {inicio.isLoading && <Cargando />}
            {eventos.length === 0 && !inicio.isLoading && (
              <div className="bg-white border border-border-subtle rounded-lg p-8 text-center text-text-muted">
                Sin eventos por seguir
              </div>
            )}
            {eventos.map((ev) => {
              const fecha = dayjs(ev.fecha_seguimiento)
              return (
                <div
                  key={ev.id}
                  className="bg-white border border-border-subtle rounded-lg overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-full sm:w-48 bg-surface-container-low p-6 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r border-border-subtle">
                    <div className="text-label-md font-bold text-text-muted mb-1 uppercase tracking-widest">
                      {fecha.format('MMM YYYY')}
                    </div>
                    <div
                      className={`text-[48px] font-bold leading-none ${ev.seguimiento_vencido ? 'text-error' : 'text-tertiary'}`}
                    >
                      {fecha.format('DD')}
                    </div>
                    <div
                      className={`text-label-md font-bold mt-1 ${ev.seguimiento_vencido ? 'text-error' : 'text-tertiary'}`}
                    >
                      {ev.seguimiento_vencido ? 'Vencido' : 'Pendiente'}
                    </div>
                  </div>
                  <div className="flex-grow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-md font-bold mb-3">
                          <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                          {ev.empresa.razon_social}
                        </div>
                        <h3 className="text-headline-md font-bold text-on-surface">{ev.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 border-t border-border-subtle pt-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[20px]">event</span>
                        <span className="text-body-md font-medium text-on-surface">
                          Seguimiento: {fecha.format('DD MMM YYYY')}
                        </span>
                      </div>
                      <button
                        className="ml-auto text-primary font-bold text-button hover:underline"
                        onClick={() =>
                          navigate(
                            ev.id_oportunidad
                              ? `/oportunidades/${ev.id_oportunidad}`
                              : `/empresas/${ev.empresa.id}`,
                          )
                        }
                      >
                        Ver seguimiento
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        </div>
      </div>

      {/* FAB del prototipo */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        onClick={() => setModalNueva(true)}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizar.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizar.isPending}
        empleados={empleados}
        irADetalle={
          tareaSel
            ? () => {
                const t = tareaSel
                setTareaSel(null)
                navigate(t.id_oportunidad ? `/oportunidades/${t.id_oportunidad}` : `/empresas/${t.id_empresa}`)
              }
            : undefined
        }
      />

      <CrearTareaModal open={modalNueva} onClose={() => setModalNueva(false)} />
    </div>
  )
}
