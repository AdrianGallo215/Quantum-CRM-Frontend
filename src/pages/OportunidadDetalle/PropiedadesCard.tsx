import { useState } from 'react'
import { App, Alert, DatePicker, Form, InputNumber, Input, Modal, Popconfirm, Select, Switch } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  useActualizarItem,
  useActualizarOportunidad,
  useEliminarOportunidad,
} from '@/hooks/useOportunidades'
import { useModelos } from '@/hooks/useCatalogos'
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
import { useAuthStore, ROLES_ADMIN, ROLES_APOYO, tieneRol } from '@/store/authStore'
import { aprobadorParaDcto } from '@/utils/solicitudes'
import { ETIQUETA_ROL_APROBADOR } from '@/utils/etiquetas'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
import type { Modelo, OportunidadDetalle, OportunidadItem } from '@/types'
import { formatoFecha, formatoMonto } from '@/utils/formato'
import { formatoCuota } from '@/utils/simulaciones'
import { CuotaOportunidad } from '@/components/CuotaOportunidad'
import { calcularDescuento, calcularMontoItem } from '@/utils/monto'
import { urlSegura } from '@/utils/url'

/**
 * Términos comerciales de UN modelo vendido. Desde V42 viven en el ítem y se
 * guardan por `PUT /oportunidades/:id/items/:item_id` — `PUT /oportunidades/:id`
 * los acepta y los descarta en silencio (contrato §10).
 */
interface ValoresTerminos {
  id_modelo: number
  cantidad: number
  precio_venta: number
  descuento: number
  cuota_financiadora: number
}

/** Campos que siguen viviendo en la raíz de la oportunidad (contrato §10). */
interface ValoresOportunidad {
  garantia: boolean
  finc_paralelo: boolean
  fecha_cierre_estimado?: Dayjs | null
  notas?: string | null
}

type ValoresFormulario = ValoresTerminos & ValoresOportunidad

/**
 * Ítem sobre el que actúa el botón de edición del encabezado. Con un solo ítem
 * —hoy, el 100% de las oportunidades— editar "los términos" no es ambiguo. Con
 * varios no existe "el" ítem: se devuelve `null` y cada fila trae su propio
 * botón, que sí sabe cuál. Nunca el primero a secas: sería editar un modelo
 * haciéndolo pasar por toda la operación.
 */
function itemUnico(items: readonly OportunidadItem[]): OportunidadItem | null {
  const [primero, ...resto] = items
  return primero && resto.length === 0 ? primero : null
}

/**
 * ¿Cambió algún campo de nivel oportunidad? Sin esta comprobación, editar solo
 * el precio dispararía además un `PUT /oportunidades/:id` inútil — justo el
 * endpoint que descarta los términos en silencio. Se llama solo si de verdad
 * hay algo suyo que guardar.
 */
function hayCambiosDeOportunidad(v: ValoresOportunidad, o: OportunidadDetalle): boolean {
  const fecha = v.fecha_cierre_estimado ? v.fecha_cierre_estimado.format('YYYY-MM-DD') : null
  return (
    v.garantia !== o.garantia ||
    v.finc_paralelo !== o.finc_paralelo ||
    fecha !== (o.fecha_cierre_estimado ?? null) ||
    (v.notas ?? null) !== (o.notas ?? null)
  )
}

/**
 * Modal de edición de términos (antd) con monto del ítem en vivo y read-only.
 * Opera sobre UN ítem: los términos van por el endpoint de ítems y el resto de
 * campos por el de la oportunidad, cada uno al suyo.
 */
function EditarTerminosModal({
  oportunidad: o,
  item,
  open,
  onClose,
}: {
  oportunidad: OportunidadDetalle
  item: OportunidadItem
  open: boolean
  onClose: () => void
}) {
  const { message, notification } = App.useApp()
  const [form] = Form.useForm<ValoresFormulario>()
  const modelos = useModelos()
  const actualizar = useActualizarOportunidad(o.id)
  const actualizarItem = useActualizarItem(o.id)
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null)

  const cantidad = Form.useWatch('cantidad', form)
  const precioVenta = Form.useWatch('precio_venta', form)
  const descuento = Form.useWatch('descuento', form)
  const montoEnVivo = calcularMontoItem(cantidad, precioVenta, descuento)

  // UX proactiva (contrato §2): avisar ANTES de guardar. No bloquea el submit.
  const aprobador = empleado ? aprobadorParaDcto(empleado.rol, descuento ?? 0) : null

  /**
   * Términos del ítem. El descuento se pasa aparte para poder reintentar con el
   * vigente cuando el nuevo requiere aprobación.
   */
  const enviarItem = (v: ValoresFormulario, descuentoAEnviar: number) =>
    actualizarItem.mutateAsync({
      idItem: item.id,
      input: {
        id_modelo: v.id_modelo,
        cantidad: v.cantidad,
        precio_venta: v.precio_venta.toFixed(2),
        descuento: descuentoAEnviar.toFixed(2),
        cuota_financiadora: v.cuota_financiadora.toFixed(2),
      },
    })

  /** Guarda los campos de la raíz SOLO si cambiaron. `false` = falló el guardado. */
  const guardarCamposDeOportunidad = async (v: ValoresFormulario): Promise<boolean> => {
    if (!hayCambiosDeOportunidad(v, o)) return true
    try {
      await actualizar.mutateAsync({
        garantia: v.garantia,
        finc_paralelo: v.finc_paralelo,
        fecha_cierre_estimado: v.fecha_cierre_estimado
          ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
          : null,
        notas: v.notas ?? null,
      })
      return true
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudieron guardar los datos de la oportunidad'))
      return false
    }
  }

  const onGuardar = async () => {
    const v = await form.validateFields()
    let itemGuardado: OportunidadItem
    try {
      itemGuardado = await enviarItem(v, v.descuento)
    } catch (e) {
      if (codigoDeError(e) !== 'APROBACION_REQUERIDA') {
        message.error(mensajeDeError(e, 'No se pudieron guardar los términos'))
        return
      }
      // §3.1: el backend NO guardó nada del ítem. Reintentamos con el descuento
      // vigente para no perder cantidad ni precio, y ofrecemos solicitar el nuevo.
      try {
        await enviarItem(v, Number(item.descuento))
      } catch (e2) {
        // El modal de solicitud sigue siendo lo importante, pero el usuario
        // TIENE que saber que el resto de campos no se guardó: si no, cierra
        // el modal creyendo que cantidad y precio quedaron persistidos.
        notification.warning({
          message: 'Los demás cambios no se guardaron',
          description: mensajeDeError(
            e2,
            'Solo se registró la solicitud de descuento. Vuelve a editar los términos para guardar el resto.',
          ),
          duration: 8,
        })
      }
      await guardarCamposDeOportunidad(v)
      setSolicitudPendiente({
        tipo: 'descuento',
        // El descuento vive en el ítem desde V42: la solicitud se hace sobre él,
        // no sobre la oportunidad (contrato §20).
        idOportunidadItem: item.id,
        dctoSolicitado: v.descuento,
        mensajeBackend: extraerApiError(e)?.message ?? 'El descuento requiere aprobación',
      })
      return
    }

    if (!(await guardarCamposDeOportunidad(v))) return

    message.success('Términos actualizados')
    for (const adv of itemGuardado.advertencias ?? []) {
      notification.warning({ message: 'Advertencia', description: adv })
    }
    onClose()
  }

  return (
    <Modal
      title="Editar términos"
      open={open}
      onCancel={onClose}
      onOk={() => void onGuardar()}
      okText="Guardar"
      cancelText="Cancelar"
      okButtonProps={{ disabled: esRolDeApoyo }}
      confirmLoading={actualizarItem.isPending || actualizar.isPending}
      width={560}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          id_modelo: item.id_modelo,
          cantidad: item.cantidad,
          precio_venta: Number(item.precio_venta),
          descuento: Number(item.descuento),
          cuota_financiadora: Number(item.cuota_financiadora),
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item name="precio_venta" label="Precio unitario" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="descuento" label="Dcto. (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
          </Form.Item>
        </div>
        <Form.Item
          name="cuota_financiadora"
          label="Cuota financiadora"
          tooltip="Lo que el cliente paga a terceros (Calidda, cajas) por unidad y por mes. No es parte del financiamiento de Quantum."
        >
          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
        </Form.Item>
        {aprobador && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${descuento}% supera tu límite de descuento — al guardar podrás enviar una solicitud a ${ETIQUETA_ROL_APROBADOR[aprobador]}`}
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
          <span className="eyebrow">Monto del modelo (calculado)</span>
          <span className="metric-value" style={{ fontSize: 20, fontWeight: 700, color: '#0799b6' }}>
            {formatoMonto(montoEnVivo)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {urlSegura(modelo.ficha_tecnica) && (
            <a
              className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline pt-4 border-t border-outline-variant"
              href={urlSegura(modelo.ficha_tecnica)}
              target="_blank"
              rel="noopener noreferrer"
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
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
  const eliminar = useEliminarOportunidad()
  const [itemEnEdicion, setItemEnEdicion] = useState<OportunidadItem | null>(null)
  const unico = itemUnico(oportunidad.items)
  return (
    <>
      {/* Con varios modelos el lápiz del encabezado no sabría cuál editar: la
          edición se hace desde el botón de cada fila del resumen. */}
      {!esRolDeApoyo && unico && (
        <button
          className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors border border-outline-variant"
          title="Editar términos"
          onClick={() => setItemEnEdicion(unico)}
        >
          <span className="material-symbols-outlined">edit</span>
        </button>
      )}
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
      {itemEnEdicion && (
        <EditarTerminosModal
          oportunidad={oportunidad}
          item={itemEnEdicion}
          open
          onClose={() => setItemEnEdicion(null)}
        />
      )}
    </>
  )
}

/**
 * Un modelo vendido dentro de la tarjeta. Con un solo ítem la fila es idéntica
 * a la tarjeta de siempre; con varios se repite una por ítem y el total de la
 * operación queda debajo, para no presentar un modelo como si fuera todo.
 */
function FilaItem({
  item: it,
  onFicha,
  onEditar,
}: {
  item: OportunidadItem
  onFicha: () => void
  /** `null` = sin botón propio: con un solo ítem edita el botón del encabezado. */
  onEditar: (() => void) | null
}) {
  const bruto = it.cantidad * Number(it.precio_venta)
  const descuentoMonto = calcularDescuento(it.cantidad, it.precio_venta, it.descuento)
  return (
    <div className="flex flex-col gap-4 p-6 bg-white border border-outline-variant rounded">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">MODELO</span>
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-body-lg text-primary cursor-pointer hover:underline"
              onClick={onFicha}
            >
              {it.modelo.codigo}
            </span>
            {onEditar && (
              <button
                className="text-on-surface-variant hover:text-primary transition-colors"
                title="Editar términos de este modelo"
                onClick={onEditar}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            )}
          </div>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">CANTIDAD</span>
          <span className="font-bold text-body-lg">{it.cantidad} unidades</span>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">PRECIO UNIT.</span>
          <span className="font-bold text-body-lg">{formatoMonto(it.precio_venta)}</span>
        </div>
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">DESCUENTO</span>
          <span className="font-bold text-error text-body-lg">
            {Number(it.descuento) > 0 ? `-${formatoMonto(descuentoMonto)} (${Number(it.descuento)}%)` : '—'}
          </span>
        </div>
        <div className="bg-surface-container-low p-2 rounded -m-2">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">SUBTOTAL</span>
          <span className="font-bold text-primary text-body-lg font-mono">{formatoMonto(bruto)}</span>
        </div>
      </div>
      {/*
        Cuotas del ÍTEM: son de UNA unidad de este modelo (contrato §10). Las
        etiquetas dicen "por unidad" a propósito — `cuota_total` existe en dos
        niveles con significados distintos y las de la raíz dicen "total" (D13).
        `cuota_quantum` en `null` es degradación esperada: se muestra discreta,
        sin color de error y SIN toast (encargo §4.1).
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline-variant">
        <div role="group" aria-label="Cuota Quantum por unidad">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
            CUOTA QUANTUM POR UNIDAD
          </span>
          <span className="font-bold text-body-lg font-mono text-on-surface">
            {formatoCuota(it.cuota_quantum)}
          </span>
        </div>
        <div role="group" aria-label="Cuota mensual por unidad">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
            CUOTA MENSUAL POR UNIDAD
          </span>
          <span className="font-bold text-body-lg font-mono text-on-surface">
            {formatoCuota(it.cuota_total)}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Tarjeta "Información de la Oportunidad" del prototipo simplificado */
function PropiedadesCardBase({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const modelos = useModelos()
  const actualizar = useActualizarOportunidad(o.id)
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
  const [itemEnEdicion, setItemEnEdicion] = useState<OportunidadItem | null>(null)
  const [itemFicha, setItemFicha] = useState<OportunidadItem | null>(null)
  const unico = itemUnico(o.items)
  // El modelo embebido en el ítem trae lo justo para el listado; la ficha del
  // bus necesita el registro completo del catálogo.
  const modeloDeLaFicha = itemFicha
    ? modelos.data?.find((m) => m.id === itemFicha.id_modelo)
    : undefined

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
        {urlSegura(o.ficha_venta) ? (
          <a
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            href={urlSegura(o.ficha_venta)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_download</span>
            Ficha de Venta
          </a>
        ) : (
          !esRolDeApoyo &&
          unico && (
            <button
              className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
              onClick={() => setItemEnEdicion(unico)}
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Editar términos
            </button>
          )
        )}
      </div>

      {/* Una fila por modelo vendido (grid del prototipo) */}
      <div className="flex flex-col gap-4">
        {o.items.map((it) => (
          <FilaItem
            key={it.id}
            item={it}
            onFicha={() => setItemFicha(it)}
            onEditar={esRolDeApoyo || unico ? null : () => setItemEnEdicion(it)}
          />
        ))}
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

      {/*
        Los tres campos de cuota de nivel oportunidad (encargo §4.1), junto al
        monto total. Son `null` los tres a la vez si algún ítem no tiene cuota
        calculable, y entonces el bloque dice que todavía no se puede calcular.
      */}
      <div className="pt-4 border-t border-outline-variant">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase block mb-3">
          Cuotas de la operación
        </span>
        <CuotaOportunidad oportunidad={o} />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Financiadora</label>
          {/* Solo lectura: `PUT /oportunidades/:id` ya no acepta `id_financiadora`
              (contrato §10). El <select> editable que había aquí lo enviaba y el
              backend lo descartaba en silencio — el mismo modo de fallo que el
              que corrige esta migración. Ver la nota de escalación de T3.1. */}
          <div className="w-full border border-outline-variant rounded p-3 bg-surface-container-low font-body-md">
            {o.financiadora?.nombre ?? 'Sin financiadora asignada'}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Aplica Garantía</label>
          <select
            className="w-full border border-outline-variant rounded p-3 bg-surface-bright focus:ring-2 focus:ring-primary outline-none font-body-md"
            value={o.garantia ? 'si' : 'no'}
            disabled={esRolDeApoyo || actualizar.isPending}
            onChange={(e) => guardarCampo({ garantia: e.target.value === 'si' }, 'Garantía actualizada')}
          >
            <option value="si">Sí, con garantía</option>
            <option value="no">Sin garantía adicional</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Fecha Cierre Estimado</label>
          <div
            className={
              esRolDeApoyo || !unico
                ? 'flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright'
                : 'flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright cursor-pointer hover:bg-surface-container-low transition-colors'
            }
            onClick={esRolDeApoyo || !unico ? undefined : () => setItemEnEdicion(unico)}
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
            disabled={esRolDeApoyo || actualizar.isPending}
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
          disabled={esRolDeApoyo}
          onBlur={(e) => {
            const nuevo = e.target.value.trim()
            if (nuevo !== (o.notas ?? '')) {
              guardarCampo({ notas: nuevo || null }, 'Notas guardadas')
            }
          }}
        ></textarea>
      </div>

      {itemEnEdicion && (
        <EditarTerminosModal
          oportunidad={o}
          item={itemEnEdicion}
          open
          onClose={() => setItemEnEdicion(null)}
        />
      )}
      <FichaBusModal
        modelo={modeloDeLaFicha}
        open={itemFicha !== null}
        onClose={() => setItemFicha(null)}
      />
    </div>
  )
}

export const PropiedadesCard = Object.assign(PropiedadesCardBase, { BotonEditar })
