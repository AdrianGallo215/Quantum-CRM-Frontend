import { useState } from 'react'
import { App, Button, Input } from 'antd'
import { mensajeDeError } from '@/api/client'

/** Límite del backend (informe §5). El `maxLength` es UX; el rechazo real es del servidor. */
const MAX_TEXTO = 5000

interface Props {
  /** Persiste el comentario. Debe RECHAZAR en error para que el campo no se limpie. */
  onEnviar: (texto: string) => Promise<unknown>
  enviando: boolean
}

/**
 * Alta de un comentario de seguimiento. Los comentarios son append-only: no hay
 * editar ni borrar, así que este formulario no tiene modo edición.
 */
export function FormularioComentario({ onEnviar, enviando }: Props) {
  const { message } = App.useApp()
  const [texto, setTexto] = useState('')
  const recortado = texto.trim()

  const enviar = async () => {
    if (recortado === '') return
    try {
      await onEnviar(recortado)
      setTexto('')
      message.success('Comentario agregado')
    } catch (e) {
      // No se limpia el campo: el usuario no puede perder lo que escribió.
      message.error(mensajeDeError(e, 'No se pudo agregar el comentario'))
    }
  }

  return (
    <div className="space-y-2">
      <Input.TextArea
        aria-label="Nuevo comentario"
        rows={3}
        maxLength={MAX_TEXTO}
        showCount
        placeholder="Escribe un comentario de seguimiento…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={enviando}
      />
      <div className="flex justify-end">
        <Button
          type="primary"
          loading={enviando}
          disabled={recortado === ''}
          onClick={() => void enviar()}
        >
          Comentar
        </Button>
      </div>
    </div>
  )
}
