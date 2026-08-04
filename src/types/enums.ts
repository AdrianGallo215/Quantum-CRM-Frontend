export type Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista'

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

export type TipoAccion = 'llamada' | 'reunion' | 'visita' | 'email' | 'whatsapp' | 'otro'

export type OrigenLead = 'cartera' | 'visita_fria' | 'referido_calidda' | 'red_contactos' | 'otro'

export type Segmento = 'urbano' | 'interprovincial' | 'turismo' | 'personal' | 'otro'

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
