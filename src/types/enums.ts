/**
 * `rol_empleado` del contrato §23 (verificado contra el schema de producción).
 * `otro` existe en el enum del backend aunque la UI no lo asigne: un empleado
 * puede llegar con ese rol y toda la app debe saber representarlo.
 */
export type Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista' | 'otro'

export type EstadoCartera =
  | 'no_contactado'
  | 'no_aplica'
  | 'no_interesado'
  | 'prospeccion'
  | 'oportunidad_activa'
  | 'cliente'

export type EstadoOportunidad =
  | 'evaluacion_calidda'
  | 'documentos_legales'
  | 'facturado'
  | 'cerrado'

export type EstadoEvento = 'pendiente' | 'ocurrido' | 'descartado'

export type EstadoAccion = 'pendiente' | 'completada' | 'cancelada'

/** `tipo_accion_enum` del contrato §23. Es `correo`, NO `email`. */
export type TipoAccion = 'llamada' | 'reunion' | 'correo' | 'whatsapp' | 'otro'

export type OrigenLead = 'cartera' | 'visita_fria' | 'referido_calidda' | 'red_contactos' | 'otro'

export type Segmento = 'urbano' | 'interprovincial' | 'turismo' | 'personal' | 'otro'

/**
 * `aplicacion_enum` del contrato §23 — las aplicaciones de un `Modelo`.
 * OJO: se parece a `Segmento` pero NO admite `otro`. Son enums distintos.
 */
export type Aplicacion = 'urbano' | 'interprovincial' | 'turismo' | 'personal'

/** Estados de cartera que se pueden asignar manualmente (PATCH estado-cartera) */
export const ESTADOS_CARTERA_MANUALES: EstadoCartera[] = [
  'no_contactado',
  'no_aplica',
  'no_interesado',
  'prospeccion',
]

/** Etapas positivas del pipeline, en orden (sin 'cerrado') */
export const ETAPAS_PIPELINE: EstadoOportunidad[] = [
  'evaluacion_calidda',
  'documentos_legales',
  'facturado',
]

/**
 * Segmentos de negocio de una empresa, en el orden en que se muestran.
 *
 * Fuente única para todos los selects de segmento. Antes vivía duplicada como
 * `string[]` en NuevaEmpresaModal y EmpresaDetallePage, sin ninguna relación de
 * tipos con el enum `Segmento`: añadir un segmento al enum no rompía nada y las
 * copias se quedaban atrás en silencio.
 */
export const SEGMENTOS: Segmento[] = [
  'urbano',
  'interprovincial',
  'turismo',
  'personal',
  'otro',
]

/**
 * Aplicaciones de un modelo, en el orden en que se muestran. Fuente única para
 * el select de AdminModelos, que antes tenía una copia `string[]` con un valor
 * de más (`otro`) que el backend rechazaba con 400.
 */
export const APLICACIONES: Aplicacion[] = [
  'urbano',
  'interprovincial',
  'turismo',
  'personal',
]
