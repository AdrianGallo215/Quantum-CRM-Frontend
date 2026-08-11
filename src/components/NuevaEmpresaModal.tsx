import { useState } from 'react'
import { App, Alert, Form, Input, Modal, Select } from 'antd'
import { useCrearEmpresa } from '@/hooks/useEmpresas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { empresasApi } from '@/api/empresas'
import { extraerApiError, mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_SUPERVISION, tieneRol } from '@/store/authStore'
import { ETIQUETA_ORIGEN_LEAD, ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
import { SEGMENTOS, type Empresa, type OrigenLead } from '@/types'

interface FormValues {
  ruc: string
  razon_social: string
  actividad_econ?: string
  sector_industrial?: string
  direccion_fiscal?: string
  distrito?: string
  provincia?: string
  departamento?: string
  origen_lead?: OrigenLead
  segmentos: string[]
  id_vendedor?: number
  notas?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreada?: (empresa: Empresa) => void
}

export function NuevaEmpresaModal({ open, onClose, onCreada }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const empleado = useAuthStore((s) => s.empleado)
  const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)
  const empleados = useVendedoresAsignables(esSupervision && open)
  const crear = useCrearEmpresa()
  const [rucDuplicado, setRucDuplicado] = useState<string | null>(null)

  // Check de RUC al perder foco, ANTES de enviar (PRD §9.6)
  const onBlurRuc = async () => {
    const ruc: string = form.getFieldValue('ruc') ?? ''
    setRucDuplicado(null)
    if (!/^\d{11}$/.test(ruc)) return
    try {
      const res = await empresasApi.checkRuc(ruc)
      if (res.existe) {
        setRucDuplicado(res.mensaje ?? 'Esta empresa ya está registrada en el sistema')
      }
    } catch {
      // Check silencioso: si falla, el backend validará igual en el POST.
    }
  }

  const onGuardar = async () => {
    const v = await form.validateFields()
    if (rucDuplicado) {
      message.warning('El RUC ya está registrado — corrige antes de continuar')
      return
    }
    try {
      const empresa = await crear.mutateAsync({
        ruc: v.ruc,
        razon_social: v.razon_social,
        actividad_econ: v.actividad_econ ?? null,
        sector_industrial: v.sector_industrial ?? null,
        direccion_fiscal: v.direccion_fiscal ?? null,
        distrito: v.distrito ?? null,
        provincia: v.provincia ?? null,
        departamento: v.departamento ?? null,
        origen_lead: v.origen_lead ?? null,
        notas: v.notas ?? null,
        segmentos: v.segmentos,
        id_vendedor: v.id_vendedor ?? empleado?.id ?? null,
      })
      message.success('Empresa creada')
      form.resetFields()
      setRucDuplicado(null)
      onClose()
      onCreada?.(empresa)
    } catch (e) {
      const apiError = extraerApiError(e)
      if (apiError?.code === 'RUC_DUPLICADO') {
        setRucDuplicado(apiError.message)
      }
      message.error(mensajeDeError(e, 'No se pudo crear la empresa'))
    }
  }

  return (
    <Modal
      title="Nueva empresa"
      open={open}
      onCancel={() => {
        form.resetFields()
        setRucDuplicado(null)
        onClose()
      }}
      onOk={() => void onGuardar()}
      okText="Crear empresa"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="ruc"
          label="RUC"
          rules={[
            { required: true, message: 'Requerido' },
            { pattern: /^\d{11}$/, message: 'El RUC debe tener 11 dígitos' },
          ]}
          validateStatus={rucDuplicado ? 'error' : undefined}
        >
          <Input maxLength={11} onBlur={() => void onBlurRuc()} placeholder="20123456789" />
        </Form.Item>
        {rucDuplicado && (
          <Alert
            type="error"
            showIcon
            message={rucDuplicado}
            style={{ marginBottom: 16, borderRadius: 4 }}
          />
        )}
        <Form.Item name="razon_social" label="Razón social" rules={[{ required: true, message: 'Requerido' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="segmentos"
          label="Segmentos"
          rules={[{ required: true, message: 'Selecciona al menos un segmento' }]}
        >
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
        <Form.Item name="origen_lead" label="Origen del lead">
          <Select
            allowClear
            options={Object.entries(ETIQUETA_ORIGEN_LEAD).map(([value, label]) => ({ value, label }))}
          />
        </Form.Item>
        {esSupervision && (
          <Form.Item name="id_vendedor" label="Vendedor asignado">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={(empleados.data ?? []).map((e) => ({
                value: e.id,
                label: `${e.nombres} ${e.apellidos}`,
              }))}
            />
          </Form.Item>
        )}
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
