import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { post } from '@/api/client'
import { DEFAULTS_SIMULACION } from '@/utils/simulaciones'
import { FormularioParametros } from './FormularioParametros'
import type { CrearSimulacionInput } from '@/types/simulacion'

/**
 * T2.1 (`plan-05-vistas-simulaciones-tareas.md`). D25: la Calculadora y el
 * simulador comparten este formulario — las props cubren sus dos diferencias
 * (edición de `modo` y etiqueta de la acción).
 */

describe('FormularioParametros', () => {
  it('prellena con los defaults del módulo', () => {
    // DEFAULTS_SIMULACION (Plan 03, reglas §6.1): plazo 48, tea '14'.
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={vi.fn()} etiquetaAccion="Calcular" />,
    )
    expect(screen.getByLabelText(/plazo/i)).toHaveValue(String(DEFAULTS_SIMULACION.plazo_meses))
    // El InputNumber de TEA tiene precisión 2 (formatoTea usa el mismo criterio):
    // "14" se muestra como "14.00", no cambia el valor numérico del default.
    expect(screen.getByLabelText(/^tea/i)).toHaveValue(
      Number(DEFAULTS_SIMULACION.tea).toFixed(2),
    )
  })

  it('deshabilita el campo modo en edición', () => {
    // §7.1: modo es INMUTABLE tras la creación. El simulador lo deshabilita al
    // editar; la Calculadora lo deja editable porque nunca edita, solo calcula.
    renderConProviders(
      <FormularioParametros modoEditable={false} onSubmit={vi.fn()} etiquetaAccion="Guardar" />,
    )
    expect(screen.getByLabelText(/modo/i)).toBeDisabled()
  })

  it('no deshabilita el campo modo cuando modoEditable es true', () => {
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={vi.fn()} etiquetaAccion="Calcular" />,
    )
    expect(screen.getByLabelText(/modo/i)).not.toBeDisabled()
  })

  it('los campos Cuota Inicial, Valor Residual y Comisión de Estructuración son de moneda, no de porcentaje', () => {
    // Regla que el usuario corrigió explícitamente: son inputs de MONTO ($), no
    // de porcentaje. Solo Descuento y TEA llevan sufijo "%".
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={vi.fn()} etiquetaAccion="Calcular" />,
    )

    const cuotaInicial = screen.getByLabelText(/cuota inicial/i)
    const valorResidual = screen.getByLabelText(/valor residual/i)
    const comisionEstructuracion = screen.getByLabelText(/comisión de estructuración/i)
    const descuento = screen.getByLabelText(/descuento/i)
    const tea = screen.getByLabelText(/^tea/i)

    // AntD InputNumber con `addonBefore`/`prefix` "$" pinta el símbolo en un
    // elemento hermano dentro del mismo wrapper, no dentro del <input>.
    expect(cuotaInicial.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).toContain('$')
    expect(valorResidual.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).toContain('$')
    expect(comisionEstructuracion.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).toContain('$')

    expect(descuento.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).toContain('%')
    expect(tea.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).toContain('%')

    // Y ninguno de los tres campos de monto lleva "%".
    expect(cuotaInicial.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).not.toContain('%')
    expect(valorResidual.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).not.toContain('%')
    expect(comisionEstructuracion.closest('.ant-input-number-group-wrapper, .ant-input-number-affix-wrapper')?.textContent).not.toContain('%')
  })

  it('avisa cuando la cuota inicial no es menor que el precio con descuento', async () => {
    // UX proactiva con `validarCuotaInicial` (§7.6). La validación autoritativa
    // sigue siendo la del backend — esto no reemplaza el manejo del 400.
    const user = userEvent.setup()
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={vi.fn()} etiquetaAccion="Calcular" />,
    )

    await user.type(screen.getByLabelText(/precio de venta/i), '10000')
    const cuotaInicial = screen.getByLabelText(/cuota inicial/i)
    await user.clear(cuotaInicial)
    await user.type(cuotaInicial, '10000')
    await user.tab()

    expect(
      await screen.findByText(/la cuota inicial debe ser menor que el precio con descuento/i),
    ).toBeInTheDocument()
  })

  it('no calcula el principal en el cliente para validar el valor residual', async () => {
    // Auditoría T8.1 (C3): había un aviso proactivo acá que derivaba el
    // `principal` en el cliente (con el IGV 1.18 a mano) — es el cálculo de
    // negocio que el plan manda ESCALAR, no implementar. Se eliminó: la
    // validación autoritativa del backend (400 VALIDACION) es la única fuente
    // de verdad. Este test fija que un valor residual absurdo no dispara
    // ningún aviso local — si alguien reintroduce el cálculo, este test no lo
    // detecta por sí solo, pero documenta la decisión para que no se repita
    // sin pasar por el arquitecto.
    const user = userEvent.setup()
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={vi.fn()} etiquetaAccion="Calcular" />,
    )

    await user.type(screen.getByLabelText(/precio de venta/i), '50000')
    const valorResidual = screen.getByLabelText(/valor residual/i)
    await user.clear(valorResidual)
    await user.type(valorResidual, '999999')
    await user.tab()

    expect(
      screen.queryByText(/el valor residual debe ser menor que el principal/i),
    ).not.toBeInTheDocument()
  })

  it('llama a onSubmit con los valores del formulario al enviar', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={onSubmit} etiquetaAccion="Calcular" />,
    )

    await user.type(screen.getByLabelText(/precio de venta/i), '150000')
    await user.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const enviado = onSubmit.mock.calls[0]?.[0] as CrearSimulacionInput
    expect(enviado.modo).toBe('leasing')
    expect(enviado.precio_venta).toBe('150000')
    expect(enviado.plazo_meses).toBe(DEFAULTS_SIMULACION.plazo_meses)
    expect(enviado.tea).toBe(DEFAULTS_SIMULACION.tea)
  })

  it('muestra el error del backend inline en el campo que indica error.field', async () => {
    // CLAUDE.md regla 7 / encargo §9: siempre manejar el rechazo del backend,
    // no reemplazarlo por la validación proactiva. El componente no llama a la
    // red por su cuenta (solo expone `onSubmit`): acá `onSubmit` es quien hace
    // el POST real contra el endpoint mockeado, y el formulario reacciona al
    // rechazo de esa promesa mapeando `error.field` al campo correspondiente.
    servidorMock.use(
      http.post(`${BASE_API}/calculadora`, () =>
        HttpResponse.json(
          {
            data: null,
            meta: null,
            error: { code: 'VALIDACION', message: 'La cuota inicial no es válida', field: 'cuota_inicial' },
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    const onSubmit = vi.fn(async (valores: CrearSimulacionInput) => {
      await post('/calculadora', valores)
    })
    renderConProviders(
      <FormularioParametros modoEditable onSubmit={onSubmit} etiquetaAccion="Calcular" />,
    )

    await user.type(screen.getByLabelText(/precio de venta/i), '150000')
    await user.click(screen.getByRole('button', { name: 'Calcular' }))

    expect(await screen.findByText('La cuota inicial no es válida')).toBeInTheDocument()
    // El mensaje sale junto al campo, no como toast/notification global.
    expect(
      screen.getByLabelText(/cuota inicial/i).closest('.ant-form-item')?.textContent,
    ).toContain('La cuota inicial no es válida')
  })
})
