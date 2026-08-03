import { useState } from 'react'
import { App, DatePicker, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  useActualizarTarea,
  useCancelarTarea,
  useCompletarTarea,
  useCrearTarea,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { OportunidadDetalle, Tarea, TipoAccion } from '@/types'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { EmpleadoMultiSelect, EmpleadoSelect } from '@/components/EmpleadoSelect'

interface FormValues {
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_contacto?: number
  id_asignado?: number
  ids_colaboradores?: number[]
}

/** Sección de tareas con los task-items del prototipo gestión_de_actividades */
export function TareasCard({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const [modalNueva, setModalNueva] = useState(false)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)
  const [form] = Form.useForm<FormValues>()

  const empleados = useEmpleadosSeleccionables()

  const tareas = useTareas({ id_oportunidad: o.id })
  const crear = useCrearTarea()
  const completar = useCompletarTarea(o.id)
  const cancelar = useCancelarTarea(o.id)
  const actualizar = useActualizarTarea(o.id)

  const lista = tareas.data ?? []
  const pendientes = lista.filter((t) => t.estado_accion === 'pendiente')
  const historicas = lista.filter((t) => t.estado_accion !== 'pendiente')

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        id_empresa: o.id_empresa,
        id_oportunidad: o.id,
        id_contacto: v.id_contacto ?? null,
        id_asignado: v.id_asignado ?? null,
        ids_colaboradores: v.ids_colaboradores ?? [],
        tipo_accion: v.tipo_accion,
        descripcion: v.descripcion,
        fecha_ejecucion: v.fecha_ejecucion.toISOString(),
      })
      message.success('Tarea creada')
      form.resetFields()
      setModalNueva(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo crear la tarea'))
    }
  }

  return (
    <section className="bg-surface-container-low rounded-lg border border-border-subtle flex flex-col">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            assignment
          </span>
          <h2 className="font-headline-md text-headline-md">Tareas</h2>
        </div>
        <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md font-bold">
          {pendientes.length} pendientes
        </span>
      </div>

      <div className="flex-grow p-4 space-y-3 custom-scrollbar">
        {pendientes.length === 0 && !tareas.isLoading && (
          <p className="text-center text-on-surface-variant py-4">Sin tareas pendientes</p>
        )}
        {pendientes.map((t) => (
          <TareaItem
            key={t.id}
            tarea={t}
            onAbrir={() => setTareaSel(t)}
            onCompletar={() =>
              completar.mutate(
                { id: t.id },
                {
                  onSuccess: () => message.success('Tarea completada'),
                  onError: (e) => message.error(mensajeDeError(e)),
                },
              )
            }
            onCancelar={() =>
              cancelar.mutate(t.id, {
                onSuccess: () => message.success('Tarea cancelada'),
                onError: (e) => message.error(mensajeDeError(e)),
              })
            }
          />
        ))}

        {/* Historial colapsado por defecto */}
        {historicas.length > 0 && (
          <details>
            <summary className="cursor-pointer text-primary font-bold text-label-md uppercase tracking-widest py-2">
              Historial ({historicas.length})
            </summary>
            <div className="space-y-3 mt-2">
              {historicas.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-3 border border-border-subtle rounded-lg opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => setTareaSel(t)}
                >
                  <h3
                    className={`font-bold text-on-surface mb-1 ${t.estado_accion === 'cancelada' ? 'line-through' : ''}`}
                  >
                    {t.descripcion}
                  </h3>
                  <div className="flex items-center gap-1.5 text-label-md text-text-muted">
                    <span className="material-symbols-outlined text-[14px]">
                      {t.estado_accion === 'completada' ? 'check_circle' : 'cancel'}
                    </span>
                    {t.estado_accion} · {dayjs(t.fecha_ejecucion).format('DD MMM YYYY')}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
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

      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizar.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizar.isPending}
        contactos={o.contactos}
        empleados={empleados}
      />

      <Modal
        title="Nueva tarea"
        open={modalNueva}
        onCancel={() => setModalNueva(false)}
        onOk={() => void onCrear()}
        okText="Crear tarea"
        cancelText="Cancelar"
        confirmLoading={crear.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ tipo_accion: 'llamada' }}>
          <Form.Item name="tipo_accion" label="Tipo de acción" rules={[{ required: true, message: 'Requerido' }]}>
            <Select options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Requerido' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="fecha_ejecucion" label="Fecha y hora" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="id_contacto" label="Contacto">
            <Select
              allowClear
              options={o.contactos.map((c) => ({ value: c.id, label: `${c.nombres} ${c.apellidos}` }))}
            />
          </Form.Item>
          <Form.Item name="id_asignado" label="Responsable">
            <EmpleadoSelect empleados={empleados} allowClear placeholder="Te asignas a ti mismo si lo dejas vacío" />
          </Form.Item>
          <Form.Item name="ids_colaboradores" label="Colaboradores">
            <EmpleadoMultiSelect empleados={empleados} placeholder="Sin colaboradores" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

/** Task item literal del prototipo */
function TareaItem({
  tarea: t,
  onAbrir,
  onCompletar,
  onCancelar,
}: {
  tarea: Tarea
  onAbrir: () => void
  onCompletar: () => void
  onCancelar: () => void
}) {
  const vencida = dayjs(t.fecha_ejecucion).isBefore(dayjs())
  return (
    <div
      className="bg-white p-3 border border-border-subtle rounded-lg hover:border-primary transition-all group cursor-pointer"
      onClick={onAbrir}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-label-md font-label-md text-text-muted">ID-{t.id}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="material-symbols-outlined text-[18px] text-outline hover:text-primary"
            title="Completar"
            onClick={onCompletar}
          >
            check_circle
          </button>
          <Popconfirm title="¿Cancelar esta tarea?" okText="Sí, cancelar" cancelText="No" onConfirm={onCancelar}>
            <button className="material-symbols-outlined text-[18px] text-outline hover:text-error" title="Cancelar">
              cancel
            </button>
          </Popconfirm>
        </div>
      </div>
      <h3 className="font-bold text-on-surface mb-1">{ETIQUETA_TIPO_ACCION[t.tipo_accion]}</h3>
      <p className="text-body-md text-text-muted line-clamp-1">{t.descripcion}</p>
      <div className="mt-3 flex items-center justify-between">
        {vencida ? (
          <div className="flex items-center gap-1.5 text-label-md text-error">
            <span className="material-symbols-outlined text-[14px]">priority_high</span>
            Vencida · {dayjs(t.fecha_ejecucion).format('DD MMM, HH:mm')}
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
}
