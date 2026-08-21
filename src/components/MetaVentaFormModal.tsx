import { useEffect } from 'react'
import { App, Form, InputNumber, Modal, Select } from 'antd'
import { useCrearMetaVenta, useEditarMetaVenta } from '@/hooks/useMetasVenta'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EditarMetaVentaInput, EmpleadoResumen, MesMeta, MetaVenta } from '@/types'
import { MESES_META } from '@/types'
import { ETIQUETA_MES } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'

type FormValues = { id_empleado: number; anio: number } & Record<MesMeta, number>

interface Props {
  open: boolean
  onClose: () => void
  /** 'nueva' = POST (proponer o crear directo, según el rol del caller). 'editar' = PATCH sobre metaAEditar. */
  modo: 'nueva' | 'editar'
  tituloModal: string
  textoBoton: string
  empleadosDisponibles: EmpleadoResumen[]
  /** Requerido si modo === 'editar'. Si se pasa en modo 'nueva', precarga el form (caso "volver a proponer" sobre una rechazada). */
  metaAEditar?: MetaVenta | null
  onGuardada?: (m: MetaVenta) => void
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_DISPONIBLES = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1]

/**
 * Formulario de 12 meses reutilizado por Gerencia (crear directo / editar y
 * aprobar) y JDV (proponer / volver a proponer). meta_anual se muestra
 * calculada en vivo pero NUNCA se envía en el body — la calcula el backend.
 */
export function MetaVentaFormModal({
  open,
  onClose,
  modo,
  tituloModal,
  textoBoton,
  empleadosDisponibles,
  metaAEditar,
  onGuardada,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const crear = useCrearMetaVenta()
  const editar = useEditarMetaVenta()
  const guardando = crear.isPending || editar.isPending
  const valoresForm = Form.useWatch([], form) as Partial<FormValues> | undefined

  useEffect(() => {
    if (!open) return
    if (metaAEditar) {
      const valoresIniciales = {
        id_empleado: metaAEditar.id_empleado,
        anio: metaAEditar.anio,
        ...Object.fromEntries(MESES_META.map((mes) => [mes, metaAEditar[mes]])),
      } as FormValues
      form.setFieldsValue(valoresIniciales)
    } else {
      form.resetFields()
      form.setFieldsValue({ anio: ANIO_ACTUAL })
    }
  }, [open, metaAEditar, form])

  const metaAnualEnVivo = MESES_META.reduce((total, mes) => total + (valoresForm?.[mes] ?? 0), 0)

  const onGuardar = async () => {
    const v = await form.validateFields()
    try {
      if (modo === 'editar' && metaAEditar) {
        const cambios: EditarMetaVentaInput = {}
        for (const mes of MESES_META) {
          if (v[mes] !== metaAEditar[mes]) cambios[mes] = v[mes]
        }
        if (Object.keys(cambios).length === 0) {
          message.info('No hay cambios que guardar')
          onClose()
          return
        }
        const actualizada = await editar.mutateAsync({ id: metaAEditar.id, input: cambios })
        message.success('Meta actualizada y aprobada')
        onClose()
        onGuardada?.(actualizada)
        return
      }
      const meses = Object.fromEntries(MESES_META.map((mes) => [mes, v[mes]])) as Record<MesMeta, number>
      const creada = await crear.mutateAsync({ id_empleado: v.id_empleado, anio: v.anio, ...meses })
      message.success('Meta guardada')
      onClose()
      onGuardada?.(creada)
    } catch (e) {
      if (codigoDeError(e) === 'META_YA_EXISTE') {
        message.warning(
          'Ya existe una meta propuesta o aprobada para este vendedor y año — edítala en vez de crear una nueva',
        )
        return
      }
      if (codigoDeError(e) === 'META_RECHAZADA') {
        message.warning('Esta meta está rechazada: no se puede editar, debe volver a proponerse')
        return
      }
      message.error(mensajeDeError(e, 'No se pudo guardar la meta'))
    }
  }

  return (
    <Modal
      title={tituloModal}
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onGuardar()}
      okText={textoBoton}
      cancelText="Cancelar"
      confirmLoading={guardando}
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item name="id_empleado" label="Vendedor" rules={[{ required: true, message: 'Elige el vendedor' }]}>
            <Select
              disabled={modo === 'editar'}
              showSearch
              optionFilterProp="label"
              options={empleadosDisponibles.map((e) => ({ value: e.id, label: nombreCompleto(e) }))}
            />
          </Form.Item>
          <Form.Item name="anio" label="Año" rules={[{ required: true, message: 'Elige el año' }]}>
            <Select
              disabled={modo === 'editar'}
              options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MESES_META.map((mes) => (
            <Form.Item key={mes} name={mes} label={ETIQUETA_MES[mes]} initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} precision={0} />
            </Form.Item>
          ))}
        </div>

        <div
          style={{
            background: '#f3f2ff',
            borderRadius: 4,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="eyebrow">Meta anual (calculada)</span>
          <span className="metric-value" style={{ fontSize: 20, fontWeight: 700, color: '#244481' }}>
            {metaAnualEnVivo} unidades
          </span>
        </div>
      </Form>
    </Modal>
  )
}
