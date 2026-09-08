import { useMemo, useState } from 'react'
import { App, Button, Empty, InputNumber, Modal, Select, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { FormularioParametros } from '@/components/simulaciones/FormularioParametros'
import { mensajeDeError } from '@/api/client'
import {
  useCrearSimulacion,
  useMarcarPrincipal,
  useSimulacionesListado,
} from '@/hooks/useSimulaciones'
import { useModelos } from '@/hooks/useCatalogos'
import { useOportunidades } from '@/hooks/useOportunidades'
import { TarjetaSimulacion } from './TarjetaSimulacion'
import type { Oportunidad } from '@/types/oportunidad'
import type { CrearSimulacionInput, Simulacion, SimulacionesFiltros } from '@/types/simulacion'
import type { ModoSimulacion } from '@/types/enums'

/**
 * T5.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.1. Listado del
 * módulo Simulaciones: toolbar con filtros + botón "Nueva simulación" (H0
 * aprobado), grid de tarjetas agrupadas por oportunidad y una sección aparte
 * "Sin vincular" al final para las huérfanas.
 */
export function SimulacionesPage() {
  // Client state — filtros de UI, NUNCA Zustand con datos del servidor
  // (`CLAUDE.md` regla 3).
  const [idOportunidadItem, setIdOportunidadItem] = useState<number | null>(null)
  const [idModelo, setIdModelo] = useState<number | null>(null)
  const [modo, setModo] = useState<ModoSimulacion | null>(null)
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)

  const filtros: SimulacionesFiltros = {
    ...(idOportunidadItem !== null && { id_oportunidad_item: idOportunidadItem }),
    ...(idModelo !== null && { id_modelo: idModelo }),
    ...(modo !== null && { modo }),
  }

  const listado = useSimulacionesListado(filtros)
  const modelos = useModelos()
  const marcarPrincipal = useMarcarPrincipal()
  const { message } = App.useApp()

  const simulaciones: Simulacion[] = useMemo(() => listado.data?.data ?? [], [listado.data])

  // §8.1: agrupar por empresa requiere `id_empresa` en el DTO, que hoy no
  // viene. NO se parsea el nombre autogenerado — el encargo lo prohíbe
  // expresamente y además se rompe con nombre manual. Pedido abierto en
  // docs/solicitud-backend-simulaciones.md (K30). Se agrupa solo por
  // `id_oportunidad`, que el backend ya deriva del ítem.
  const { grupos, huerfanas } = useMemo(() => agrupar(simulaciones), [simulaciones])

  const handleMarcarPrincipal = async (id: number) => {
    try {
      await marcarPrincipal.mutateAsync(id)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo marcar como principal'))
    }
  }

  return (
    <div className="page-container">
        <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Simulaciones
          </Typography.Title>
          <Button type="primary" onClick={() => setModalNuevaAbierto(true)}>
            Nueva simulación
          </Button>
        </div>

        <Space wrap size="middle">
          <InputNumber
            aria-label="Ítem (ID)"
            placeholder="Ítem (ID)"
            min={1}
            value={idOportunidadItem ?? undefined}
            onChange={(v) => setIdOportunidadItem(typeof v === 'number' ? v : null)}
          />
          <Select
            aria-label="Modelo"
            placeholder="Modelo"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 180 }}
            loading={modelos.isLoading}
            value={idModelo ?? undefined}
            onChange={(v: number | undefined) => setIdModelo(v ?? null)}
            options={(modelos.data ?? []).map((m) => ({ value: m.id, label: m.codigo }))}
          />
          <Select
            aria-label="Modo"
            placeholder="Modo"
            allowClear
            style={{ minWidth: 160 }}
            value={modo ?? undefined}
            onChange={(v: ModoSimulacion | undefined) => setModo(v ?? null)}
            options={[
              { value: 'leasing', label: 'Leasing' },
              { value: 'credito_directo', label: 'Crédito Directo' },
            ]}
          />
        </Space>

        {listado.isLoading && <Cargando />}
        {listado.isError && (
          <ErrorCarga error={listado.error} onReintentar={() => void listado.refetch()} />
        )}

        {!listado.isLoading && !listado.isError && simulaciones.length === 0 && (
          <Empty description="No hay simulaciones con estos filtros" />
        )}

        {!listado.isLoading &&
          !listado.isError &&
          Array.from(grupos.entries()).map(([idOportunidad, filas]) => (
            <div key={idOportunidad} className="flex flex-col gap-3">
              <Link to={`/oportunidades/${idOportunidad}`} className="text-title-sm font-semibold">
                Oportunidad #{idOportunidad}
              </Link>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filas.map((s) => (
                  <TarjetaSimulacion
                    key={s.id}
                    simulacion={s}
                    onMarcarPrincipal={(id) => void handleMarcarPrincipal(id)}
                    marcandoPrincipal={marcarPrincipal.isPending && marcarPrincipal.variables === s.id}
                  />
                ))}
              </div>
            </div>
          ))}

        {!listado.isLoading && !listado.isError && huerfanas.length > 0 && (
          <div className="flex flex-col gap-3">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Sin vincular
            </Typography.Title>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {huerfanas.map((s) => (
                <TarjetaSimulacion key={s.id} simulacion={s} />
              ))}
            </div>
          </div>
        )}

        <ModalNuevaSimulacion
          open={modalNuevaAbierto}
          onClose={() => setModalNuevaAbierto(false)}
        />
      </div>
    </div>
  )
}

/** Agrupa por `id_oportunidad` (K30/§8.1). Las huérfanas (sin ítem, y por
 *  tanto sin oportunidad) van aparte, sin agrupación. */
function agrupar(simulaciones: Simulacion[]): {
  grupos: Map<number, Simulacion[]>
  huerfanas: Simulacion[]
} {
  const grupos = new Map<number, Simulacion[]>()
  const huerfanas: Simulacion[] = []
  for (const s of simulaciones) {
    if (s.id_oportunidad === null) {
      huerfanas.push(s)
      continue
    }
    const lista = grupos.get(s.id_oportunidad) ?? []
    lista.push(s)
    grupos.set(s.id_oportunidad, lista)
  }
  return { grupos, huerfanas }
}

/**
 * D29 (aviso 1 de 3: al guardar sin ítem). §7.4: "Al guardar una simulación
 * sin ítem, el frontend debe advertir y ofrecer dos salidas: buscar una
 * oportunidad para enlazar, o confirmar el guardado sin enlace."
 *
 * `FormularioParametros` no captura `id_oportunidad_item` (ese campo es del
 * simulador dentro de la oportunidad, D25), así que crear desde este listado
 * es inherentemente una simulación sin ítem hasta que el usuario elija
 * enlazarla. Por eso la advertencia se muestra ANTES de persistir, con las
 * dos salidas literales del encargo.
 */
function ModalNuevaSimulacion({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp()
  const [valoresPendientes, setValoresPendientes] = useState<CrearSimulacionInput | null>(null)
  const [buscandoOportunidad, setBuscandoOportunidad] = useState(false)
  const [idOportunidad, setIdOportunidad] = useState<number | null>(null)
  const [idItem, setIdItem] = useState<number | null>(null)

  const crear = useCrearSimulacion()
  const oportunidades = useOportunidades({ incluir_cerradas: false }, buscandoOportunidad)

  const lista: Oportunidad[] = oportunidades.data?.data ?? []
  const seleccionada = lista.find((o) => o.id === idOportunidad) ?? null
  const requiereSelectorItem = (seleccionada?.items.length ?? 0) > 1
  // D24: con un solo ítem se enlaza directo, sin selector.
  const idItemResuelto =
    seleccionada === null
      ? null
      : seleccionada.items.length === 1
        ? (seleccionada.items[0]?.id ?? null)
        : idItem

  const reiniciar = () => {
    setValoresPendientes(null)
    setBuscandoOportunidad(false)
    setIdOportunidad(null)
    setIdItem(null)
  }

  const handleCerrarTodo = () => {
    reiniciar()
    onClose()
  }

  const handleSubmitFormulario = (valores: CrearSimulacionInput) => {
    // No se guarda todavía: primero, la advertencia obligatoria de §7.4.
    setValoresPendientes(valores)
  }

  const handleGuardarSinEnlace = async () => {
    if (!valoresPendientes) return
    try {
      await crear.mutateAsync(valoresPendientes)
      message.success('Simulación guardada sin vincular')
      handleCerrarTodo()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar la simulación'))
    }
  }

  const handleEnlazarYGuardar = async () => {
    if (!valoresPendientes || idItemResuelto === null) return
    try {
      await crear.mutateAsync({ ...valoresPendientes, id_oportunidad_item: idItemResuelto })
      message.success('Simulación guardada y enlazada')
      handleCerrarTodo()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo guardar la simulación'))
    }
  }

  return (
    <>
      <Modal
        title="Nueva simulación"
        open={open && !valoresPendientes}
        onCancel={handleCerrarTodo}
        footer={null}
        destroyOnClose
      >
        <FormularioParametros
          etiquetaAccion="Continuar"
          modoEditable
          onSubmit={handleSubmitFormulario}
        />
      </Modal>

      {/*
        D29: advertencia obligatoria antes de persistir sin ítem, con las DOS
        salidas que exige el encargo — nunca solo "aceptar".
      */}
      <Modal
        title="Esta simulación no está vinculada a ninguna oportunidad"
        open={valoresPendientes !== null}
        onCancel={handleCerrarTodo}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph>
          {/*
            §8.3: nunca prometer un aviso futuro. La garantía real es la
            fecha de eliminación prevista, que se muestra en cuanto la
            simulación exista (tarjeta y detalle).
          */}
          Podés buscar una oportunidad para enlazarla ahora, o guardarla sin vincular. Una
          simulación sin ítem se elimina automáticamente 30 días después de creada si no se
          enlaza antes.
        </Typography.Paragraph>

        {!buscandoOportunidad ? (
          <Space>
            <Button onClick={() => setBuscandoOportunidad(true)}>Buscar oportunidad</Button>
            <Button
              type="primary"
              loading={crear.isPending}
              onClick={() => void handleGuardarSinEnlace()}
            >
              Guardar sin vincular
            </Button>
          </Space>
        ) : (
          <div className="flex flex-col gap-3">
            <Select
              aria-label="Oportunidad"
              placeholder="Elegí una oportunidad"
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              loading={oportunidades.isLoading}
              value={idOportunidad ?? undefined}
              onChange={(v: number) => {
                setIdOportunidad(v)
                setIdItem(null)
              }}
              options={lista.map((o) => ({
                value: o.id,
                label: `#${o.id} — ${o.empresa.razon_social}`,
              }))}
            />
            {/* D24 (no negociable): con un solo ítem, nunca se ve un selector. */}
            {requiereSelectorItem && seleccionada && (
              <Select
                aria-label="Ítem a enlazar"
                placeholder="Elegí el ítem"
                style={{ width: '100%' }}
                value={idItem ?? undefined}
                onChange={setIdItem}
                options={seleccionada.items.map((it) => ({
                  value: it.id,
                  label: `${it.modelo.codigo} × ${it.cantidad}`,
                }))}
              />
            )}
            <Space>
              <Button onClick={() => setBuscandoOportunidad(false)}>Volver</Button>
              <Button
                type="primary"
                disabled={idItemResuelto === null}
                loading={crear.isPending}
                onClick={() => void handleEnlazarYGuardar()}
              >
                Enlazar y guardar
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </>
  )
}
