import { Alert, Button, Spin } from 'antd'
import { mensajeDeError } from '@/api/client'

export function Cargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
      <Spin size="large" tip={mensaje}>
        <div style={{ minHeight: 80, minWidth: 120 }} />
      </Spin>
    </div>
  )
}

export function ErrorCarga({
  error,
  onReintentar,
}: {
  error: unknown
  onReintentar?: () => void
}) {
  return (
    <Alert
      type="error"
      showIcon
      message="No se pudo cargar la información"
      description={mensajeDeError(error)}
      action={
        onReintentar ? (
          <Button size="small" onClick={onReintentar}>
            Reintentar
          </Button>
        ) : undefined
      }
      style={{ borderRadius: 4, margin: '24px 0' }}
    />
  )
}
