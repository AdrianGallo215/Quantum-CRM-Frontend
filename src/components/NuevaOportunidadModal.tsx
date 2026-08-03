import { useMemo, useState } from 'react'
import { App, Alert, DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useCrearOportunidad } from '@/hooks/useOportunidades'
import { useEmpresa, useEmpresas } from '@/hooks/useEmpresas'
import { useFinanciadoras, useModelos, useVendedoresAsignables } from '@/hooks/useCatalogos'
import { useAuthStore, ROLES_SUPERVISION, tieneRol } from '@/store/authStore'
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
import { aprobadorParaDcto, limiteDctoDirecto } from '@/utils/solicitudes'
import { ETIQUETA_ROL_APROBADOR } from '@/utils/etiquetas'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
import { calcularMontoTotal } from '@/utils/monto'
import { formatoMonto } from '@/utils/formato'

interface FormValues {
  id_empresa: number
  id_modelo: number
  id_financiadora?: number
  cantidad: number
  dcto?: number
  id_vendedor?: number
  garantia?: boolean
  finc_paralelo?: boolean
  fecha_cierre_estimado?: Dayjs | null
  notas?: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** Empresa precargada (desde Prospección o Detalle de Empresa) */
  empresaPreseleccionada?: { id: number; razon_social: string; id_vendedor?: number | null } | null
}

export function NuevaOportunidadModal({ open, onClose, empresaPreseleccionada }: Props) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm<FormValues>()
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null)
  const [idCreadaConSolicitud, setIdCreadaConSolicitud] = useState<number | null>(null)

  const empresas = useEmpresas(
    busquedaEmpresa.trim().length >= 2 ? { q: busquedaEmpresa } : undefined,
  )
  const modelos = useModelos()
  const financiadoras = useFinanciadoras()
  const crear = useCrearOportunidad()
  const empleado = useAuthStore((s) => s.empleado)
  const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)

  const idModelo = Form.useWatch('id_modelo', form)
  const idEmpresa = Form.useWatch('id_empresa', form)
  const cantidad = Form.useWatch('cantidad', form)
  const dcto = Form.useWatch('dcto', form)

  const modeloSeleccionado = useMemo(
    () => (modelos.data ?? []).find((m) => m.id === idModelo),
    [modelos.data, idModelo],
  )

  // id_vendedor autoritativo desde el detalle de la empresa elegida.
  //
  // Antes se leía de la empresa preseleccionada, y Prospección la pasa sin ese
  // campo: `id_vendedor == null` daba true tanto para "no tiene vendedor" como
  // para "no lo sabemos", así que a gerencia/jdv siempre se le exigía elegir
  // vendedor —y el POST lo reasignaba— aunque la empresa ya tuviera uno.
  // Solo preguntamos cuando el detalle confirma que no hay vendedor.
  const detalleEmpresa = useEmpresa(open && esSupervision && idEmpresa ? idEmpresa : 0)
  const pedirVendedor = detalleEmpresa.isSuccess && detalleEmpresa.data.id_vendedor === null

  const vendedores = useVendedoresAsignables(pedirVendedor && open)

  // UX proactiva (contrato §2): avisar ANTES de guardar. No bloquea el submit.
  const aprobador = empleado ? aprobadorParaDcto(empleado.rol, dcto ?? 0) : null

  // Cálculo EN VIVO, solo presentación. monto_total nunca viaja al backend.
  const montoTotal = calcularMontoTotal(cantidad, modeloSeleccionado?.precio_base, dcto)

  const financiadoraDefault = (financiadoras.data ?? []).find((f) => f.es_default)

  const opcionesEmpresa = useMemo(() => {
    const base = (empresas.data?.data ?? []).map((e) => ({
      value: e.id,
      label: e.razon_social,
    }))
    if (
      empresaPreseleccionada &&
      !base.some((o) => o.value === empresaPreseleccionada.id)
    ) {
      base.unshift({
        value: empresaPreseleccionada.id,
        label: empresaPreseleccionada.razon_social,
      })
    }
    return base
  }, [empresas.data, empresaPreseleccionada])

  const onGuardar = async () => {
    const v = await form.validateFields()
    try {
      const creada = await crear.mutateAsync({
        id_empresa: v.id_empresa,
        id_modelo: v.id_modelo,
        id_financiadora: v.id_financiadora ?? null,
        cantidad: v.cantidad,
        dcto: v.dcto ?? 0,
        garantia: v.garantia ?? false,
        finc_paralelo: v.finc_paralelo ?? false,
        fecha_cierre_estimado: v.fecha_cierre_estimado
          ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
          : null,
        notas: v.notas ?? null,
        ...(pedirVendedor ? { id_vendedor: v.id_vendedor } : {}),
      })
      message.success('Oportunidad creada')
      form.resetFields()
      onClose()
      navigate(`/oportunidades/${creada.id}`)
    } catch (e) {
      if (codigoDeError(e) === 'APROBACION_REQUERIDA' && empleado) {
        // §3.1 creación: el 422 bloquea todo. Creamos con el límite propio y
        // abrimos la solicitud por el dcto deseado sobre la oportunidad creada.
        const limite = limiteDctoDirecto(empleado.rol) ?? 0
        try {
          const creada = await crear.mutateAsync({
            id_empresa: v.id_empresa,
            id_modelo: v.id_modelo,
            id_financiadora: v.id_financiadora ?? null,
            cantidad: v.cantidad,
            dcto: limite,
            garantia: v.garantia ?? false,
            finc_paralelo: v.finc_paralelo ?? false,
            fecha_cierre_estimado: v.fecha_cierre_estimado
              ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
              : null,
            notas: v.notas ?? null,
            ...(pedirVendedor ? { id_vendedor: v.id_vendedor } : {}),
          })
          message.success(`Oportunidad creada con ${limite}% de descuento`)
          setIdCreadaConSolicitud(creada.id)
          setSolicitudPendiente({
            tipo: 'descuento',
            idOportunidad: creada.id,
            dctoSolicitado: v.dcto ?? 0,
            mensajeBackend: extraerApiError(e)?.message ?? 'El descuento requiere aprobación',
          })
        } catch (e2) {
          message.error(mensajeDeError(e2, 'No se pudo crear la oportunidad'))
        }
        return
      }
      message.error(mensajeDeError(e, 'No se pudo crear la oportunidad'))
    }
  }

  return (
    <Modal
      title="Nueva oportunidad"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onGuardar()}
      okText="Crear oportunidad"
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
          cantidad: 1,
          dcto: 0,
          garantia: false,
          finc_paralelo: false,
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

        {pedirVendedor && (
          <Form.Item
            name="id_vendedor"
            label="Vendedor responsable"
            extra="Esta empresa no tiene vendedor asignado: se le asignará también la empresa."
            rules={[{ required: true, message: 'Elige el vendedor responsable' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={vendedores.isLoading}
              options={(vendedores.data ?? []).map((e) => ({
                value: e.id,
                label: `${e.nombres} ${e.apellidos}`,
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="id_modelo" label="Modelo" rules={[{ required: true, message: 'El modelo es obligatorio' }]}>
          <Select
            loading={modelos.isLoading}
            options={(modelos.data ?? []).map((m) => ({
              value: m.id,
              label: `${m.codigo} — ${formatoMonto(m.precio_base)}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="id_financiadora"
          label={`Financiadora${financiadoraDefault ? ` (default: ${financiadoraDefault.nombre})` : ''}`}
        >
          <Select
            allowClear
            loading={financiadoras.isLoading}
            placeholder={financiadoraDefault?.nombre ?? 'Seleccionar'}
            options={(financiadoras.data ?? []).map((f) => ({ value: f.id, label: f.nombre }))}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item
            name="cantidad"
            label="Cantidad de unidades"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item name="dcto" label="Descuento (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
          </Form.Item>
        </div>

        {aprobador && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${dcto}% supera tu límite — la oportunidad se creará con tu límite y podrás solicitar el ${dcto}% a ${ETIQUETA_ROL_APROBADOR[aprobador]}`}
          />
        )}

        {/* monto_total: SIEMPRE read-only, calculado en vivo */}
        <div
          style={{
            background: '#f3f2ff',
            borderRadius: 4,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="eyebrow">Monto total (calculado)</span>
          <span className="metric-value" style={{ fontSize: 20, fontWeight: 700, color: '#244481' }}>
            {formatoMonto(montoTotal)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="garantia" label="Garantía" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="finc_paralelo" label="Financiamiento paralelo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Form.Item name="fecha_cierre_estimado" label="Fecha de cierre estimada">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" minDate={dayjs()} />
        </Form.Item>

        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
      <SolicitudModal
        solicitud={solicitudPendiente}
        onClose={() => {
          setSolicitudPendiente(null)
          // Con o sin solicitud enviada, la oportunidad YA existe: ir al detalle
          if (idCreadaConSolicitud !== null) {
            form.resetFields()
            onClose()
            navigate(`/oportunidades/${idCreadaConSolicitud}`)
          }
        }}
      />
    </Modal>
  )
}
