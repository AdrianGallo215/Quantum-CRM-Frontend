import { useState } from 'react'
import { App, DatePicker, Form, Input, Modal, Popconfirm, Radio, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  useActualizarEvento,
  useCrearEvento,
  useEventosDeOportunidad,
  useMarcarEventoDescartado,
  useMarcarEventoOcurrido,
} from '@/hooks/useEventosTareas'
import { useCambiarEstadoOportunidad } from '@/hooks/useOportunidades'
import { useCatalogoEventos } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Evento, OportunidadDetalle, SugerenciaCambioEstado } from '@/types'
import { ETIQUETA_ETAPA, etiquetaEtapa } from '@/utils/etiquetas'
import { formatoFecha, formatoFechaHora } from '@/utils/formato'
import { EventoDetalleModal } from '@/components/EventoDetalleModal'

interface FormValues {
  tipo: 'catalogo' | 'personalizado'
  id_catalogo_evento?: number
  nombre_personalizado?: string
  fecha_estimada?: Dayjs | null
  fecha_seguimiento?: Dayjs | null
  descripcion?: string
}

/** Sección de eventos con las event-cards del prototipo gestión_de_actividades */
export function EventosCard({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message, notification } = App.useApp()
  const [modalNuevo, setModalNuevo] = useState(false)
  const [form] = Form.useForm<FormValues>()
  const tipoEvento = Form.useWatch('tipo', form)
  const [sugerencia, setSugerencia] = useState<SugerenciaCambioEstado | null>(null)
  const [eventoSel, setEventoSel] = useState<Evento | null>(null)

  const eventos = useEventosDeOportunidad(o.id)
  const catalogo = useCatalogoEventos()
  const crear = useCrearEvento(o.id)
  const marcarOcurrido = useMarcarEventoOcurrido(o.id)
  const marcarDescartado = useMarcarEventoDescartado(o.id)
  const actualizar = useActualizarEvento(o.id)
  const cambiarEstado = useCambiarEstadoOportunidad(o.id, o.id_empresa)

  const onCrear = async () => {
    const v = await form.validateFields()
    const fechas = {
      fecha_estimada: v.fecha_estimada ? v.fecha_estimada.format('YYYY-MM-DD') : null,
      fecha_seguimiento: v.fecha_seguimiento ? v.fecha_seguimiento.format('YYYY-MM-DD') : null,
      descripcion: v.descripcion ?? null,
    }
    try {
      if (v.tipo === 'personalizado') {
        await crear.mutateAsync({
          es_personalizado: true,
          nombre_personalizado: v.nombre_personalizado ?? '',
          ...fechas,
        })
      } else {
        await crear.mutateAsync({ id_catalogo_evento: v.id_catalogo_evento ?? 0, ...fechas })
      }
      message.success('Evento registrado')
      form.resetFields()
      setModalNuevo(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo registrar el evento'))
    }
  }

  /** Marcar ocurrido NO cambia el estado: la sugerencia requiere confirmación (2ª llamada) */
  const onMarcarOcurrido = (idEvento: number) => {
    marcarOcurrido.mutate(
      { idEvento },
      {
        onSuccess: (res) => {
          message.success('Evento marcado como ocurrido')
          if (res.sugerencia?.dispara) setSugerencia(res.sugerencia)
        },
        onError: (e) => message.error(mensajeDeError(e)),
      },
    )
  }

  const confirmarSugerencia = () => {
    if (!sugerencia) return
    cambiarEstado.mutate(
      { estado: sugerencia.estado_destino },
      {
        onSuccess: (res) => {
          message.success(`Oportunidad movida a ${ETIQUETA_ETAPA[res.estado]}`)
          for (const adv of res.advertencias) {
            notification.warning({ message: 'Advertencia', description: adv })
          }
          setSugerencia(null)
        },
        onError: (e) => {
          message.error(mensajeDeError(e, 'No se pudo cambiar el estado'))
          setSugerencia(null)
        },
      },
    )
  }

  const pendientes = eventos.data?.pendientes ?? []
  const ocurridos = eventos.data?.ocurridos ?? []

  return (
    <section className="space-y-gutter">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
            hub
          </span>
          <h2 className="font-headline-md text-headline-md">Eventos Operativos</h2>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-tertiary text-on-tertiary rounded-full text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all"
            onClick={() => setModalNuevo(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo evento
          </button>
        </div>
      </div>

      {pendientes.length === 0 && !eventos.isLoading && (
        <div className="bg-white border border-border-subtle rounded-lg p-6 text-center text-on-surface-variant">
          Sin eventos pendientes
        </div>
      )}

      {pendientes.map((ev) => (
        <TarjetaEvento
          key={ev.id}
          evento={ev}
          onAbrir={() => setEventoSel(ev)}
          onOcurrido={() => onMarcarOcurrido(ev.id)}
          onDescartar={() =>
            marcarDescartado.mutate(
              { idEvento: ev.id },
              {
                onSuccess: () => message.success('Evento descartado'),
                onError: (e) => message.error(mensajeDeError(e)),
              },
            )
          }
        />
      ))}

      {ocurridos.length > 0 && (
        <details>
          <summary className="cursor-pointer text-primary font-bold text-label-md uppercase tracking-widest py-2">
            Ocurridos ({ocurridos.length})
          </summary>
          <div className="space-y-3 mt-2">
            {ocurridos.map((ev) => (
              <div
                key={ev.id}
                className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary transition-all"
                onClick={() => setEventoSel(ev)}
              >
                <span className="material-symbols-outlined text-secondary">check_circle</span>
                <div>
                  <p className="font-bold text-on-surface">{ev.nombre}</p>
                  <p className="text-label-md text-on-surface-variant">
                    {formatoFechaHora(ev.fecha_ocurrencia)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <EventoDetalleModal
        evento={eventoSel}
        onClose={() => setEventoSel(null)}
        onSave={(input) => actualizar.mutateAsync({ idEvento: eventoSel!.id, input })}
        guardando={actualizar.isPending}
      />

      {/* Modal de sugerencia NO invasivo: confirmar = segunda llamada; descartar = nada */}
      <Modal
        title="Sugerencia de avance"
        open={sugerencia !== null}
        onCancel={() => setSugerencia(null)}
        okText="Sí, mover"
        cancelText="Ahora no"
        confirmLoading={cambiarEstado.isPending}
        onOk={confirmarSugerencia}
      >
        <p>{sugerencia?.mensaje}</p>
        <p style={{ color: '#747781', fontSize: 13 }}>
          Si eliges «Ahora no», la oportunidad se queda en su etapa actual.
        </p>
      </Modal>

      {/* Modal de creación */}
      <Modal
        title="Nuevo evento"
        open={modalNuevo}
        onCancel={() => setModalNuevo(false)}
        onOk={() => void onCrear()}
        okText="Registrar"
        cancelText="Cancelar"
        confirmLoading={crear.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ tipo: 'catalogo' }}>
          <Form.Item name="tipo">
            <Radio.Group>
              <Radio.Button value="catalogo">Del catálogo</Radio.Button>
              <Radio.Button value="personalizado">Personalizado</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {tipoEvento !== 'personalizado' ? (
            <Form.Item
              name="id_catalogo_evento"
              label="Evento del catálogo"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Select
                loading={catalogo.isLoading}
                showSearch
                optionFilterProp="label"
                options={(catalogo.data ?? [])
                  .filter((c) => !c.es_hito_prospeccion)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.nombre}${c.etapa_asociada ? ` (${etiquetaEtapa(c.etapa_asociada)})` : ''}`,
                  }))}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="nombre_personalizado"
              label="Nombre del evento"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Input placeholder="Reunión con asesor legal del cliente" />
            </Form.Item>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="fecha_estimada" label="Fecha estimada">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="fecha_seguimiento" label="Fecha de seguimiento">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

/** Event card del prototipo gestión_de_actividades: bloque de fecha + contenido */
function TarjetaEvento({
  evento: ev,
  onAbrir,
  onOcurrido,
  onDescartar,
}: {
  evento: Evento
  onAbrir: () => void
  onOcurrido: () => void
  onDescartar: () => void
}) {
  const fecha = ev.fecha_estimada ? dayjs(ev.fecha_estimada) : null
  const seguimientoVencido =
    ev.fecha_seguimiento && dayjs(ev.fecha_seguimiento).isBefore(dayjs(), 'day')

  return (
    <div
      className="bg-white border border-border-subtle rounded-lg overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] cursor-pointer"
      onClick={onAbrir}
    >
      <div className="w-full sm:w-48 bg-surface-container-low p-6 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r border-border-subtle">
        <div className="text-label-md font-bold text-text-muted mb-1 uppercase tracking-widest">
          {fecha ? fecha.format('MMM YYYY') : 'Sin fecha'}
        </div>
        <div className={`text-[48px] font-bold leading-none ${seguimientoVencido ? 'text-error' : 'text-tertiary'}`}>
          {fecha ? fecha.format('DD') : '—'}
        </div>
        <div className={`text-label-md font-bold mt-1 ${seguimientoVencido ? 'text-error' : 'text-tertiary'}`}>
          {seguimientoVencido ? 'Seguimiento vencido' : 'Pendiente'}
        </div>
      </div>
      <div className="flex-grow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            {ev.dispara_cambio_estado && ev.estado_destino && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-md font-bold mb-3">
                <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                Dispara → {etiquetaEtapa(ev.estado_destino)}
              </div>
            )}
            <h3 className="text-headline-md font-bold text-on-surface">{ev.nombre}</h3>
          </div>
        </div>
        {ev.descripcion && (
          <p className="text-body-md text-text-muted mb-6 leading-relaxed">{ev.descripcion}</p>
        )}
        <div className="flex flex-wrap items-center gap-6 border-t border-border-subtle pt-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[20px]">event</span>
            <span className="text-body-md font-medium text-on-surface">
              Seguimiento: {formatoFecha(ev.fecha_seguimiento)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <Popconfirm
              title="¿Descartar este evento?"
              okText="Descartar"
              cancelText="No"
              onConfirm={onDescartar}
            >
              <button className="text-error font-bold text-button hover:underline">Descartar</button>
            </Popconfirm>
            <button className="text-primary font-bold text-button hover:underline" onClick={onOcurrido}>
              Marcar ocurrido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
