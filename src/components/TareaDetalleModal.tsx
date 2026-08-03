import { useEffect, useState } from 'react'
import { App, Button, DatePicker, Input, Modal, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { mensajeDeError } from '@/api/client'
import type { ActualizarTareaInput, EmpleadoResumen, Tarea, TipoAccion } from '@/types'
import { ETIQUETA_ESTADO_ACCION, ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { formatoFechaHora, iniciales, nombreCompleto } from '@/utils/formato'
import { CampoEditable } from './CampoEditable'
import { EmpleadoMultiSelect, EmpleadoSelect } from './EmpleadoSelect'

type ContactoOpcion = { id: number; nombres: string; apellidos: string }

interface Props {
  /** Tarea a mostrar; `null` mantiene el modal cerrado */
  tarea: Tarea | null
  onClose: () => void
  /** Persiste los cambios (PUT /tareas/:id). Debe rechazar en error. */
  onSave: (input: ActualizarTareaInput) => Promise<unknown>
  guardando: boolean
  /** Contactos seleccionables para `id_contacto`. Si no se pasan, el campo es de solo lectura. */
  contactos?: ContactoOpcion[]
  /** Empleados que el usuario logueado puede elegir como responsable/colaborador (ver useEmpleadosSeleccionables). */
  empleados: EmpleadoResumen[]
  /** Navega al detalle relacionado (opcional, se muestra como enlace en el pie) */
  irADetalle?: () => void
}

interface Borrador {
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_contacto: number | null
  id_asignado: number
  ids_colaboradores: number[]
}

type Campo = keyof Borrador

function mismoConjunto(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((x) => setB.has(x))
}

/**
 * Ficha de una tarea con edición campo a campo (lápiz sutil por campo).
 * Solo las tareas `pendiente` son editables (según contrato PUT /tareas/:id).
 * Cerrar sin guardar descarta los cambios.
 */
export function TareaDetalleModal({
  tarea,
  onClose,
  onSave,
  guardando,
  contactos,
  empleados,
  irADetalle,
}: Props) {
  const { message } = App.useApp()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [editando, setEditando] = useState<Record<Campo, boolean>>({
    tipo_accion: false,
    descripcion: false,
    fecha_ejecucion: false,
    id_contacto: false,
    id_asignado: false,
    ids_colaboradores: false,
  })

  // Reinicia el borrador cada vez que se abre otra tarea (o se reabre la misma)
  useEffect(() => {
    if (!tarea) return
    setBorrador({
      tipo_accion: tarea.tipo_accion,
      descripcion: tarea.descripcion,
      fecha_ejecucion: dayjs(tarea.fecha_ejecucion),
      id_contacto: tarea.id_contacto,
      id_asignado: tarea.id_asignado,
      ids_colaboradores: tarea.ids_colaboradores ?? [],
    })
    setEditando({
      tipo_accion: false,
      descripcion: false,
      fecha_ejecucion: false,
      id_contacto: false,
      id_asignado: false,
      ids_colaboradores: false,
    })
  }, [tarea])

  if (!tarea || !borrador) {
    return <Modal open={false} footer={null} />
  }

  const esPendiente = tarea.estado_accion === 'pendiente'
  const puedeEditarContacto = esPendiente && !!contactos
  const puedeEditarAsignado = esPendiente
  const puedeEditarColaboradores = esPendiente

  const toggle = (campo: Campo) => setEditando((e) => ({ ...e, [campo]: !e[campo] }))
  const set = <K extends Campo>(campo: K, valor: Borrador[K]) =>
    setBorrador((b) => (b ? { ...b, [campo]: valor } : b))

  const cambios: ActualizarTareaInput = {}
  if (borrador.tipo_accion !== tarea.tipo_accion) cambios.tipo_accion = borrador.tipo_accion
  if (borrador.descripcion !== tarea.descripcion) cambios.descripcion = borrador.descripcion
  if (!borrador.fecha_ejecucion.isSame(dayjs(tarea.fecha_ejecucion)))
    cambios.fecha_ejecucion = borrador.fecha_ejecucion.toISOString()
  if (borrador.id_contacto !== tarea.id_contacto) cambios.id_contacto = borrador.id_contacto
  if (borrador.id_asignado !== tarea.id_asignado) cambios.id_asignado = borrador.id_asignado
  if (!mismoConjunto(borrador.ids_colaboradores, tarea.ids_colaboradores ?? []))
    cambios.ids_colaboradores = borrador.ids_colaboradores
  const hayCambios = Object.keys(cambios).length > 0

  const guardar = async () => {
    if (!hayCambios) {
      onClose()
      return
    }
    try {
      await onSave(cambios)
      message.success('Tarea actualizada')
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo actualizar la tarea'))
    }
  }

  const buscarEmpleado = (id: number): EmpleadoResumen | null =>
    empleados.find((e) => e.id === id) ?? (tarea.colaboradores ?? []).find((c) => c.id === id) ?? null

  return (
    <Modal
      title={`Tarea ID-${tarea.id}`}
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
          Esta tarea está <strong>{ETIQUETA_ESTADO_ACCION[tarea.estado_accion].toLowerCase()}</strong>; solo las
          tareas pendientes se pueden editar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-y-5 gap-x-8">
        <CampoEditable label="Empresa" ancho display={tarea.empresa.razon_social} />

        <CampoEditable
          label="Tipo de acción"
          editable={esPendiente}
          enEdicion={editando.tipo_accion}
          onToggle={() => toggle('tipo_accion')}
          display={ETIQUETA_TIPO_ACCION[borrador.tipo_accion]}
          edit={
            <Select
              autoFocus
              style={{ width: '100%' }}
              value={borrador.tipo_accion}
              onChange={(v) => set('tipo_accion', v)}
              options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))}
            />
          }
        />

        <CampoEditable
          label="Fecha y hora"
          editable={esPendiente}
          enEdicion={editando.fecha_ejecucion}
          onToggle={() => toggle('fecha_ejecucion')}
          display={formatoFechaHora(borrador.fecha_ejecucion.toISOString())}
          edit={
            <DatePicker
              autoFocus
              style={{ width: '100%' }}
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              allowClear={false}
              value={borrador.fecha_ejecucion}
              onChange={(v) => v && set('fecha_ejecucion', v)}
            />
          }
        />

        <CampoEditable
          label="Contacto"
          editable={puedeEditarContacto}
          enEdicion={editando.id_contacto}
          onToggle={() => toggle('id_contacto')}
          display={
            borrador.id_contacto
              ? (contactos?.find((c) => c.id === borrador.id_contacto)
                  ? nombreCompleto(contactos.find((c) => c.id === borrador.id_contacto))
                  : nombreCompleto(tarea.contacto))
              : '—'
          }
          edit={
            <Select
              autoFocus
              allowClear
              style={{ width: '100%' }}
              placeholder="Sin contacto"
              value={borrador.id_contacto ?? undefined}
              onChange={(v) => set('id_contacto', v ?? null)}
              options={(contactos ?? []).map((c) => ({ value: c.id, label: nombreCompleto(c) }))}
            />
          }
        />

        <CampoEditable
          label="Asignado"
          editable={puedeEditarAsignado}
          enEdicion={editando.id_asignado}
          onToggle={() => toggle('id_asignado')}
          display={nombreCompleto(buscarEmpleado(borrador.id_asignado) ?? tarea.asignado)}
          edit={
            <EmpleadoSelect
              autoFocus
              empleados={empleados}
              value={borrador.id_asignado}
              onChange={(v) => v !== undefined && set('id_asignado', v)}
            />
          }
        />

        <CampoEditable label="Estado" display={ETIQUETA_ESTADO_ACCION[tarea.estado_accion]} />

        <CampoEditable
          label="Colaboradores"
          ancho
          editable={puedeEditarColaboradores}
          enEdicion={editando.ids_colaboradores}
          onToggle={() => toggle('ids_colaboradores')}
          display={
            borrador.ids_colaboradores.length === 0 ? (
              '—'
            ) : (
              <div className="flex -space-x-2">
                {borrador.ids_colaboradores.map((id) => {
                  const c = buscarEmpleado(id)
                  return (
                    <div
                      key={id}
                      title={nombreCompleto(c)}
                      className="w-6 h-6 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                    >
                      {iniciales(c?.nombres, c?.apellidos)}
                    </div>
                  )
                })}
              </div>
            )
          }
          edit={
            <EmpleadoMultiSelect
              autoFocus
              empleados={empleados}
              value={borrador.ids_colaboradores}
              onChange={(v) => set('ids_colaboradores', v)}
            />
          }
        />

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
