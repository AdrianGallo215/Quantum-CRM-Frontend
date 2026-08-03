import { useState } from 'react'
import { App, Input, Modal } from 'antd'
import dayjs from 'dayjs'
import { Link, useParams } from 'react-router-dom'
import { useCambiarEstadoOportunidad, useOportunidad } from '@/hooks/useOportunidades'
import { mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_FACTURA, tieneRol } from '@/store/authStore'
import { ETAPAS_PIPELINE, type EstadoOportunidad, type OportunidadDetalle } from '@/types'
import { ETIQUETA_ETAPA } from '@/utils/etiquetas'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { PropiedadesCard } from './PropiedadesCard'
import { TareasCard } from './TareasCard'
import { EventosCard } from './EventosCard'
import { ContactosCard } from './ContactosCard'
import { DocumentosDrive } from '@/components/DocumentosDrive'

/** Títulos de paso literales del prototipo detalle_de_oportunidad_simplificado */
const TITULO_PASO: Record<EstadoOportunidad, string> = {
  evaluacion_calidda: 'Evaluación',
  documentos_legales: 'Doc. Legales',
  facturado: 'Facturado',
  cerrado: 'Cerrado',
}

export function OportunidadDetallePage() {
  const { id } = useParams()
  const idOportunidad = Number(id)
  const oportunidad = useOportunidad(idOportunidad)

  if (oportunidad.isLoading) return <Cargando />
  if (oportunidad.isError || !oportunidad.data)
    return <ErrorCarga error={oportunidad.error} onReintentar={() => void oportunidad.refetch()} />

  return <Contenido oportunidad={oportunidad.data} />
}

function Contenido({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message, notification } = App.useApp()
  const empleado = useAuthStore((s) => s.empleado)
  const puedeFacturar = tieneRol(empleado, ROLES_FACTURA)

  const cambiarEstado = useCambiarEstadoOportunidad(o.id, o.id_empresa)
  const [modalCierre, setModalCierre] = useState(false)
  const [motivoCierre, setMotivoCierre] = useState('')
  const [confirmRetroceso, setConfirmRetroceso] = useState<EstadoOportunidad | null>(null)

  const indiceActual = ETAPAS_PIPELINE.indexOf(o.estado)
  const estaCerrada = o.estado === 'cerrado'
  const diasEnEtapa = o.entrada_etapa_actual
    ? Math.max(0, dayjs().diff(dayjs(o.entrada_etapa_actual), 'day'))
    : null

  const ejecutarCambio = (estado: EstadoOportunidad, motivo_cierre: string | null = null) => {
    cambiarEstado.mutate(
      { estado, motivo_cierre },
      {
        onSuccess: (res) => {
          message.success(`Oportunidad movida a ${ETIQUETA_ETAPA[res.estado]}`)
          for (const adv of res.advertencias) {
            notification.warning({ message: 'Advertencia', description: adv })
          }
        },
        onError: (e) => message.error(mensajeDeError(e, 'No se pudo cambiar el estado')),
      },
    )
  }

  /** Retroceso → aviso crítico ANTES de llamar; cierre → motivo obligatorio */
  const solicitarCambio = (destino: EstadoOportunidad) => {
    if (destino === o.estado || cambiarEstado.isPending) return
    if (destino === 'facturado' && !puedeFacturar) {
      message.warning('El paso a Facturado solo lo confirman admin, gerencia o analista')
      return
    }
    if (destino === 'cerrado') {
      setMotivoCierre('')
      setModalCierre(true)
      return
    }
    const esRetroceso = estaCerrada || ETAPAS_PIPELINE.indexOf(destino) < indiceActual
    if (esRetroceso) {
      setConfirmRetroceso(destino)
      return
    }
    ejecutarCambio(destino)
  }

  return (
    <div className="proto-oportunidad bg-background min-h-full">
      <main className="max-w-7xl mx-auto px-margin-page py-10 flex flex-col gap-8">
        {/* Breadcrumbs & Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md uppercase tracking-widest">
            <Link to="/pipeline" className="hover:text-primary">
              Pipeline
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span>Oportunidad #{o.id}</span>
          </div>
          <div className="flex justify-between items-end">
            <h1 className="font-headline text-headline-lg text-primary">
              {o.modelo.codigo} × {o.cantidad} — {o.empresa.razon_social}
            </h1>
            <div className="flex gap-2">
              <PropiedadesCard.BotonEditar oportunidad={o} />
            </div>
          </div>
        </div>

        {/* Banner de cierre negativo */}
        {estaCerrada && (
          <div className="bg-error-container text-on-error-container p-4 rounded border border-error/30 flex items-center gap-3">
            <span className="material-symbols-outlined">warning</span>
            <div>
              <p className="font-bold">Oportunidad cerrada</p>
              <p className="text-body-md">
                Motivo: {o.motivo_cierre ?? 'Sin motivo registrado'} — recuperable: haz clic en una
                etapa para reabrirla.
              </p>
            </div>
          </div>
        )}

        {/* Stepper (prototipo) — clic en un paso cambia el estado */}
        <section className="bg-white p-8 rounded border border-outline-variant custom-shadow">
          <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto py-2">
            <div className="absolute top-5 left-0 w-full h-[1px] bg-outline-variant -translate-y-1/2 z-0"></div>
            {ETAPAS_PIPELINE.map((etapa, idx) => {
              const done = !estaCerrada && idx < indiceActual
              const activo = !estaCerrada && idx === indiceActual
              const deshabilitadoFactura = etapa === 'facturado' && !puedeFacturar
              return (
                <button
                  key={etapa}
                  type="button"
                  className="relative z-10 flex flex-col items-center gap-3 bg-white px-6 cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => solicitarCambio(etapa)}
                  disabled={deshabilitadoFactura}
                  title={
                    deshabilitadoFactura
                      ? 'Solo admin, gerencia o analista pueden confirmar Facturado'
                      : `Mover a ${ETIQUETA_ETAPA[etapa]}`
                  }
                >
                  {done ? (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 700" }}>
                        check
                      </span>
                    </div>
                  ) : activo ? (
                    <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-primary flex items-center justify-center text-primary">
                      <span className="font-bold">{idx + 1}</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white border border-outline-variant flex items-center justify-center text-outline">
                      <span className="font-bold">{idx + 1}</span>
                    </div>
                  )}
                  {activo ? (
                    <div className="text-center">
                      <span className="font-bold font-label-md text-label-md text-primary">
                        {TITULO_PASO[etapa]}
                      </span>
                      {diasEnEtapa !== null && (
                        <p className="text-[10px] text-on-surface-variant italic">
                          {diasEnEtapa} días en este estado
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className={`font-label-md text-label-md ${done ? 'text-primary' : 'text-outline'}`}>
                      {TITULO_PASO[etapa]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {!estaCerrada && (
            <div className="flex justify-end mt-4">
              <button
                className="btn-circular px-5 py-1.5 border border-error text-error text-label-md font-bold hover:bg-error-container/40 transition-colors"
                onClick={() => solicitarCambio('cerrado')}
              >
                Cerrar oportunidad
              </button>
            </div>
          )}
        </section>

        {/* Company strip */}
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12">
            <section className="bg-surface-container-low p-6 rounded border border-outline-variant flex flex-wrap gap-12 items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded border border-outline-variant flex items-center justify-center overflow-hidden text-primary font-bold text-xl">
                  {o.empresa.razon_social.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Empresa</p>
                  <Link to={`/empresas/${o.id_empresa}`}>
                    <h3 className="font-headline text-headline-sm text-on-surface hover:text-primary transition-colors">
                      {o.empresa.razon_social}
                    </h3>
                  </Link>
                  <p className="text-body-md text-on-surface-variant">
                    {o.empresa.distrito ?? 'Sin distrito'}
                  </p>
                </div>
              </div>
              <div className="h-12 w-px bg-outline-variant hidden md:block"></div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">
                  Vendedor Asignado
                </p>
                <p className="font-bold text-body-lg text-primary underline cursor-pointer">
                  {nombreCompleto(o.vendedor)}
                </p>
              </div>
              <div className="h-12 w-px bg-outline-variant hidden md:block"></div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">
                  Fecha de Creación
                </p>
                <p className="text-body-lg text-on-surface">{formatoFecha(o.created_at)}</p>
              </div>
            </section>
          </div>

          {/* Left: detalles + actividades */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
            <PropiedadesCard oportunidad={o} />
            <EventosCard oportunidad={o} />
            <TareasCard oportunidad={o} />
          </div>

          {/* Right: Contactos + Documentos */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <ContactosCard oportunidad={o} />
            {/* key fuerza remount al cambiar de entidad: el estado local de
                errorSubida/ultimoArchivo no debe sobrevivir un cambio de id
                (si no, el error/reintento de una oportunidad puede aplicarse a
                otra ya en caché). No quitar aunque parezca superfluo. */}
            <DocumentosDrive
              key={`oportunidad-${o.id}`}
              tipo="oportunidad"
              id={o.id}
              driveFolderId={o.drive_folder_id}
              nombreFile="File de la Oportunidad"
            />
          </div>
        </div>
      </main>

      {/* Modal de cierre: motivo obligatorio */}
      <Modal
        title="Cerrar oportunidad"
        open={modalCierre}
        onCancel={() => setModalCierre(false)}
        okText="Cerrar oportunidad"
        okButtonProps={{ danger: true, disabled: motivoCierre.trim().length === 0 }}
        cancelText="Cancelar"
        confirmLoading={cambiarEstado.isPending}
        onOk={() => {
          ejecutarCambio('cerrado', motivoCierre.trim())
          setModalCierre(false)
        }}
      >
        <p style={{ color: '#444750' }}>
          El motivo de cierre es obligatorio. La oportunidad quedará como cerrada (recuperable).
        </p>
        <Input.TextArea
          rows={3}
          value={motivoCierre}
          onChange={(e) => setMotivoCierre(e.target.value)}
          placeholder="Ej. El cliente optó por otra marca"
        />
      </Modal>

      {/* Aviso CRÍTICO de retroceso ANTES de llamar al backend */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ba1a1a' }}>
            <span className="material-symbols-outlined">warning</span> Retroceso de etapa
          </span>
        }
        open={confirmRetroceso !== null}
        onCancel={() => setConfirmRetroceso(null)}
        okText="Sí, retroceder"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={cambiarEstado.isPending}
        onOk={() => {
          if (confirmRetroceso) ejecutarCambio(confirmRetroceso)
          setConfirmRetroceso(null)
        }}
      >
        <p>
          Estás por mover esta oportunidad <strong>hacia atrás</strong>
          {confirmRetroceso ? ` a ${ETIQUETA_ETAPA[confirmRetroceso]}` : ''}. Esta acción queda
          registrada en el historial
          {estaCerrada ? ' y reabrirá la oportunidad (el motivo de cierre se eliminará)' : ''}.
        </p>
        <p style={{ color: '#444750' }}>¿Deseas continuar?</p>
      </Modal>
    </div>
  )
}
