import { useEffect, useState } from 'react'
import { App, Button, DatePicker, Input, Modal } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { mensajeDeError } from '@/api/client'
import type { ActualizarEventoInput, Evento } from '@/types'
import { etiquetaEtapa } from '@/utils/etiquetas'
import { formatoFecha } from '@/utils/formato'
import { CampoEditable } from './CampoEditable'

const ETIQUETA_ESTADO_EVENTO: Record<Evento['estado'], string> = {
  pendiente: 'Pendiente',
  ocurrido: 'Ocurrido',
  descartado: 'Descartado',
}

interface Props {
  /** Evento a mostrar; `null` mantiene el modal cerrado */
  evento: Evento | null
  onClose: () => void
  /** Persiste los cambios (PUT /eventos/:id). Debe rechazar en error. */
  onSave: (input: ActualizarEventoInput) => Promise<unknown>
  guardando: boolean
  irADetalle?: () => void
}

interface Borrador {
  fecha_estimada: Dayjs | null
  fecha_seguimiento: Dayjs | null
  descripcion: string
}

type Campo = keyof Borrador

const iso = (d: Dayjs | null) => (d ? d.format('YYYY-MM-DD') : null)

/**
 * Ficha de un evento con edición campo a campo (lápiz sutil por campo).
 * Solo los eventos `pendiente` son editables (según contrato PUT /eventos/:id).
 * Cerrar sin guardar descarta los cambios.
 */
export function EventoDetalleModal({ evento, onClose, onSave, guardando, irADetalle }: Props) {
  const { message } = App.useApp()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [editando, setEditando] = useState<Record<Campo, boolean>>({
    fecha_estimada: false,
    fecha_seguimiento: false,
    descripcion: false,
  })

  useEffect(() => {
    if (!evento) return
    setBorrador({
      fecha_estimada: evento.fecha_estimada ? dayjs(evento.fecha_estimada) : null,
      fecha_seguimiento: evento.fecha_seguimiento ? dayjs(evento.fecha_seguimiento) : null,
      descripcion: evento.descripcion ?? '',
    })
    setEditando({ fecha_estimada: false, fecha_seguimiento: false, descripcion: false })
  }, [evento])

  if (!evento || !borrador) {
    return <Modal open={false} footer={null} />
  }

  const esPendiente = evento.estado === 'pendiente'

  const toggle = (campo: Campo) => setEditando((e) => ({ ...e, [campo]: !e[campo] }))
  const set = <K extends Campo>(campo: K, valor: Borrador[K]) =>
    setBorrador((b) => (b ? { ...b, [campo]: valor } : b))

  const cambios: ActualizarEventoInput = {}
  if (iso(borrador.fecha_estimada) !== (evento.fecha_estimada ?? null))
    cambios.fecha_estimada = iso(borrador.fecha_estimada)
  if (iso(borrador.fecha_seguimiento) !== (evento.fecha_seguimiento ?? null))
    cambios.fecha_seguimiento = iso(borrador.fecha_seguimiento)
  if (borrador.descripcion !== (evento.descripcion ?? ''))
    cambios.descripcion = borrador.descripcion || null
  const hayCambios = Object.keys(cambios).length > 0

  const guardar = async () => {
    if (!hayCambios) {
      onClose()
      return
    }
    try {
      await onSave(cambios)
      message.success('Evento actualizado')
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo actualizar el evento'))
    }
  }

  return (
    <Modal
      title={evento.nombre}
      open
      onCancel={onClose}
      width={560}
      footer={
        <div className="flex items-center justify-between">
          <span>
            {irADetalle && (
              <Button type="link" onClick={irADetalle} style={{ paddingLeft: 0 }}>
                Ver detalle relacionado
              </Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            {esPendiente && (
              <Button type="primary" loading={guardando} disabled={!hayCambios} onClick={() => void guardar()}>
                Guardar
              </Button>
            )}
          </span>
        </div>
      }
    >
      {!esPendiente && (
        <p className="text-body-md text-on-surface-variant mb-4">
          Este evento está <strong>{ETIQUETA_ESTADO_EVENTO[evento.estado].toLowerCase()}</strong>; solo los
          eventos pendientes se pueden editar.
        </p>
      )}

      {evento.dispara_cambio_estado && evento.estado_destino && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-md font-bold mb-4">
          Dispara → {etiquetaEtapa(evento.estado_destino)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-y-5 gap-x-8">
        <CampoEditable
          label="Fecha estimada"
          editable={esPendiente}
          enEdicion={editando.fecha_estimada}
          onToggle={() => toggle('fecha_estimada')}
          display={formatoFecha(iso(borrador.fecha_estimada))}
          edit={
            <DatePicker
              autoFocus
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={borrador.fecha_estimada}
              onChange={(v) => set('fecha_estimada', v)}
            />
          }
        />

        <CampoEditable
          label="Fecha de seguimiento"
          editable={esPendiente}
          enEdicion={editando.fecha_seguimiento}
          onToggle={() => toggle('fecha_seguimiento')}
          display={formatoFecha(iso(borrador.fecha_seguimiento))}
          edit={
            <DatePicker
              autoFocus
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={borrador.fecha_seguimiento}
              onChange={(v) => set('fecha_seguimiento', v)}
            />
          }
        />

        <CampoEditable label="Estado" display={ETIQUETA_ESTADO_EVENTO[evento.estado]} />

        <CampoEditable
          label="Descripción"
          ancho
          editable={esPendiente}
          enEdicion={editando.descripcion}
          onToggle={() => toggle('descripcion')}
          display={borrador.descripcion || '—'}
          edit={
            <Input.TextArea
              autoFocus
              rows={3}
              value={borrador.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          }
        />
      </div>
    </Modal>
  )
}
