import type { ModoSimulacion, TipoEventoSimulacion } from './enums'
import type { Modelo } from './catalogos'

export interface Simulacion {
  id: number
  /** Real o autogenerado al leer. El autogenerado nunca se persiste (reglas §8.1). */
  nombre: string
  /**
   * `false` cuando `nombre` salió autogenerado. Un nombre manual es PEGAJOSO: no se
   * regenera nunca, ni al editar parámetros ni al enlazar a un ítem (reglas §8.1).
   * Úsalo para decidir si mostrar el nombre como placeholder editable o como valor.
   */
  nombre_es_manual: boolean
  /** INMUTABLE tras la creación. Un PATCH que lo cambie responde 409 MODO_INMUTABLE. */
  modo: ModoSimulacion
  id_oportunidad_item: number | null
  /** Derivado del ítem por el backend, para agrupar sin resolverlo en el cliente. */
  id_oportunidad: number | null
  id_modelo: number | null
  modelo: Pick<Modelo, 'id' | 'codigo'> | null
  id_simulacion_origen: number | null
  precio_venta: string
  descuento: string
  cuota_inicial: string
  plazo_meses: number
  /** Escala 1-100 (14.00 = 14%). NO es la escala fraccionaria de `financiadoras` (§7.6). */
  tea: string
  valor_residual: string
  dias_trabajados: number
  comision_estructuracion: string
  /**
   * SOLO LECTURA. El backend la recalcula server-side al crear, actualizar, restaurar
   * y bifurcar. NUNCA enviarla en un body — se ignora (reglas §4).
   */
  cuota_final: string
  /** Sin ítem es siempre `false` (CHECK del backend). */
  es_principal: boolean
  created_at: string
  updated_at: string
  /**
   * Fecha de purga prevista: `created_at + 30 días` mientras no esté enlazada.
   * `null` en cuanto se enlaza — enlazarla la salva de forma DEFINITIVA (reglas §5).
   * Debe ser visible en la UI, no solo lógica de servidor.
   */
  eliminacion_prevista_el: string | null
}

/**
 * Una fila del cronograma. El MES 0 es la fila de la cuota inicial: `interes`,
 * `igv`, `cuota` y `cuota_con_igv` vienen `null` y se renderizan EN BLANCO, no
 * como "0.00" (encargo §5.4).
 * `igv` es `null` en TODAS las filas cuando `modo = 'leasing'`: ese modo no
 * desglosa IGV y su tabla no lleva esa columna (reglas §3.3).
 */
export interface FilaCronograma {
  mes: number
  saldo_inicial: string
  amortizacion: string
  interes: string | null
  igv: string | null
  saldo_final: string
  cuota: string | null
  cuota_con_igv: string | null
}

export interface Cronograma {
  cuota_final: string
  cuota_financiera: string
  valor_venta: string
  igv: string
  principal: string
  /** NUNCA redondeada, a propósito. No la trates como un monto de 2 decimales (§3.1). */
  tasa_nominal_mensual: string
  filas: FilaCronograma[]
}

export interface CambioDiff {
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
}

export interface EventoHistorial {
  id_evento_log: number
  tipo_evento: TipoEventoSimulacion
  created_at: string
  /** `null` cuando lo generó un job automático. Mostrar "Sistema", no "undefined". */
  created_by: number | null
  /**
   * VACÍO ES LEGÍTIMO Y FRECUENTE: primer evento de la simulación, o una escritura
   * que no tocó parámetros de cálculo. Mostrar "sin cambios de parámetros", nunca
   * como error ni como fila rota (encargo §5.5).
   */
  diff: CambioDiff[]
}

/** `POST /simulaciones`. Solo modo, precio_venta, cuota_inicial, plazo_meses y tea
 *  son obligatorios; el resto lo rellena el backend con los defaults de reglas §6.1. */
export interface CrearSimulacionInput {
  modo: ModoSimulacion
  precio_venta: string
  cuota_inicial: string
  plazo_meses: number
  tea: string
  nombre?: string | null
  id_oportunidad_item?: number | null
  id_modelo?: number | null
  descuento?: string
  valor_residual?: string
  dias_trabajados?: number
  comision_estructuracion?: string
}

/**
 * `PATCH /simulaciones/:id`. Todos opcionales.
 * OJO: con todos los campos nullable, "ausente" y "null explícito" son
 * indistinguibles — este PATCH permite ENLAZAR a un ítem pero NO DESENLAZAR (§23).
 * `modo` NO se incluye: es inmutable. Para cambiarlo, `bifurcar`.
 */
export type ActualizarSimulacionInput = Partial<Omit<CrearSimulacionInput, 'modo'>>

/** `POST /simulaciones/:id/bifurcar`. Igual que el PATCH pero SÍ acepta `modo`.
 *  `nombre` nunca se hereda del origen: si no viene, la nueva autogenera el suyo. */
export type BifurcarSimulacionInput = Partial<CrearSimulacionInput>

export interface SimulacionesFiltros {
  id_oportunidad_item?: number
  id_modelo?: number
  modo?: ModoSimulacion
  page?: number
  per_page?: number
  sort?: 'created_at' | 'id' | 'cuota_final' | 'updated_at'
  dir?: 'asc' | 'desc'
}
