import { useState } from 'react'
import { App, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useActualizarEmpresa,
  useCambiarCarteraMaestra,
  useCambiarEstadoCartera,
  useDesvincularContacto,
  useEmpresa,
  useReasignarVendedor,
} from '@/hooks/useEmpresas'
import { useEliminarOportunidad, useOportunidades } from '@/hooks/useOportunidades'
import {
  useActualizarEventoEmpresa,
  useActualizarTarea,
  useEventosDeEmpresa,
  useMarcarEventoEmpresaDescartado,
  useMarcarEventoEmpresaOcurrido,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useEmpleadosSeleccionables, useVendedoresAsignables } from '@/hooks/useCatalogos'
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
import {
  useAuthStore,
  ROLES_ADMIN,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SUPERVISION,
  tieneRol,
} from '@/store/authStore'
import {
  ESTADOS_CARTERA_MANUALES,
  SEGMENTOS,
  type Empresa,
  type EstadoCartera,
  type Evento,
  type Tarea,
} from '@/types'
import { ETIQUETA_CARTERA, ETIQUETA_SEGMENTO, etiquetaEtapa } from '@/utils/etiquetas'
import { formatoFecha, formatoMonto, iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { NeutralTag } from '@/components/EstadoTag'
import { NuevaOportunidadModal } from '@/components/NuevaOportunidadModal'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { EventoDetalleModal } from '@/components/EventoDetalleModal'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
import { EliminarEmpresaModal } from '@/components/EliminarEmpresaModal'
import { DocumentosDrive } from '@/components/DocumentosDrive'
import { CrearTareaModal } from '@/components/CrearTareaModal'
import { LiberarEmpresaModal } from '../Cartera/LiberarEmpresaModal'
import { AgregarContactoModal } from './AgregarContactoModal'
import { CrearEventoEmpresaModal } from './CrearEventoEmpresaModal'

export function EmpresaDetallePage() {
  const { id } = useParams()
  const idEmpresa = Number(id)
  const empresa = useEmpresa(idEmpresa)

  if (empresa.isLoading) return <Cargando />
  if (empresa.isError || !empresa.data)
    return <ErrorCarga error={empresa.error} onReintentar={() => void empresa.refetch()} />

  return <Contenido empresa={empresa.data} />
}

function Contenido({ empresa }: { empresa: Empresa }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)
  const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)

  const [modalEditar, setModalEditar] = useState(false)
  const [modalContacto, setModalContacto] = useState(false)
  const [modalOportunidad, setModalOportunidad] = useState(false)
  const [modalEvento, setModalEvento] = useState(false)
  const [modalTarea, setModalTarea] = useState(false)
  const [tabActividad, setTabActividad] = useState<'tareas' | 'eventos'>('tareas')
  const [solicitudReasignacion, setSolicitudReasignacion] = useState<SolicitudPendiente | null>(null)
  const [aLiberar, setALiberar] = useState<{ id: number; razon_social: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; razon_social: string } | null>(null)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)
  const [eventoSel, setEventoSel] = useState<Evento | null>(null)
  const [form] = Form.useForm()

  const actualizar = useActualizarEmpresa(empresa.id)
  const cambiarEstado = useCambiarEstadoCartera(empresa.id)
  const reasignar = useReasignarVendedor(empresa.id)
  const desvincular = useDesvincularContacto(empresa.id)
  const moverCarteraMaestra = useCambiarCarteraMaestra(empresa.id)
  const empleados = useVendedoresAsignables(esSupervision)
  const empleadosTareas = useEmpleadosSeleccionables()
  const oportunidades = useOportunidades({ id_empresa: empresa.id, incluir_cerradas: true })
  const tareas = useTareas({ id_empresa: empresa.id, estado_accion: 'pendiente' })
  const eventos = useEventosDeEmpresa(empresa.id)
  const marcarOcurrido = useMarcarEventoEmpresaOcurrido(empresa.id)
  const marcarDescartado = useMarcarEventoEmpresaDescartado(empresa.id)
  const actualizarTarea = useActualizarTarea()
  const actualizarEvento = useActualizarEventoEmpresa(empresa.id)
  const eliminarOportunidad = useEliminarOportunidad()

  const esDerivado =
    empresa.estado_cartera === 'oportunidad_activa' || empresa.estado_cartera === 'cliente'
  const activas = (oportunidades.data?.data ?? []).filter((o) => o.estado !== 'cerrado')

  const abrirEditar = () => {
    form.setFieldsValue({
      razon_social: empresa.razon_social,
      actividad_econ: empresa.actividad_econ,
      sector_industrial: empresa.sector_industrial,
      direccion_fiscal: empresa.direccion_fiscal,
      distrito: empresa.distrito,
      provincia: empresa.provincia,
      departamento: empresa.departamento,
      sitio_web: empresa.sitio_web,
      notas: empresa.notas,
      segmentos: empresa.segmentos,
    })
    setModalEditar(true)
  }

  const onGuardarEdicion = async () => {
    const v = await form.validateFields()
    try {
      await actualizar.mutateAsync(v)
      message.success('Empresa actualizada')
      setModalEditar(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo actualizar la empresa'))
    }
  }

  return (
    <main className="min-h-full flex flex-col bg-brand-bg">
      <div className="p-4 md:p-margin-page flex flex-col gap-gutter max-w-[1400px] mx-auto w-full">
        {/* BREADCRUMBS & ACTION HEADER (prototipo) */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <nav className="flex text-on-surface-variant text-label-md gap-2 mb-2 uppercase tracking-widest">
              <Link className="hover:text-brand-cyan" to="/cartera">
                Empresas
              </Link>
              <span>/</span>
              <span className="text-on-surface">{ETIQUETA_CARTERA[empresa.estado_cartera]}</span>
            </nav>
            <div className="flex items-center gap-3">
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">{empresa.razon_social}</h2>
              {empresa.en_cartera_maestra && <NeutralTag>Cartera Maestra</NeutralTag>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold hover:bg-brand-cyan/5 transition-colors"
              onClick={abrirEditar}
            >
              Editar Datos
            </button>
            <button
              className="btn-circular px-6 py-2 bg-brand-cyan text-white font-bold hover:opacity-90 transition-opacity"
              onClick={() => setModalOportunidad(true)}
            >
              Nueva Gestión
            </button>
            {veCarteraMaestra && !empresa.en_cartera_maestra && (
              <Popconfirm
                title="¿Mover a la Cartera Maestra?"
                description="La empresa dejará de ser visible para vendedores y jdv, y se desasignará su vendedor."
                okText="Mover"
                cancelText="Cancelar"
                onConfirm={() =>
                  moverCarteraMaestra.mutate(
                    { en_cartera_maestra: true },
                    {
                      onSuccess: () => message.success('Empresa movida a la Cartera Maestra'),
                      onError: (e) => {
                        if (codigoDeError(e) === 'CARTERA_MAESTRA_CON_OPORTUNIDADES') {
                          message.warning(
                            'No se puede mover: la empresa tiene oportunidades activas. Ciérralas primero.',
                          )
                          return
                        }
                        message.error(mensajeDeError(e))
                      },
                    },
                  )
                }
              >
                <button className="btn-circular px-6 py-2 border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors">
                  Mover a Cartera Maestra
                </button>
              </Popconfirm>
            )}
            {veCarteraMaestra && empresa.en_cartera_maestra && (
              <button
                className="btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold hover:bg-brand-cyan/5 transition-colors"
                onClick={() => setALiberar({ id: empresa.id, razon_social: empresa.razon_social })}
              >
                Liberar de Cartera Maestra
              </button>
            )}
            {esAdmin && (
              <button
                className="btn-circular px-6 py-2 border border-error text-error font-bold hover:bg-error-container/40 transition-colors"
                onClick={() => setAEliminar({ id: empresa.id, razon_social: empresa.razon_social })}
              >
                Eliminar empresa
              </button>
            )}
          </div>
        </div>

        {/* 2-COLUMN GRID */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* LEFT COLUMN (70%) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
            {/* COMPANY INFORMATION BLOCK */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-6 text-primary">
                <span className="material-symbols-outlined">info</span>
                <h3 className="font-headline-sm text-headline-sm">Información Corporativa</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Razón Social</p>
                  <p className="text-body-lg font-semibold text-on-surface">{empresa.razon_social}</p>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">
                    RUC / Identificación Fiscal
                  </p>
                  <p className="text-body-lg font-semibold text-on-surface">{empresa.ruc}</p>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Sector Económico</p>
                  <p className="text-body-lg font-semibold text-on-surface">
                    {empresa.sector_industrial ?? empresa.actividad_econ ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Sitio Web</p>
                  {empresa.sitio_web ? (
                    <a
                      className="text-body-lg font-semibold text-brand-cyan underline"
                      href={empresa.sitio_web}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {empresa.sitio_web}
                    </a>
                  ) : (
                    <p className="text-body-lg font-semibold text-on-surface">—</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Dirección Fiscal</p>
                  <p className="text-body-lg font-semibold text-on-surface">
                    {empresa.direccion_fiscal ?? '—'}
                    {empresa.distrito ? `, ${empresa.distrito}` : ''}
                    {empresa.provincia ? `, ${empresa.provincia}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Segmentos</p>
                  <div className="flex flex-wrap gap-1">
                    {empresa.segmentos.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-1 bg-surface-container-highest text-on-surface-variant rounded text-label-md font-bold uppercase"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Estado de Cartera</p>
                  {esDerivado ? (
                    <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-label-md font-bold uppercase">
                      {ETIQUETA_CARTERA[empresa.estado_cartera]} (derivado)
                    </span>
                  ) : (
                    <select
                      className="border border-outline-variant rounded p-2 bg-white focus:ring-2 focus:ring-brand-cyan outline-none font-body-md"
                      value={empresa.estado_cartera}
                      disabled={cambiarEstado.isPending}
                      onChange={(e) =>
                        cambiarEstado.mutate(e.target.value as EstadoCartera, {
                          onSuccess: () => message.success('Estado actualizado'),
                          onError: (err) => message.error(mensajeDeError(err)),
                        })
                      }
                    >
                      {ESTADOS_CARTERA_MANUALES.map((es) => (
                        <option key={es} value={es}>
                          {ETIQUETA_CARTERA[es]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Vendedor Asignado</p>
                  {esSupervision ? (
                    <select
                      className="border border-outline-variant rounded p-2 bg-white focus:ring-2 focus:ring-brand-cyan outline-none font-body-md"
                      value={empresa.id_vendedor ?? ''}
                      disabled={reasignar.isPending}
                      onChange={(e) => {
                        const idNuevo = Number(e.target.value)
                        reasignar.mutate(idNuevo, {
                          onSuccess: () => message.success('Vendedor reasignado'),
                          onError: (err) => {
                            if (codigoDeError(err) === 'PERMISO_INSUFICIENTE') {
                              const destino = (empleados.data ?? []).find((emp) => emp.id === idNuevo)
                              setSolicitudReasignacion({
                                tipo: 'reasignacion_cliente',
                                idEmpresa: empresa.id,
                                idVendedorNuevo: idNuevo,
                                nombreVendedorNuevo: destino
                                  ? `${destino.nombres} ${destino.apellidos}`
                                  : `#${idNuevo}`,
                                mensajeBackend:
                                  extraerApiError(err)?.message ??
                                  'Reasignar clientes requiere aprobación de Gerencia',
                              })
                              return
                            }
                            message.error(mensajeDeError(err))
                          },
                        })
                      }}
                    >
                      <option value="" disabled>
                        Sin asignar
                      </option>
                      {(empleados.data ?? []).map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombres} {e.apellidos}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-body-lg font-semibold text-on-surface">
                      {nombreCompleto(empresa.vendedor)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ASSOCIATED OPPORTUNITIES BLOCK */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">monetization_on</span>
                  <h3 className="font-headline-sm text-headline-sm">Oportunidades de Negocio</h3>
                </div>
                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md font-bold">
                  {activas.length} Activas
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="py-4 font-label-md text-on-surface-variant uppercase">
                        Nombre del Proyecto
                      </th>
                      <th className="py-4 font-label-md text-on-surface-variant uppercase">Monto Estimado</th>
                      <th className="py-4 font-label-md text-on-surface-variant uppercase">Etapa</th>
                      {esAdmin && (
                        <th className="py-4 font-label-md text-on-surface-variant uppercase">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(oportunidades.data?.data ?? []).map((o) => (
                      <tr
                        key={o.id}
                        className="border-outline-variant/50 transition-colors cursor-pointer hover:bg-surface-container-low"
                        onClick={() => navigate(`/oportunidades/${o.id}`)}
                      >
                        <td className="py-4">
                          <p className="font-semibold text-on-surface">
                            {o.modelo.codigo} × {o.cantidad}
                          </p>
                          <p className="text-label-md text-on-surface-variant">Ref: OP-{o.id}</p>
                        </td>
                        <td className="py-4 font-semibold text-on-surface">{formatoMonto(o.monto_total)}</td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded text-label-md font-bold uppercase ${
                              o.estado === 'facturado'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : o.estado === 'cerrado'
                                  ? 'bg-error-container text-on-error-container'
                                  : 'bg-primary-container text-on-primary-container'
                            }`}
                          >
                            {etiquetaEtapa(o.estado)}
                          </span>
                        </td>
                        {esAdmin && (
                          <td className="py-4" onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                              title="¿Eliminar esta oportunidad?"
                              description="Esta acción es irreversible."
                              okText="Eliminar"
                              okButtonProps={{ danger: true }}
                              cancelText="Cancelar"
                              onConfirm={() =>
                                eliminarOportunidad.mutate(
                                  { id: o.id, idEmpresa: empresa.id },
                                  {
                                    onSuccess: () => message.success('Oportunidad eliminada'),
                                    onError: (e) => message.error(mensajeDeError(e)),
                                  },
                                )
                              }
                            >
                              <button className="text-on-surface-variant hover:text-error">
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </Popconfirm>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(oportunidades.data?.data ?? []).length === 0 && (
                      <tr>
                        <td className="py-6 text-on-surface-variant" colSpan={esAdmin ? 4 : 3}>
                          Sin oportunidades registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                className="w-full mt-6 py-2 text-brand-cyan font-bold border-t border-outline-variant/30 hover:bg-brand-cyan/5 transition-colors"
                onClick={() => navigate('/pipeline')}
              >
                Ver todas las oportunidades
              </button>
            </section>
          </div>

          {/* RIGHT COLUMN (30%) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            {/* CONTACTS BLOCK */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">groups</span>
                  <h3 className="font-headline-sm text-headline-sm">Contactos Clave</h3>
                </div>
                <button className="text-brand-cyan" onClick={() => setModalContacto(true)}>
                  <span className="material-symbols-outlined">person_add</span>
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {empresa.contactos.length === 0 && (
                  <p className="text-body-md text-on-surface-variant">Sin contactos registrados</p>
                )}
                {empresa.contactos.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded border-outline-variant/20">
                    <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-xs">
                      {iniciales(c.nombres, c.apellidos)}
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">
                        {c.nombres} {c.apellidos}
                        {c.es_principal && (
                          <span className="ml-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Principal
                          </span>
                        )}
                      </p>
                      <p className="text-label-md text-on-surface-variant">
                        {c.cargo ?? '—'}
                        {c.toma_decision ? ' · Decide' : ''}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      {c.tlf_1 && (
                        <a className="text-on-surface-variant hover:text-brand-cyan" href={`tel:${c.tlf_1}`}>
                          <span className="material-symbols-outlined">call</span>
                        </a>
                      )}
                      {c.email_1 && (
                        <a className="text-on-surface-variant hover:text-brand-cyan" href={`mailto:${c.email_1}`}>
                          <span className="material-symbols-outlined">mail</span>
                        </a>
                      )}
                      <Popconfirm
                        title="¿Desvincular contacto de esta empresa?"
                        okText="Desvincular"
                        cancelText="Cancelar"
                        onConfirm={() =>
                          desvincular.mutate(c.id, {
                            onSuccess: () => message.success('Contacto desvinculado'),
                            onError: (e) => message.error(mensajeDeError(e)),
                          })
                        }
                      >
                        <button className="text-on-surface-variant hover:text-error">
                          <span className="material-symbols-outlined">link_off</span>
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* DOCUMENTOS EN DRIVE */}
            {/* key fuerza remount al cambiar de entidad: el estado local de
                errorSubida/ultimoArchivo no debe sobrevivir un cambio de id
                (si no, el error/reintento de una empresa puede aplicarse a otra
                ya en caché). No quitar aunque parezca superfluo. */}
            <DocumentosDrive
              key={`empresa-${empresa.id}`}
              tipo="empresa"
              id={empresa.id}
              driveFolderId={empresa.drive_folder_id}
              nombreFile="File del Cliente"
            />

            {/* ACTIVITIES BLOCK */}
            <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-6 text-primary border-b border-outline-variant/30 pb-4">
                <span className="material-symbols-outlined">assignment</span>
                <h3 className="font-headline-sm text-headline-sm">Actividades Recientes</h3>
              </div>
              <div className="flex gap-4 mb-6 border-b border-outline-variant/20">
                <button
                  className={
                    tabActividad === 'tareas'
                      ? 'pb-2 border-b-2 border-brand-cyan text-brand-cyan font-bold text-label-md uppercase tracking-widest'
                      : 'pb-2 text-on-surface-variant font-semibold text-label-md uppercase tracking-widest hover:text-brand-cyan transition-colors'
                  }
                  onClick={() => setTabActividad('tareas')}
                >
                  Tareas
                </button>
                <button
                  className={
                    tabActividad === 'eventos'
                      ? 'pb-2 border-b-2 border-brand-cyan text-brand-cyan font-bold text-label-md uppercase tracking-widest'
                      : 'pb-2 text-on-surface-variant font-semibold text-label-md uppercase tracking-widest hover:text-brand-cyan transition-colors'
                  }
                  onClick={() => setTabActividad('eventos')}
                >
                  Eventos
                </button>
              </div>
              {tabActividad === 'tareas' ? (
                <div className="relative pl-6 flex flex-col gap-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
                  {(tareas.data ?? []).length === 0 && (
                    <p className="text-body-md text-on-surface-variant">Sin tareas pendientes</p>
                  )}
                  {(tareas.data ?? []).slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="relative cursor-pointer group"
                      onClick={() => setTareaSel(t)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-on-surface group-hover:text-brand-cyan transition-colors">
                            {t.descripcion}
                          </p>
                          <span className="text-label-md text-on-surface-variant whitespace-nowrap ml-2">
                            {dayjs(t.fecha_ejecucion).format('DD MMM, hh:mm A')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EventosEmpresaLista
                  eventos={eventos.data?.pendientes ?? []}
                  cargando={eventos.isLoading}
                  onAbrir={setEventoSel}
                  onOcurrido={(id) =>
                    marcarOcurrido.mutate(
                      { idEvento: id },
                      {
                        onSuccess: () => message.success('Evento marcado como ocurrido'),
                        onError: (e) => message.error(mensajeDeError(e)),
                      },
                    )
                  }
                  onDescartar={(id) =>
                    marcarDescartado.mutate(
                      { idEvento: id },
                      {
                        onSuccess: () => message.success('Evento descartado'),
                        onError: (e) => message.error(mensajeDeError(e)),
                      },
                    )
                  }
                />
              )}
              <button
                className="w-full mt-6 py-2 text-brand-cyan font-bold border-t border-outline-variant/30 hover:bg-brand-cyan/5 transition-colors"
                onClick={() => (tabActividad === 'eventos' ? setModalEvento(true) : setModalTarea(true))}
              >
                {tabActividad === 'eventos' ? 'Registrar evento' : 'Programar nueva actividad'}
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Modal edición (antd) */}
      <Modal
        title="Editar empresa"
        open={modalEditar}
        onCancel={() => setModalEditar(false)}
        onOk={() => void onGuardarEdicion()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={actualizar.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="razon_social" label="Razón social" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="segmentos" label="Segmentos" rules={[{ required: true, message: 'Requerido' }]}>
            <Select
              mode="multiple"
              options={SEGMENTOS.map((s) => ({ value: s, label: ETIQUETA_SEGMENTO[s] }))}
            />
          </Form.Item>
          <Form.Item name="actividad_econ" label="Actividad económica">
            <Input />
          </Form.Item>
          <Form.Item name="sector_industrial" label="Sector industrial">
            <Input />
          </Form.Item>
          <Form.Item name="direccion_fiscal" label="Dirección fiscal">
            <Input />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Form.Item name="distrito" label="Distrito">
              <Input />
            </Form.Item>
            <Form.Item name="provincia" label="Provincia">
              <Input />
            </Form.Item>
            <Form.Item name="departamento" label="Departamento">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="sitio_web" label="Sitio web">
            <Input />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <AgregarContactoModal idEmpresa={empresa.id} open={modalContacto} onClose={() => setModalContacto(false)} />
      <NuevaOportunidadModal
        open={modalOportunidad}
        onClose={() => setModalOportunidad(false)}
        empresaPreseleccionada={{
          id: empresa.id,
          razon_social: empresa.razon_social,
          id_vendedor: empresa.id_vendedor,
        }}
      />
      <CrearEventoEmpresaModal
        idEmpresa={empresa.id}
        open={modalEvento}
        onClose={() => setModalEvento(false)}
      />
      <CrearTareaModal
        open={modalTarea}
        onClose={() => setModalTarea(false)}
        empresaPreseleccionada={{ id: empresa.id, razon_social: empresa.razon_social }}
        contactos={empresa.contactos}
      />
      <SolicitudModal
        solicitud={solicitudReasignacion}
        onClose={() => setSolicitudReasignacion(null)}
      />
      <LiberarEmpresaModal empresa={aLiberar} onClose={() => setALiberar(null)} />
      <EliminarEmpresaModal
        empresa={aEliminar}
        onClose={() => setAEliminar(null)}
        onEliminada={() => navigate('/cartera')}
      />
      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizarTarea.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizarTarea.isPending}
        contactos={empresa.contactos}
        empleados={empleadosTareas}
      />
      <EventoDetalleModal
        evento={eventoSel}
        onClose={() => setEventoSel(null)}
        onSave={(input) => actualizarEvento.mutateAsync({ idEvento: eventoSel!.id, input })}
        guardando={actualizarEvento.isPending}
      />
    </main>
  )
}

/** Lista de eventos pendientes de la empresa (tab "Eventos" del bloque de actividades) */
function EventosEmpresaLista({
  eventos,
  cargando,
  onAbrir,
  onOcurrido,
  onDescartar,
}: {
  eventos: Evento[]
  cargando: boolean
  onAbrir: (evento: Evento) => void
  onOcurrido: (idEvento: number) => void
  onDescartar: (idEvento: number) => void
}) {
  if (cargando) {
    return <p className="text-body-md text-on-surface-variant">Cargando eventos…</p>
  }
  if (eventos.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Sin eventos pendientes</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {eventos.map((ev) => (
        <div
          key={ev.id}
          className="p-3 border border-outline-variant/30 rounded cursor-pointer hover:border-brand-cyan transition-colors"
          onClick={() => onAbrir(ev)}
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-semibold text-on-surface">
                {ev.nombre}
                {ev.es_hito_prospeccion && (
                  <span className="ml-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    Hito
                  </span>
                )}
              </p>
              <p className="text-label-md text-on-surface-variant">
                Estimado: {formatoFecha(ev.fecha_estimada)}
                {ev.fecha_seguimiento ? ` · Seguimiento: ${formatoFecha(ev.fecha_seguimiento)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              className="flex-1 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-label-md font-bold hover:opacity-90 transition-all"
              onClick={() => onOcurrido(ev.id)}
            >
              Marcar ocurrido
            </button>
            <Popconfirm
              title="¿Descartar este evento?"
              okText="Descartar"
              cancelText="No"
              onConfirm={() => onDescartar(ev.id)}
            >
              <button className="flex-1 py-1.5 border border-outline-variant rounded-full text-label-md font-bold text-on-surface-variant hover:bg-surface-container-low transition-all">
                Descartar
              </button>
            </Popconfirm>
          </div>
        </div>
      ))}
    </div>
  )
}
