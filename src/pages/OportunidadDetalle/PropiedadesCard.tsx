import { useState } from 'react'
import { App, Alert, DatePicker, Form, InputNumber, Input, Modal, Popconfirm, Select, Switch } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useActualizarOportunidad, useEliminarOportunidad } from '@/hooks/useOportunidades'
import { useFinanciadoras, useModelos } from '@/hooks/useCatalogos'
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_ADMIN, tieneRol } from '@/store/authStore'
import { aprobadorParaDcto } from '@/utils/solicitudes'
import { ETIQUETA_ROL_APROBADOR } from '@/utils/etiquetas'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
import type { Modelo, OportunidadDetalle } from '@/types'
import { formatoFecha, formatoMonto } from '@/utils/formato'
import { calcularMontoTotal } from '@/utils/monto'

interface FormValues {
  id_modelo: number
  id_financiadora?: number
  cantidad: number
  precio_unitario: number
  dcto: number
  garantia: boolean
  finc_paralelo: boolean
  fecha_cierre_estimado?: Dayjs | null
  notas?: string | null
}

/** Modal de edición de términos (antd) con monto_total en vivo y read-only */
function EditarTerminosModal({
  oportunidad: o,
  open,
  onClose,
}: {
  oportunidad: OportunidadDetalle
  open: boolean
  onClose: () => void
}) {
  const { message, notification } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const modelos = useModelos()
  const financiadoras = useFinanciadoras()
  const actualizar = useActualizarOportunidad(o.id)
  const empleado = useAuthStore((s) => s.empleado)
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null)

  const cantidad = Form.useWatch('cantidad', form)
  const precioUnitario = Form.useWatch('precio_unitario', form)
  const dcto = Form.useWatch('dcto', form)
  const montoEnVivo = calcularMontoTotal(cantidad, precioUnitario, dcto)

  // UX proactiva (contrato §2): avisar ANTES de guardar. No bloquea el submit.
  const aprobador = empleado ? aprobadorParaDcto(empleado.rol, dcto ?? 0) : null

  const onGuardar = async () => {
    const v = await form.validateFields()
    try {
      const actualizada = await actualizar.mutateAsync({
        id_modelo: v.id_modelo,
        id_financiadora: v.id_financiadora,
        cantidad: v.cantidad,
        precio_unitario: v.precio_unitario.toFixed(2),
        dcto: v.dcto.toFixed(2),
        garantia: v.garantia,
        finc_paralelo: v.finc_paralelo,
        fecha_cierre_estimado: v.fecha_cierre_estimado
          ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
          : null,
        notas: v.notas ?? null,
      })
      message.success('Términos actualizados')
      for (const adv of actualizada.advertencias ?? []) {
        notification.warning({ message: 'Advertencia', description: adv })
      }
      onClose()
    } catch (e) {
      if (codigoDeError(e) === 'APROBACION_REQUERIDA') {
        // §3.1: el backend NO guardó nada. Guardamos el resto de campos con el
        // dcto actual de la oportunidad y ofrecemos solicitar el dcto nuevo.
        try {
          await actualizar.mutateAsync({
            id_modelo: v.id_modelo,
            id_financiadora: v.id_financiadora,
            cantidad: v.cantidad,
            precio_unitario: v.precio_unitario.toFixed(2),
            dcto: o.dcto, // el vigente — el nuevo queda pendiente de aprobación
            garantia: v.garantia,
            finc_paralelo: v.finc_paralelo,
            fecha_cierre_estimado: v.fecha_cierre_estimado
              ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
              : null,
            notas: v.notas ?? null,
          })
        } catch {
          // Si también falla, el modal de solicitud sigue siendo lo importante
        }
        setSolicitudPendiente({
          tipo: 'descuento',
          idOportunidad: o.id,
          dctoSolicitado: v.dcto,
          mensajeBackend: extraerApiError(e)?.message ?? 'El descuento requiere aprobación',
        })
        return
      }
      message.error(mensajeDeError(e, 'No se pudieron guardar los términos'))
    }
  }

  return (
    <Modal
      title="Editar términos"
      open={open}
      onCancel={onClose}
      onOk={() => void onGuardar()}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={actualizar.isPending}
      width={560}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          id_modelo: o.id_modelo,
          id_financiadora: o.id_financiadora ?? undefined,
          cantidad: o.cantidad,
          precio_unitario: Number(o.precio_unitario),
          dcto: Number(o.dcto),
          garantia: o.garantia,
          finc_paralelo: o.finc_paralelo,
          fecha_cierre_estimado: o.fecha_cierre_estimado ? dayjs(o.fecha_cierre_estimado) : null,
          notas: o.notas,
        }}
      >
        <Form.Item name="id_modelo" label="Modelo" rules={[{ required: true, message: 'Requerido' }]}>
          <Select
            loading={modelos.isLoading}
            options={(modelos.data ?? []).map((m) => ({
              value: m.id,
              label: `${m.codigo} — ${formatoMonto(m.precio_base)}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="id_financiadora" label="Financiadora">
          <Select
            allowClear
            loading={financiadoras.isLoading}
            options={(financiadoras.data ?? []).map((fi) => ({ value: fi.id, label: fi.nombre }))}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item name="precio_unitario" label="Precio unitario" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="dcto" label="Dcto. (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
          </Form.Item>
        </div>
        {aprobador && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${dcto}% supera tu límite de descuento — al guardar podrás enviar una solicitud a ${ETIQUETA_ROL_APROBADOR[aprobador]}`}
          />
        )}
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
          <span className="metric-value" style={{ fontSize: 20, fontWeight: 700, color: '#0799b6' }}>
            {formatoMonto(montoEnVivo)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Item name="garantia" label="Garantía" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="finc_paralelo" label="Finc. paralelo" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="fecha_cierre_estimado" label="Cierre estimado">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
      <SolicitudModal
        solicitud={solicitudPendiente}
        onClose={() => setSolicitudPendiente(null)}
        onEnviada={() => onClose()}
      />
    </Modal>
  )
}

/** Modal de ficha del bus: datos del modelo + enlace a la Ficha Técnica (nueva pestaña) */
function FichaBusModal({
  modelo,
  open,
  onClose,
}: {
  modelo: Modelo | undefined
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      title={modelo ? `Ficha del bus — ${modelo.codigo}` : 'Ficha del bus'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      {!modelo ? (
        <p className="text-on-surface-variant">Cargando datos del bus…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">Longitud</span>
              <span className="font-bold text-body-lg">{modelo.longitud ?? '—'}</span>
            </div>
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
                Capacidad de tanques
              </span>
              <span className="font-bold text-body-lg">{modelo.capacidad_tanques ?? '—'}</span>
            </div>
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
                Máx. asientos
              </span>
              <span className="font-bold text-body-lg">{modelo.max_asientos ?? '—'}</span>
            </div>
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">Precio base</span>
              <span className="font-bold text-body-lg">{formatoMonto(modelo.precio_base)}</span>
            </div>
          </div>
          <div>
            <span className="font-label-md text-label-md text-on-surface-variant block mb-1">Aplicaciones</span>
            <div className="flex flex-wrap gap-1">
              {modelo.aplicaciones.map((a) => (
                <span
                  key={a}
                  className="px-2 py-1 bg-surface-container-highest text-on-surface-variant rounded text-label-md font-bold uppercase"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
          {modelo.ficha_tecnica && (
            <a
              className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline pt-4 border-t border-outline-variant"
              href={modelo.ficha_tecnica}
              target="_blank"
              rel="noreferrer"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              Ver Ficha Técnica
            </a>
          )}
        </div>
      )}
    </Modal>
  )
}

/** Botones edit/share del encabezado del prototipo */
function BotonEditar({ oportunidad }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  const eliminar = useEliminarOportunidad()
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button
        className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors border border-outline-variant"
        title="Editar términos"
        onClick={() => setAbierto(true)}
      >
        <span className="material-symbols-outlined">edit</span>
      </button>
      {/* El botón "share" del prototipo no tenía onClick — se elimina en vez de
          dejar un control que no responde. */}
      {esAdmin && (
        <Popconfirm
          title="¿Eliminar esta oportunidad?"
          description="Esta acción es irreversible."
          okText="Eliminar"
          okButtonProps={{ danger: true }}
          cancelText="Cancelar"
          onConfirm={() =>
            eliminar.mutate(
              { id: oportunidad.id, idEmpresa: oportunidad.id_empresa },
              {
                onSuccess: () => {
                  message.success('Oportunidad eliminada')
                  navigate('/pipeline')
                },
                onError: (e) => message.error(mensajeDeError(e, 'No se pudo eliminar la oportunidad')),
              },
            )
          }
        >
          <button
            className="p-2 hover:bg-error-container/40 rounded-full text-error transition-colors border border-error"
            title="Eliminar oportunidad"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </Popconfirm>
      )}
      <EditarTerminosModal oportunidad={oportunidad} open={abierto} onClose={() => setAbierto(false)} />
    </>
  )
}

/** Tarjeta "Información de la Oportunidad" del prototipo simplificado */
function PropiedadesCardBase({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const financiadoras = useFinanciadoras()
  const modelos = useModelos()
  const actualizar = useActualizarOportunidad(o.id)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalFicha, setModalFicha] = useState(false)
  const modeloCompleto = modelos.data?.find((m) => m.id === o.id_modelo)

  const bruto = o.cantidad * Number(o.precio_unitario)
  const descuentoMonto = (bruto * Number(o.dcto)) / 100

  const guardarCampo = (
    input: Parameters<typeof actualizar.mutateAsync>[0],
    exito: string,
  ) => {
    actualizar.mutate(input, {
      onSuccess: () => message.success(exito),
      onError: (e) => message.error(mensajeDeError(e)),
    })
  }

  return (
    <div className="bg-white p-container-padding rounded border border-outline-variant custom-shadow flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          Información de la Oportunidad
        </h2>
        {o.ficha_venta ? (
          <a
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            href={o.ficha_venta}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_download</span>
            Ficha de Venta
          </a>
        ) : (
          <button
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            onClick={() => setModalEditar(true)}
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar términos
          </button>
        )}
      </div>

      {/* Campos (grid del prototipo) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 bg-white border border-outline-variant rounded">
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">MODELO</span>
          <span
            className="font-bold text-body-lg text-primary cursor-pointer hover:underline"
            onClick={() => setModalFicha(true)}
          >
            {o.modelo.codigo}
          </span>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">CANTIDAD</span>
          <span className="font-bold text-body-lg">{o.cantidad} unidades</span>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">PRECIO UNIT.</span>
          <span className="font-bold text-body-lg">{formatoMonto(o.precio_unitario)}</span>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">DESCUENTO</span>
          <span className="font-bold text-error text-body-lg">
            {Number(o.dcto) > 0 ? `-${formatoMonto(descuentoMonto)} (${Number(o.dcto)}%)` : '—'}
          </span>
        </div>
        <div className="bg-surface-container-low p-2 rounded -m-2">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">SUBTOTAL</span>
          <span className="font-bold text-primary text-body-lg font-mono">{formatoMonto(bruto)}</span>
        </div>
      </div>

      {/* monto_total: read-only, calculado por el backend */}
      <div className="flex justify-end pt-4 border-t border-outline-variant">
        <div className="text-right">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase block">
            Monto Total de Operación
          </span>
          <div className="flex items-baseline gap-2 justify-end">
            <span className="font-bold text-headline-lg font-mono text-primary">
              {formatoMonto(o.monto_total)}
            </span>
            <span className="text-body-md text-on-surface-variant italic">(calculado)</span>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Financiadora</label>
          <select
            className="w-full border border-outline-variant rounded p-3 bg-surface-bright focus:ring-2 focus:ring-primary outline-none font-body-md"
            value={o.id_financiadora ?? ''}
            disabled={actualizar.isPending || financiadoras.isLoading}
            onChange={(e) => {
              // '' es el placeholder de "sin financiadora": no es una opción
              // seleccionable, así que nunca debe llegar aquí — pero si llega
              // (autofill del navegador), no mandamos un id 0 inventado.
              if (e.target.value === '') return
              guardarCampo({ id_financiadora: Number(e.target.value) }, 'Financiadora actualizada')
            }}
          >
            {/* Sin este placeholder, una oportunidad sin financiadora mostraba
                la PRIMERA del catálogo: el usuario veía asignada una
                financiadora que no estaba guardada en ningún sitio. */}
            {o.id_financiadora === null && (
              <option value="" disabled>
                Sin financiadora asignada
              </option>
            )}
            {(financiadoras.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Aplica Garantía</label>
          <select
            className="w-full border border-outline-variant rounded p-3 bg-surface-bright focus:ring-2 focus:ring-primary outline-none font-body-md"
            value={o.garantia ? 'si' : 'no'}
            disabled={actualizar.isPending}
            onChange={(e) => guardarCampo({ garantia: e.target.value === 'si' }, 'Garantía actualizada')}
          >
            <option value="si">Sí, con garantía</option>
            <option value="no">Sin garantía adicional</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Fecha Cierre Estimado</label>
          <div
            className="flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright cursor-pointer hover:bg-surface-container-low transition-colors"
            onClick={() => setModalEditar(true)}
          >
            <span className="material-symbols-outlined text-primary">calendar_today</span>
            <span className="font-body-md">{formatoFecha(o.fecha_cierre_estimado)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Financiamiento Paralelo</label>
          <select
            className="w-full border border-outline-variant rounded p-3 bg-surface-bright focus:ring-2 focus:ring-primary outline-none font-body-md"
            value={o.finc_paralelo ? 'si' : 'no'}
            disabled={actualizar.isPending}
            onChange={(e) =>
              guardarCampo({ finc_paralelo: e.target.value === 'si' }, 'Financiamiento actualizado')
            }
          >
            <option value="si">Sí aplica</option>
            <option value="no">No aplica</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-on-surface-variant">Notas de Seguimiento</label>
        <textarea
          className="w-full h-32 border border-outline-variant rounded p-4 bg-surface-bright focus:ring-2 focus:ring-primary outline-none font-body-md resize-none"
          placeholder="Registrar detalles de la última reunión o acuerdos específicos..."
          defaultValue={o.notas ?? ''}
          key={`notas-${o.id}-${o.notas ?? ''}`}
          onBlur={(e) => {
            const nuevo = e.target.value.trim()
            if (nuevo !== (o.notas ?? '')) {
              guardarCampo({ notas: nuevo || null }, 'Notas guardadas')
            }
          }}
        ></textarea>
      </div>

      <EditarTerminosModal oportunidad={o} open={modalEditar} onClose={() => setModalEditar(false)} />
      <FichaBusModal modelo={modeloCompleto} open={modalFicha} onClose={() => setModalFicha(false)} />
    </div>
  )
}

export const PropiedadesCard = Object.assign(PropiedadesCardBase, { BotonEditar })
