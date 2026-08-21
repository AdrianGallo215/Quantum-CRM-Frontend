import { useEffect, useMemo, useState } from 'react'
import { Alert, App, DatePicker, Form, Input, Modal, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { useCrearTarea } from '@/hooks/useEventosTareas'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { TipoAccion } from '@/types'
import { ETIQUETA_ETAPA, ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'
import { EmpleadoMultiSelect, EmpleadoSelect } from './EmpleadoSelect'

export interface EmpresaPreseleccionada {
  id: number
  razon_social: string
}

interface ContactoOpcion {
  id: number
  nombres: string
  apellidos: string
}

interface FormValues {
  id_empresa: number
  id_oportunidad?: number
  id_contacto?: number
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_asignado?: number
  ids_colaboradores?: number[]
}

interface Props {
  open: boolean
  onClose: () => void
  /** Empresa fijada (Detalle de Empresa). Si viene, el select queda bloqueado. */
  empresaPreseleccionada?: EmpresaPreseleccionada | null
  /** Contactos seleccionables. Solo tiene sentido con empresa preseleccionada. */
  contactos?: ContactoOpcion[]
}

/**
 * Creación de una tarea, reutilizable desde cualquier pantalla.
 *
 * Antes este formulario vivía inline en ActividadesPage; al necesitarlo también
 * el Detalle de Empresa se extrajo, siguiendo el mismo patrón de
 * `NuevaOportunidadModal` con su `empresaPreseleccionada`.
 *
 * El campo "Oportunidad" no es cosmético: `POST /tareas` responde 400 si la
 * empresa tiene oportunidades activas y la tarea llega sin `id_oportunidad`
 * (contrato §POST /tareas). Por eso es obligatorio cuando las hay.
 */
export function CrearTareaModal({ open, onClose, empresaPreseleccionada, contactos }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')

  const empleados = useEmpleadosSeleccionables()
  const crear = useCrearTarea()

  // Solo se busca cuando NO hay empresa fija: si la hay, no hay nada que elegir.
  const empresas = useEmpresas(
    busquedaEmpresa.trim().length >= 2 ? { q: busquedaEmpresa } : undefined,
  )

  const idEmpresaForm = Form.useWatch('id_empresa', form)
  const idEmpresa = empresaPreseleccionada?.id ?? idEmpresaForm

  const oportunidades = useOportunidades(
    idEmpresa ? { id_empresa: idEmpresa, incluir_cerradas: false } : undefined,
    Boolean(open && idEmpresa),
  )

  /* useMemo obligatorio: `activas` es dependencia del efecto de abajo. Sin
     memoizar sería un array nuevo en cada render y el efecto correría en bucle. */
  const activas = useMemo(
    () => (oportunidades.data?.data ?? []).filter((o) => o.estado !== 'cerrado'),
    [oportunidades.data],
  )
  const requiereOportunidad = activas.length > 0

  // Si solo hay una candidata, elegirla por el usuario. Se depende del id (un
  // número estable), no del objeto, para no reintroducir el bucle de render.
  const idUnicaActiva = activas.length === 1 ? (activas[0]?.id ?? null) : null
  useEffect(() => {
    if (open && idUnicaActiva !== null) {
      form.setFieldValue('id_oportunidad', idUnicaActiva)
    }
  }, [open, idUnicaActiva, form])

  const opcionesEmpresa = empresaPreseleccionada
    ? [{ value: empresaPreseleccionada.id, label: empresaPreseleccionada.razon_social }]
    : (empresas.data?.data ?? []).map((e) => ({ value: e.id, label: e.razon_social }))

  const cerrar = () => {
    form.resetFields()
    setBusquedaEmpresa('')
    onClose()
  }

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        id_empresa: v.id_empresa,
        id_oportunidad: v.id_oportunidad ?? null,
        id_contacto: v.id_contacto ?? null,
        id_asignado: v.id_asignado ?? null,
        ids_colaboradores: v.ids_colaboradores ?? [],
        tipo_accion: v.tipo_accion,
        descripcion: v.descripcion,
        fecha_ejecucion: v.fecha_ejecucion.toISOString(),
      })
      message.success('Tarea creada')
      cerrar()
    } catch (e) {
      // El backend es la validación real: aunque el formulario cubra el caso de
      // las oportunidades activas, su rechazo se muestra tal cual.
      message.error(mensajeDeError(e, 'No se pudo crear la tarea'))
    }
  }

  return (
    <Modal
      title="Nueva tarea"
      open={open}
      onCancel={cerrar}
      onOk={() => void onCrear()}
      okText="Crear tarea"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          id_empresa: empresaPreseleccionada?.id,
          tipo_accion: 'llamada',
        }}
      >
        <Form.Item name="id_empresa" label="Empresa" rules={[{ required: true, message: 'Requerido' }]}>
          <Select
            showSearch
            filterOption={false}
            onSearch={setBusquedaEmpresa}
            placeholder="Busca por razón social o RUC"
            options={opcionesEmpresa}
            loading={empresas.isFetching}
            disabled={Boolean(empresaPreseleccionada)}
            notFoundContent={busquedaEmpresa.trim().length < 2 ? 'Escribe al menos 2 caracteres' : undefined}
          />
        </Form.Item>

        {requiereOportunidad && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Esta empresa tiene oportunidades activas: la tarea debe vincularse a una de ellas."
            />
            <Form.Item
              name="id_oportunidad"
              label="Oportunidad"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Select
                loading={oportunidades.isLoading}
                options={activas.map((o) => ({
                  value: o.id,
                  label: `OP-${o.id} · ${o.modelo.codigo} × ${o.cantidad} · ${ETIQUETA_ETAPA[o.estado]}`,
                }))}
              />
            </Form.Item>
          </>
        )}

        {contactos !== undefined && contactos.length > 0 && (
          <Form.Item name="id_contacto" label="Contacto">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Sin contacto"
              options={contactos.map((c) => ({ value: c.id, label: nombreCompleto(c) }))}
            />
          </Form.Item>
        )}

        <Form.Item name="tipo_accion" label="Tipo de acción" rules={[{ required: true, message: 'Requerido' }]}>
          <Select options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))} />
        </Form.Item>

        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Requerido' }]}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="fecha_ejecucion" label="Fecha y hora" rules={[{ required: true, message: 'Requerido' }]}>
          <DatePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>

        <Form.Item name="id_asignado" label="Responsable">
          <EmpleadoSelect
            empleados={empleados.datos}
            cargando={empleados.cargando}
            error={empleados.error}
            allowClear
            placeholder="Te asignas a ti mismo si lo dejas vacío"
          />
        </Form.Item>

        <Form.Item name="ids_colaboradores" label="Colaboradores">
          <EmpleadoMultiSelect
            empleados={empleados.datos}
            cargando={empleados.cargando}
            error={empleados.error}
            placeholder="Sin colaboradores"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
