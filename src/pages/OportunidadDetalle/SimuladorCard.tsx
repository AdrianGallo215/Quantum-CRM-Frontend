import { useState } from 'react'
import { App, Alert, Modal, Select, Tag } from 'antd'
import { FormularioParametros } from '@/components/simulaciones/FormularioParametros'
import { codigoDeError, mensajeDeError } from '@/api/client'
import {
  useActualizarSimulacion,
  useBifurcarSimulacion,
  useCrearSimulacion,
  useSimulacionesListado,
} from '@/hooks/useSimulaciones'
import { useAuthStore } from '@/store/authStore'
import { puedeSimularEnOportunidad } from '@/utils/simulacionPermisos'
import type { Oportunidad, OportunidadItem } from '@/types/oportunidad'
import type {
  ActualizarSimulacionInput,
  CrearSimulacionInput,
  Simulacion,
} from '@/types/simulacion'

/** Id de mutación inofensivo mientras no hay simulación que editar: los hooks se
 *  llaman siempre (regla de hooks) pero solo se disparan con una existente. */
const SIN_SIMULACION = 0

export function SimuladorCard({ oportunidad }: { oportunidad: Oportunidad }) {
  const empleado = useAuthStore((s) => s.empleado)

  // §2.15: para el `vendedor` el permiso es POR RECURSO. Guard de UX, no de
  // seguridad (CLAUDE.md regla 8) — el backend responde 403/404 igual.
  if (!puedeSimularEnOportunidad(empleado, oportunidad)) return null
  if (oportunidad.items.length === 0) return null

  return <Contenido oportunidad={oportunidad} />
}

function Contenido({ oportunidad }: { oportunidad: Oportunidad }) {
  const { message } = App.useApp()
  const [idItemElegido, setIdItemElegido] = useState<number | null>(null)
  const [bifurcacionPendiente, setBifurcacionPendiente] = useState<CrearSimulacionInput | null>(
    null,
  )

  // ⚠ Encargo §5.2 / reglas §1.1 (D24): con un solo ítem se enlaza directo y el
  // usuario NUNCA ve un selector. No es una optimización de UI: es una regla
  // explícita del encargo, y `SimuladorCard.test.tsx` la deja clavada.
  const requiereSelectorItem = oportunidad.items.length > 1
  const itemSeleccionado: OportunidadItem | null =
    oportunidad.items.length === 1
      ? (oportunidad.items[0] ?? null)
      : (oportunidad.items.find((it) => it.id === idItemElegido) ?? null)

  // Crear o editar se decide por lo que ya existe para ESE ítem: el listado
  // filtrado es el único endpoint que responde eso (§23). No se inventa nada.
  const listado = useSimulacionesListado(
    { id_oportunidad_item: itemSeleccionado?.id },
    itemSeleccionado !== null,
  )
  const simulaciones: Simulacion[] = listado.data?.data ?? []
  const existente: Simulacion | null =
    simulaciones.find((s) => s.es_principal) ?? simulaciones[0] ?? null

  const crear = useCrearSimulacion()
  const actualizar = useActualizarSimulacion(existente?.id ?? SIN_SIMULACION)
  const bifurcar = useBifurcarSimulacion(existente?.id ?? SIN_SIMULACION)

  const handleGuardar = async (valores: CrearSimulacionInput) => {
    if (!itemSeleccionado) return
    try {
      if (existente) {
        await actualizar.mutateAsync(aInputActualizar(valores))
      } else {
        await crear.mutateAsync({ ...valores, id_oportunidad_item: itemSeleccionado.id })
      }
      message.success('Simulación guardada')
    } catch (e) {
      // K34/D30: el campo va deshabilitado, así que este 409 es la red de
      // seguridad. La salida que se ofrece es la ÚNICA vía autorizada para
      // cambiar de modo: bifurcar.
      if (codigoDeError(e) === 'MODO_INMUTABLE') {
        setBifurcacionPendiente(valores)
        return
      }
      // Cualquier otro error vuelve al formulario, que lo muestra inline en el
      // campo que señala `error.field` (§9).
      throw e
    }
  }

  const handleBifurcar = async () => {
    if (!bifurcacionPendiente || !itemSeleccionado) return
    try {
      await bifurcar.mutateAsync({
        ...bifurcacionPendiente,
        id_oportunidad_item: itemSeleccionado.id,
      })
      message.success('Se guardó como una nueva simulación')
      setBifurcacionPendiente(null)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar como nueva simulación'))
    }
  }

  return (
    <div className="bg-white p-container-padding rounded border border-outline-variant custom-shadow flex flex-col gap-6">
      <h2 className="font-headline text-headline-md text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">calculate</span>
        Simulador Financiero
      </h2>

      {requiereSelectorItem && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="simulador-item"
            className="font-label-md text-label-md text-on-surface-variant"
          >
            Ítem a simular
          </label>
          <Select
            id="simulador-item"
            placeholder="Elegí el modelo a simular"
            value={idItemElegido ?? undefined}
            onChange={setIdItemElegido}
            options={oportunidad.items.map((it) => ({
              value: it.id,
              label: `${it.modelo.codigo} × ${it.cantidad}`,
            }))}
          />
        </div>
      )}

      {itemSeleccionado === null ? (
        <p className="text-body-md text-on-surface-variant">
          Elegí un ítem para simular su financiamiento.
        </p>
      ) : listado.isLoading ? (
        <p className="text-body-md text-on-surface-variant">Cargando la simulación del ítem…</p>
      ) : (
        <>
          {!existente && (
            <Alert
              type="info"
              showIcon
              message={
                <span>
                  Precio y descuento autocompletados del ítem{' '}
                  <Tag color="blue">{itemSeleccionado.modelo.codigo}</Tag>
                </span>
              }
            />
          )}
          {existente && (
            <Alert
              type="warning"
              showIcon
              message="El modo no se puede cambiar después de crear la simulación"
            />
          )}

          {/*
            `key` fuerza el remount al cambiar de ítem o al resolverse el
            listado: `FormularioParametros` toma `initialValues` una sola vez
            (antd `Form`), así que sin esto el formulario se quedaría con los
            valores del ítem anterior.
          */}
          <FormularioParametros
            key={`${itemSeleccionado.id}-${existente?.id ?? 'nueva'}`}
            modoEditable={existente === null}
            etiquetaAccion="Guardar Simulación"
            cargando={crear.isPending || actualizar.isPending}
            valoresIniciales={valoresIniciales(itemSeleccionado, existente)}
            onSubmit={handleGuardar}
          />

          <p className="text-body-md text-on-surface-variant italic">
            Cuota final: se calcula y confirma al guardar — no se edita manualmente aquí.
          </p>

          {/*
            Auditoría T8.1 (C5): K27 (`plan-04-mapa-vistas-simulaciones.md`)
            describe §5.2 como "formulario + cronograma + guardar", pero esta
            card, igual que el mockup H0 aprobado, no muestra `<CronogramaTabla/>`
            tras guardar — el vendedor lo ve entrando al detalle de la
            simulación desde el módulo. Decisión explícita: se deja así por
            ahora, documentado para evaluar en una sesión futura si conviene
            mostrarlo acá también (evitaría el salto de pantalla).
          */}
        </>
      )}

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

/**
 * El PATCH lleva los 8 parámetros y NADA más. Se enumeran a mano, sin `rest`,
 * para que quede a la vista qué NO viaja:
 *  - `modo`: es INMUTABLE tras la creación (§7.1) y el tipo del input ya lo
 *    excluye — mandarlo responde `409 MODO_INMUTABLE`;
 *  - `cuota_final`: es SOLO LECTURA, la calcula el backend y ni siquiera existe
 *    como campo de entrada (§7.2);
 *  - `id_oportunidad_item`: la simulación ya está enlazada a este ítem.
 */
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

/**
 * Al crear, `precio_venta` y `descuento` salen del ÍTEM y el resto lo pone
 * `DEFAULTS_SIMULACION` dentro del formulario (§6.1). Al editar, los valores son
 * los de la simulación persistida.
 *
 * `cuota_final` NUNCA entra acá: es solo lectura y no existe en el input (§7.2).
 */
function valoresIniciales(
  item: OportunidadItem,
  existente: Simulacion | null,
): Partial<CrearSimulacionInput> {
  if (!existente) {
    return { precio_venta: item.precio_venta, descuento: item.descuento }
  }
  return {
    modo: existente.modo,
    precio_venta: existente.precio_venta,
    descuento: existente.descuento,
    cuota_inicial: existente.cuota_inicial,
    plazo_meses: existente.plazo_meses,
    tea: existente.tea,
    valor_residual: existente.valor_residual,
    dias_trabajados: existente.dias_trabajados,
    comision_estructuracion: existente.comision_estructuracion,
  }
}
