import { App, Alert, Button, Empty, List, Modal, Tag, Typography } from 'antd'
import { estadoHttpDeError, mensajeDeError } from '@/api/client'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { useHistorialSimulacion, useRestaurarSimulacion } from '@/hooks/useSimulaciones'
import { formatoFechaHora } from '@/utils/formato'
import type { CambioDiff, EventoHistorial } from '@/types/simulacion'
import type { TipoEventoSimulacion } from '@/types/enums'

const { Text } = Typography

interface Props {
  idSimulacion: number
  open: boolean
  onClose: () => void
}

const ETIQUETAS_TIPO_EVENTO: Record<TipoEventoSimulacion, string> = {
  creada: 'Creada',
  editada: 'Editada',
  restaurada: 'Restaurada',
}

/**
 * T6.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.5. Historial de
 * versiones de una simulación: ventana de 15 eventos / 7 días, no la bitácora
 * completa (§23) — no pagina ni promete que hay más en otro lado.
 *
 * Componente tonto salvo por la mutación de restaurar: la lista viene tal cual
 * la ordena el backend (más recientes primero) y no se reordena acá.
 */
export function HistorialModal({ idSimulacion, open, onClose }: Props) {
  const { message } = App.useApp()
  const historial = useHistorialSimulacion(idSimulacion)
  const restaurar = useRestaurarSimulacion(idSimulacion)

  const handleRestaurar = async (idEventoLog: number) => {
    try {
      // La invalidación de D18 (cronograma + oportunidad) ya la hace el hook
      // `useRestaurarSimulacion` — no se duplica acá.
      await restaurar.mutateAsync(idEventoLog)
      message.success('Se restauró la versión seleccionada')
    } catch (e) {
      // D30: el 404 de restaurar cubre CUATRO motivos que el backend no
      // distingue a propósito (no existe, no es de esta simulación, fuera de
      // la ventana de 7 días/15 versiones, o tipo no restaurable). Mensaje
      // genérico y único — no especular cuál de los cuatro fue.
      if (estadoHttpDeError(e) === 404) {
        message.error('Esa versión ya no se puede restaurar')
        return
      }
      message.error(mensajeDeError(e, 'No se pudo restaurar la versión'))
    }
  }

  return (
    <Modal title="Historial de versiones" open={open} onCancel={onClose} footer={null} width={640}>
      <Alert
        type="info"
        showIcon
        message="Se muestran hasta 15 eventos de los últimos 7 días"
        description="Es una ventana reciente, no la bitácora completa de la simulación."
        style={{ marginBottom: 16 }}
      />

      {historial.isLoading && <Cargando />}
      {historial.isError && (
        <ErrorCarga error={historial.error} onReintentar={() => void historial.refetch()} />
      )}
      {historial.data && historial.data.length === 0 && (
        <Empty description="Sin eventos registrados" />
      )}
      {historial.data && historial.data.length > 0 && (
        <List
          dataSource={historial.data}
          renderItem={(evento) => (
            <EventoItem
              key={evento.id_evento_log}
              evento={evento}
              onRestaurar={() => void handleRestaurar(evento.id_evento_log)}
              restaurando={restaurar.isPending}
            />
          )}
        />
      )}
    </Modal>
  )
}

function EventoItem({
  evento,
  onRestaurar,
  restaurando,
}: {
  evento: EventoHistorial
  onRestaurar: () => void
  restaurando: boolean
}) {
  // §5.5: `created_by` viene null cuando el evento lo generó un job automático.
  // Mostrar "Sistema", nunca "undefined".
  const autor = evento.created_by === null ? 'Sistema' : `Empleado #${evento.created_by}`

  return (
    <List.Item data-testid="historial-evento" style={{ alignItems: 'flex-start' }}>
      <List.Item.Meta
        title={
          <>
            <Tag>{ETIQUETAS_TIPO_EVENTO[evento.tipo_evento]}</Tag>
            <Text type="secondary">{formatoFechaHora(evento.created_at)}</Text>
            {' · '}
            <Text type="secondary">{autor}</Text>
          </>
        }
        description={<DiffLista diff={evento.diff} />}
      />
      <Button size="small" onClick={onRestaurar} loading={restaurando}>
        Restaurar
      </Button>
    </List.Item>
  )
}

function DiffLista({ diff }: { diff: CambioDiff[] }) {
  // §5.5: diff vacío es legítimo y frecuente (primer evento, o una escritura
  // que no tocó parámetros de cálculo) — no es un bug, no se muestra como error.
  if (diff.length === 0) {
    return <Text type="secondary">Sin cambios de parámetros</Text>
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 16 }}>
      {diff.map((cambio) => (
        <li key={cambio.campo}>
          <Text strong>{cambio.campo}</Text>: {cambio.valor_anterior ?? '—'} → {cambio.valor_nuevo ?? '—'}
        </li>
      ))}
    </ul>
  )
}
