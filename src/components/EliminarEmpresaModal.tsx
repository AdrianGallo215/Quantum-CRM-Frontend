import { useState } from 'react'
import { App, Input, Modal } from 'antd'
import { useEliminarEmpresa } from '@/hooks/useEmpresas'
import { mensajeDeError } from '@/api/client'

interface Props {
  empresa: { id: number; razon_social: string } | null
  onClose: () => void
  /** Llamado tras eliminar con éxito — ej. navegar fuera del detalle si ya no existe */
  onEliminada?: () => void
}

/**
 * Confirmación explícita de borrado de empresa (admin, irreversible): el admin debe
 * teclear la razón social exacta para habilitar el botón. Un "¿estás seguro?" genérico
 * no basta — esto cascadea oportunidades, tareas y eventos en el backend.
 */
export function EliminarEmpresaModal({ empresa, onClose, onEliminada }: Props) {
  const { message } = App.useApp()
  const [texto, setTexto] = useState('')
  const eliminar = useEliminarEmpresa()

  const cerrar = () => {
    setTexto('')
    onClose()
  }

  const confirmado = empresa !== null && texto.trim() === empresa.razon_social

  const onEliminar = () => {
    if (!empresa || !confirmado) return
    eliminar.mutate(empresa.id, {
      onSuccess: () => {
        message.success(`Empresa "${empresa.razon_social}" eliminada`)
        cerrar()
        onEliminada?.()
      },
      onError: (e) => message.error(mensajeDeError(e, 'No se pudo eliminar la empresa')),
    })
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ba1a1a' }}>
          <span className="material-symbols-outlined">warning</span>
          Eliminar empresa
        </span>
      }
      open={empresa !== null}
      onCancel={cerrar}
      okText="Eliminar empresa"
      okButtonProps={{ danger: true, disabled: !confirmado }}
      cancelText="Cancelar"
      confirmLoading={eliminar.isPending}
      onOk={onEliminar}
      destroyOnHidden
      width={480}
    >
      <p style={{ marginBottom: 8 }}>
        Esta acción es <strong>irreversible</strong>. Al eliminar <strong>{empresa?.razon_social}</strong>{' '}
        también se eliminarán:
      </p>
      <ul style={{ marginBottom: 16, paddingLeft: 20, color: '#444750' }}>
        <li>Todas sus oportunidades</li>
        <li>Todas sus tareas</li>
        <li>Todos sus eventos</li>
      </ul>
      <p style={{ marginBottom: 16, color: '#444750' }}>
        Sus contactos <strong>no</strong> se eliminan — solo se desvinculan de esta empresa.
      </p>
      <p style={{ marginBottom: 8 }}>
        Para confirmar, escribe el nombre exacto de la empresa:{' '}
        <strong>{empresa?.razon_social}</strong>
      </p>
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={empresa?.razon_social}
        onPressEnter={onEliminar}
      />
    </Modal>
  )
}
