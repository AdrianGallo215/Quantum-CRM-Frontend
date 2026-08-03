import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContacto } from '@/hooks/useContactos'
import { EtapaTag } from '@/components/EstadoTag'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import {
  formatoFechaHora,
  formatoMonto,
  iniciales,
  nombreCompleto,
} from '@/utils/formato'
import type { ContactoActividad, ContactoDetalle, TipoAccion, TipoActividadContacto } from '@/types'
import { useState } from 'react'
import { EditarContactoModal } from './EditarContactoModal'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'

/** Para 'tarea', titulo es el valor crudo de TipoAccion (decisión de diseño con backend) */
function tituloActividad(a: ContactoActividad): string {
  if (a.tipo === 'tarea') return ETIQUETA_TIPO_ACCION[a.titulo as TipoAccion] ?? a.titulo
  return a.titulo
}

export function ContactoDetallePage() {
  const { id } = useParams()
  const idContacto = Number(id)
  const contacto = useContacto(idContacto)

  if (contacto.isLoading) return <Cargando />
  if (contacto.isError || !contacto.data)
    return <ErrorCarga error={contacto.error} onReintentar={() => void contacto.refetch()} />

  return <Contenido contacto={contacto.data} />
}

const ICONO_ACTIVIDAD: Record<TipoActividadContacto, string> = {
  tarea: 'task_alt',
  evento: 'calendar_today',
  nota: 'notes',
}

function Contenido({ contacto: c }: { contacto: ContactoDetalle }) {
  const navigate = useNavigate()
  const [modalEditar, setModalEditar] = useState(false)

  const empresaPrincipal = c.empresas.find((e) => e.es_principal) ?? c.empresas[0]

  return (
    <main className="min-h-full flex flex-col bg-brand-bg">
      <div className="p-margin-page flex flex-col gap-gutter max-w-[1400px] mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="flex text-on-surface-variant text-label-md gap-2 mb-2 uppercase tracking-widest">
          <Link className="hover:text-brand-cyan" to="/contactos">
            Contactos
          </Link>
          <span>/</span>
          <span className="text-on-surface">{nombreCompleto(c)}</span>
        </nav>

        <div className="grid grid-cols-12 gap-gutter">
          {/* Columna izquierda (70%) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
            {/* Información de contacto */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <div className="flex justify-between items-start gap-6 mb-6">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-xl shrink-0">
                    {iniciales(c.nombres, c.apellidos)}
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">
                      {nombreCompleto(c)}
                    </h2>
                    <p className="text-brand-cyan font-semibold text-body-lg">
                      {empresaPrincipal?.cargo ?? '—'}
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button
                        className="btn-circular px-6 py-2 bg-brand-cyan text-white font-bold text-sm hover:opacity-90 transition-opacity"
                        onClick={() => setModalEditar(true)}
                      >
                        Editar Perfil
                      </button>
                      <a
                        className={`btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold text-sm hover:bg-brand-cyan/5 transition-colors ${
                          c.email_1 ? '' : 'opacity-40 pointer-events-none'
                        }`}
                        href={c.email_1 ? `mailto:${c.email_1}` : undefined}
                      >
                        Enviar Correo
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 pt-6 border-t border-outline-variant/30">
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Correo Electrónico</p>
                  <p className="text-body-lg font-semibold text-on-surface">{c.email_1 ?? '—'}</p>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Teléfono Directo</p>
                  <p className="text-body-lg font-semibold text-on-surface">{c.tlf_1 ?? '—'}</p>
                </div>
                {c.email_2 && (
                  <div>
                    <p className="text-label-md text-on-surface-variant uppercase mb-1">Correo Secundario</p>
                    <p className="text-body-lg font-semibold text-on-surface">{c.email_2}</p>
                  </div>
                )}
                {c.tlf_2 && (
                  <div>
                    <p className="text-label-md text-on-surface-variant uppercase mb-1">Teléfono Secundario</p>
                    <p className="text-body-lg font-semibold text-on-surface">{c.tlf_2}</p>
                  </div>
                )}
                {c.notas && (
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-label-md text-on-surface-variant uppercase mb-1">Notas</p>
                    <p className="text-body-lg font-semibold text-on-surface">{c.notas}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Oportunidades asociadas */}
            <section className="bg-white rounded-lg custom-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-container-padding py-4 border-b border-outline-variant/30 flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">monetization_on</span>
                <h3 className="font-headline-sm text-headline-sm">Oportunidades Asociadas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30">
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase">Empresa</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase">Modelo</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase">Monto</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase">Etapa</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase">
                        Cierre estimado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.oportunidades.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => navigate(`/oportunidades/${o.id}`)}
                      >
                        <td className="px-6 py-4 font-semibold text-brand-cyan">{o.empresa.razon_social}</td>
                        <td className="px-6 py-4 text-on-surface">{o.modelo.codigo}</td>
                        <td className="px-6 py-4 text-on-surface">{formatoMonto(o.monto_total)}</td>
                        <td className="px-6 py-4">
                          <EtapaTag etapa={o.estado} />
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {o.fecha_cierre_estimado ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {c.oportunidades.length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-on-surface-variant" colSpan={5}>
                          Sin oportunidades registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Columna derecha (30%) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            {/* Empresas relacionadas */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-cyan">domain</span>
                Empresas Relacionadas
              </h3>
              <div className="flex flex-col gap-3">
                {c.empresas.length === 0 && (
                  <p className="text-body-md text-on-surface-variant">Sin empresas vinculadas</p>
                )}
                {c.empresas.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-4 p-3 border border-outline-variant/40 rounded hover:border-brand-cyan transition-colors cursor-pointer group"
                    onClick={() => navigate(`/empresas/${e.id}`)}
                  >
                    <div className="w-12 h-12 bg-surface-container-highest rounded flex items-center justify-center text-primary font-bold shrink-0">
                      {e.razon_social.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface group-hover:text-brand-cyan transition-colors">
                        {e.razon_social}
                      </p>
                      <p className="text-label-md text-on-surface-variant">
                        {e.cargo ?? '—'}
                        {e.segmentos.length > 0 ? ` · ${e.segmentos.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Actividad reciente */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Actividad Reciente</h3>
              <div className="relative flex flex-col gap-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/40">
                {c.actividades.length === 0 && (
                  <p className="text-body-md text-on-surface-variant pl-8">Sin actividad reciente</p>
                )}
                {c.actividades.map((a: ContactoActividad) => (
                  <div key={`${a.tipo}-${a.id}`} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 bg-white border border-brand-cyan rounded-full flex items-center justify-center z-10">
                      <Icono nombre={ICONO_ACTIVIDAD[a.tipo]} tamano={14} color="var(--c-brand-cyan, #0799b6)" />
                    </div>
                    <p className="text-sm font-bold text-on-surface">{tituloActividad(a)}</p>
                    {a.descripcion && (
                      <p className="text-xs text-on-surface-variant mt-1">{a.descripcion}</p>
                    )}
                    <span className="text-[10px] text-outline font-bold mt-2 inline-block uppercase">
                      {formatoFechaHora(a.fecha)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <EditarContactoModal contacto={c} open={modalEditar} onClose={() => setModalEditar(false)} />
    </main>
  )
}
