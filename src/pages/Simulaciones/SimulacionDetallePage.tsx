import { useState } from 'react'
import { App, Alert, Button, Card, Descriptions, Modal, Space, Tag, Tooltip, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { CronogramaTabla } from '@/components/simulaciones/CronogramaTabla'
import { FormularioParametros } from '@/components/simulaciones/FormularioParametros'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { codigoDeError, estadoHttpDeError, mensajeDeError } from '@/api/client'
import {
  useActualizarSimulacion,
  useBifurcarSimulacion,
  useCronograma,
  useEliminarSimulacion,
  useMarcarPrincipal,
  useSimulacion,
} from '@/hooks/useSimulaciones'
import { formatoFecha, formatoFechaHora, formatoMonto } from '@/utils/formato'
import { formatoTea } from '@/utils/simulaciones'
import { RUTA_SIMULACIONES } from '@/router/rutas'
import type {
  ActualizarSimulacionInput,
  CrearSimulacionInput,
  Simulacion,
} from '@/types/simulacion'

/**
 * T5.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.1. Detalle de
 * una simulación: parámetros + `<CronogramaTabla/>` (D23, componente tonto
 * reutilizado tal cual) + acciones.
 */
export function SimulacionDetallePage() {
  const { id } = useParams()
  const idSimulacion = Number(id)
  const simulacion = useSimulacion(idSimulacion)

  if (simulacion.isLoading) return <Cargando />

  if (simulacion.isError) {
    // D30/K18: el 404 nunca insinúa "no tenés permiso" — filtra la existencia
    // del recurso, que es justo lo que ese código protege contra IDOR. El
    // mensaje es genérico y no depende de lo que diga el backend.
    if (estadoHttpDeError(simulacion.error) === 404) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Esta simulación no existe"
          description="Puede haber sido eliminada o el enlace es incorrecto."
          style={{ margin: '24px 0' }}
        />
      )
    }
    return <ErrorCarga error={simulacion.error} onReintentar={() => void simulacion.refetch()} />
  }

  if (!simulacion.data) return null

  return <Contenido simulacion={simulacion.data} />
}

function Contenido({ simulacion }: { simulacion: Simulacion }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)
  const [bifurcacionPendiente, setBifurcacionPendiente] = useState<CrearSimulacionInput | null>(
    null,
  )

  const cronograma = useCronograma(simulacion.id)
  const actualizar = useActualizarSimulacion(simulacion.id)
  const bifurcar = useBifurcarSimulacion(simulacion.id)
  const marcarPrincipal = useMarcarPrincipal()
  const eliminar = useEliminarSimulacion()

  // Sin ítem, `id_oportunidad_item` es null (reglas §5): es huérfana.
  const esHuerfana = simulacion.id_oportunidad_item === null

  const handleGuardar = async (valores: CrearSimulacionInput) => {
    try {
      await actualizar.mutateAsync(aInputActualizar(valores))
      message.success('Simulación actualizada')
      setEditando(false)
    } catch (e) {
      // K34/D30: el campo `modo` va deshabilitado en edición, así que este
      // 409 es la red de seguridad. La única salida autorizada es bifurcar.
      if (codigoDeError(e) === 'MODO_INMUTABLE') {
        setBifurcacionPendiente(valores)
        return
      }
      throw e
    }
  }

  const handleBifurcar = async () => {
    if (!bifurcacionPendiente) return
    try {
      const nueva = await bifurcar.mutateAsync(bifurcacionPendiente)
      message.success('Se guardó como una nueva simulación')
      setBifurcacionPendiente(null)
      navigate(`${RUTA_SIMULACIONES}/${nueva.id}`)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar como nueva simulación'))
    }
  }

  const handleMarcarPrincipal = async () => {
    try {
      // K33: si ya es principal, el backend responde éxito igual — no-op,
      // nunca se trata como error.
      await marcarPrincipal.mutateAsync(simulacion.id)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo marcar como principal'))
    }
  }

  const handleEliminar = async () => {
    try {
      await eliminar.mutateAsync({ id: simulacion.id, idOportunidad: simulacion.id_oportunidad })
      message.success('Simulación eliminada')
      navigate(RUTA_SIMULACIONES)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo eliminar la simulación'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Space align="center">
          <Typography.Title level={3} style={{ margin: 0 }}>
            {simulacion.nombre}
          </Typography.Title>
          {simulacion.es_principal && <Tag color="gold">Principal</Tag>}
          {!simulacion.nombre_es_manual && <Tag>Autogenerado</Tag>}
        </Space>
        <Space>
          <Button onClick={() => setEditando(true)}>Editar</Button>
          {/*
            §7.5/K33: sin ítem no se ofrece marcar como principal — el
            backend respondería 400 VALIDACION. Guard de UX (CLAUDE.md
            regla 8), la garantía real la impone el backend.
          */}
          {!esHuerfana && (
            <Button loading={marcarPrincipal.isPending} onClick={() => void handleMarcarPrincipal()}>
              Marcar como principal
            </Button>
          )}
          {/*
            TODO(T6.1): habilitar cuando exista <HistorialModal/> (encargo
            §5.5). Deshabilitado a propósito mientras esa tarea no se entregue.
          */}
          <Tooltip title="Disponible cuando se entregue T6.1 (Historial de versiones)">
            <Button disabled>Historial</Button>
          </Tooltip>
          <Button danger loading={eliminar.isPending} onClick={() => void handleEliminar()}>
            Eliminar
          </Button>
        </Space>
      </div>

      {/*
        D29 (aviso 3 de 3: permanente en el detalle). §8.3: nunca se promete
        un aviso futuro — la garantía real, siempre visible, es la fecha.
      */}
      {esHuerfana && simulacion.eliminacion_prevista_el && (
        <Alert
          type="warning"
          showIcon
          message="Esta simulación no está vinculada a ninguna oportunidad"
          description={`Se eliminará el ${formatoFecha(simulacion.eliminacion_prevista_el)} si no se enlaza antes a un ítem.`}
        />
      )}

      <Card title="Parámetros">
        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} bordered size="small">
          <Descriptions.Item label="Modo">
            {simulacion.modo === 'leasing' ? 'Leasing' : 'Crédito Directo'}
          </Descriptions.Item>
          <Descriptions.Item label="Precio de venta">
            {formatoMonto(simulacion.precio_venta)}
          </Descriptions.Item>
          <Descriptions.Item label="Descuento">{simulacion.descuento}%</Descriptions.Item>
          <Descriptions.Item label="Cuota inicial">
            {formatoMonto(simulacion.cuota_inicial)}
          </Descriptions.Item>
          <Descriptions.Item label="Plazo">{simulacion.plazo_meses} meses</Descriptions.Item>
          <Descriptions.Item label="TEA">{formatoTea(simulacion.tea)}</Descriptions.Item>
          <Descriptions.Item label="Valor residual">
            {formatoMonto(simulacion.valor_residual)}
          </Descriptions.Item>
          <Descriptions.Item label="Última edición">
            {formatoFechaHora(simulacion.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {cronograma.isLoading && <Cargando />}
      {cronograma.isError && (
        <ErrorCarga error={cronograma.error} onReintentar={() => void cronograma.refetch()} />
      )}
      {cronograma.data && (
        <CronogramaTabla cronograma={cronograma.data} modo={simulacion.modo} />
      )}

      <Modal
        title="Editar simulación"
        open={editando}
        onCancel={() => setEditando(false)}
        footer={null}
        destroyOnClose
      >
        <FormularioParametros
          modoEditable={false}
          etiquetaAccion="Guardar"
          cargando={actualizar.isPending}
          valoresIniciales={valoresIniciales(simulacion)}
          onSubmit={handleGuardar}
        />
      </Modal>

      <Modal
        title="El modo ya no se puede cambiar"
        open={bifurcacionPendiente !== null}
        onCancel={() => setBifurcacionPendiente(null)}
        onOk={() => void handleBifurcar()}
        okText="Guardar como Nueva Simulación"
        cancelText="Cancelar"
        confirmLoading={bifurcar.isPending}
      >
        <p>
          El modo de una simulación es inmutable. Podés guardar estos parámetros como una
          simulación nueva, dejando la original intacta.
        </p>
      </Modal>
    </div>
  )
}

/** Mismo recorte que `SimuladorCard` (T4.1): los 8 parámetros y nada más —
 *  ni `modo` (inmutable, 409 si se envía) ni `cuota_final` (solo lectura). */
function aInputActualizar(v: CrearSimulacionInput): ActualizarSimulacionInput {
  return {
    precio_venta: v.precio_venta,
    cuota_inicial: v.cuota_inicial,
    plazo_meses: v.plazo_meses,
    tea: v.tea,
    descuento: v.descuento,
    valor_residual: v.valor_residual,
    dias_trabajados: v.dias_trabajados,
    comision_estructuracion: v.comision_estructuracion,
  }
}

function valoresIniciales(simulacion: Simulacion): Partial<CrearSimulacionInput> {
  return {
    modo: simulacion.modo,
    precio_venta: simulacion.precio_venta,
    descuento: simulacion.descuento,
    cuota_inicial: simulacion.cuota_inicial,
    plazo_meses: simulacion.plazo_meses,
    tea: simulacion.tea,
    valor_residual: simulacion.valor_residual,
    dias_trabajados: simulacion.dias_trabajados,
    comision_estructuracion: simulacion.comision_estructuracion,
  }
}
