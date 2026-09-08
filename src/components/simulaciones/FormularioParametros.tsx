import { useState } from 'react'
import { Alert, Button, Form, InputNumber, Select } from 'antd'
import { extraerApiError, mensajeDeError } from '@/api/client'
import { DEFAULTS_SIMULACION, validarCuotaInicial } from '@/utils/simulaciones'
import type { ModoSimulacion } from '@/types/enums'
import type { CrearSimulacionInput } from '@/types/simulacion'

/**
 * Props para las diferencias entre la Calculadora y el simulador (D25,
 * `plan-04-mapa-vistas-simulaciones.md`): comparten los mismos 8 parámetros y
 * las mismas validaciones proactivas, y solo difieren en si `modo` se puede
 * tocar y en el rótulo del botón de acción.
 */
interface Props {
  /**
   * `false` en edición: `modo` es INMUTABLE tras la creación de una simulación
   * existente (§7.1) — el simulador lo deshabilita al editar, la Calculadora
   * siempre lo deja editable porque nunca edita, solo calcula desde cero.
   */
  modoEditable: boolean
  valoresIniciales?: Partial<CrearSimulacionInput>
  /**
   * Quien use el formulario decide qué hook de mutación llamar (Calculadora o
   * simulador) — este componente no conoce el endpoint. Si `onSubmit` rechaza,
   * el formulario intenta mapear el `error.field` del backend al campo
   * correspondiente (§9, CLAUDE.md regla 7); si no puede mapearlo, lo muestra
   * como error general del formulario.
   */
  onSubmit: (valores: CrearSimulacionInput) => void | Promise<void>
  /** "Calcular" en la Calculadora, "Guardar" en el simulador. */
  etiquetaAccion: string
  cargando?: boolean
}

interface ValoresFormulario {
  modo: ModoSimulacion
  precio_venta: number | null
  descuento: number | null
  cuota_inicial: number | null
  plazo_meses: number | null
  tea: number | null
  valor_residual: number | null
  dias_trabajados: number | null
  comision_estructuracion: number | null
}

/** `undefined` → default del módulo; el resto pasa a número para el InputNumber. */
function valorInicialNumerico(
  valor: string | number | undefined,
  fallback: string | number,
): number {
  return Number(valor ?? fallback)
}

/** `CrearSimulacionInput` viaja como `string` para los montos/porcentajes
 *  (contrato del backend, ver `src/types/simulacion.ts`); el formulario los
 *  captura como número en `InputNumber` y los serializa acá al enviar. */
function aInputCrearSimulacion(v: ValoresFormulario): CrearSimulacionInput {
  return {
    modo: v.modo,
    precio_venta: String(v.precio_venta),
    cuota_inicial: String(v.cuota_inicial),
    plazo_meses: Number(v.plazo_meses),
    tea: String(v.tea),
    descuento: v.descuento !== null && v.descuento !== undefined ? String(v.descuento) : undefined,
    valor_residual:
      v.valor_residual !== null && v.valor_residual !== undefined
        ? String(v.valor_residual)
        : undefined,
    dias_trabajados:
      v.dias_trabajados !== null && v.dias_trabajados !== undefined
        ? Number(v.dias_trabajados)
        : undefined,
    comision_estructuracion:
      v.comision_estructuracion !== null && v.comision_estructuracion !== undefined
        ? String(v.comision_estructuracion)
        : undefined,
  }
}

export function FormularioParametros({
  modoEditable,
  valoresIniciales,
  onSubmit,
  etiquetaAccion,
  cargando = false,
}: Props) {
  const [form] = Form.useForm<ValoresFormulario>()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const initialValues: ValoresFormulario = {
    modo: valoresIniciales?.modo ?? 'leasing',
    precio_venta: valoresIniciales?.precio_venta ? Number(valoresIniciales.precio_venta) : null,
    descuento: valoresIniciales?.descuento ? Number(valoresIniciales.descuento) : 0,
    cuota_inicial: valorInicialNumerico(valoresIniciales?.cuota_inicial, DEFAULTS_SIMULACION.cuota_inicial),
    plazo_meses: valorInicialNumerico(valoresIniciales?.plazo_meses, DEFAULTS_SIMULACION.plazo_meses),
    tea: valorInicialNumerico(valoresIniciales?.tea, DEFAULTS_SIMULACION.tea),
    valor_residual: valorInicialNumerico(
      valoresIniciales?.valor_residual,
      DEFAULTS_SIMULACION.valor_residual,
    ),
    dias_trabajados: valorInicialNumerico(
      valoresIniciales?.dias_trabajados,
      DEFAULTS_SIMULACION.dias_trabajados,
    ),
    comision_estructuracion: valorInicialNumerico(
      valoresIniciales?.comision_estructuracion,
      DEFAULTS_SIMULACION.comision_estructuracion,
    ),
  }

  const precioVenta = Form.useWatch('precio_venta', form)
  const descuento = Form.useWatch('descuento', form)
  const cuotaInicial = Form.useWatch('cuota_inicial', form)

  // UX proactiva para evitar el round-trip. La validación AUTORITATIVA es la
  // del backend y hay que manejar su 400 igual (CLAUDE.md regla 7, encargo §7.6).
  const avisoCuotaInicial =
    precioVenta && cuotaInicial !== null && cuotaInicial !== undefined
      ? validarCuotaInicial(cuotaInicial, precioVenta, descuento ?? 0)
      : null

  // Auditoría T8.1 (C3): había acá un aviso proactivo de `valor_residual` que
  // calculaba el `principal` en el cliente (con el IGV 1.18 a mano) para
  // poder llamar a `validarValorResidual`. Es exactamente el caso que las
  // reglas globales del plan mandan ESCALAR ("el frontend nunca calcula...
  // si te parece que hace falta calcular algo → ESCALAR") y no se escaló.
  // Decisión del arquitecto: se elimina el aviso proactivo. La validación
  // autoritativa del backend (`400 VALIDACION` con `error.field`, manejada
  // más abajo) sigue siendo la única fuente de verdad para esta regla.

  const handleSubmit = async (valores: ValoresFormulario) => {
    setErrorGeneral(null)
    const payload = aInputCrearSimulacion(valores)
    try {
      await onSubmit(payload)
    } catch (e) {
      // §9 / CLAUDE.md regla 7: siempre manejar el rechazo del backend. El
      // mensaje va inline en el campo que `error.field` señala, no en un
      // toast/notification global.
      const apiError = extraerApiError(e)
      if (apiError?.field) {
        form.setFields([{ name: apiError.field as keyof ValoresFormulario, errors: [apiError.message] }])
      } else {
        setErrorGeneral(mensajeDeError(e, 'No se pudo procesar la simulación'))
      }
    }
  }

  return (
    <Form<ValoresFormulario>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={initialValues}
      onFinish={(valores) => void handleSubmit(valores)}
    >
      {errorGeneral && (
        <Alert type="error" showIcon message={errorGeneral} style={{ marginBottom: 16 }} />
      )}

      <Form.Item
        name="modo"
        label="Modo"
        rules={[{ required: true, message: 'El modo es obligatorio' }]}
      >
        <Select
          disabled={!modoEditable}
          options={[
            { value: 'leasing', label: 'Leasing' },
            { value: 'credito_directo', label: 'Crédito Directo' },
          ]}
        />
      </Form.Item>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Form.Item
          name="precio_venta"
          label="Precio de venta"
          rules={[{ required: true, message: 'El precio de venta es obligatorio' }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="$" />
        </Form.Item>
        <Form.Item name="descuento" label="Descuento">
          <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} suffix="%" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Form.Item
          name="cuota_inicial"
          label="Cuota inicial"
          rules={[{ required: true, message: 'La cuota inicial es obligatoria' }]}
          validateStatus={avisoCuotaInicial ? 'warning' : undefined}
          help={avisoCuotaInicial ?? undefined}
        >
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="$" />
        </Form.Item>
        <Form.Item
          name="plazo_meses"
          label="Plazo (meses)"
          rules={[{ required: true, message: 'El plazo es obligatorio' }]}
        >
          <InputNumber style={{ width: '100%' }} min={1} precision={0} />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Form.Item
          name="tea"
          label="TEA"
          rules={[{ required: true, message: 'La TEA es obligatoria' }]}
        >
          {/* Escala 1-100 (14.00 = 14%), NO la fraccionaria de `financiadoras`
              (reglas §7.6, `formatoTea`). */}
          <InputNumber style={{ width: '100%' }} min={0} max={200} precision={2} suffix="%" />
        </Form.Item>
        <Form.Item name="valor_residual" label="Valor residual">
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="$" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Form.Item name="dias_trabajados" label="Días trabajados">
          <InputNumber style={{ width: '100%' }} min={1} precision={0} />
        </Form.Item>
        <Form.Item name="comision_estructuracion" label="Comisión de estructuración">
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="$" />
        </Form.Item>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={cargando}>
          {etiquetaAccion}
        </Button>
      </Form.Item>
    </Form>
  )
}
