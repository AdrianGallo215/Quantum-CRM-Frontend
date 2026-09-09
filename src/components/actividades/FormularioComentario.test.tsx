import { describe, expect, it, vi } from 'vitest'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { FormularioComentario } from './FormularioComentario'

describe('FormularioComentario', () => {
  it('deshabilita el botón cuando el campo solo tiene espacios', async () => {
    // El backend rechaza texto vacío con 400 (informe §5). Es validación de UX:
    // la autoritativa sigue siendo la del backend (CLAUDE.md regla 7).
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), '   ')
    expect(screen.getByRole('button', { name: /comentar/i })).toBeDisabled()
  })

  it('envía el texto recortado', async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), '  hola  ')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(onEnviar).toHaveBeenCalledWith('hola'))
  })

  it('limpia el campo tras un envío exitoso', async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    const campo = screen.getByLabelText(/nuevo comentario/i)
    await userEvent.type(campo, 'hola')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('NO limpia el campo si el envío falla', async () => {
    // Perder lo que el usuario escribió porque el servidor falló es el peor
    // desenlace posible de este formulario.
    const onEnviar = vi.fn().mockRejectedValue(new Error('boom'))
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    const campo = screen.getByLabelText(/nuevo comentario/i)
    await userEvent.type(campo, 'hola')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(onEnviar).toHaveBeenCalled())
    expect(campo).toHaveValue('hola')
  })
})
