import type {
  EstadoAccion,
  EstadoCartera,
  EstadoMeta,
  EstadoOportunidad,
  EstadoSolicitud,
  MesMeta,
  OrigenLead,
  RolAprobador,
  Segmento,
  TipoAccion,
  TipoSolicitud,
} from '@/types'

export const ETIQUETA_ETAPA: Record<EstadoOportunidad, string> = {
  evaluacion_calidda: 'Evaluación Calidda',
  documentos_legales: 'Documentos Legales',
  facturado: 'Facturado',
  cerrado: 'Cerrado',
}

export const ETIQUETA_CARTERA: Record<EstadoCartera, string> = {
  no_contactado: 'No contactado',
  no_aplica: 'No aplica',
  no_interesado: 'No interesado',
  prospeccion: 'Prospección',
  oportunidad_activa: 'Oportunidad activa',
  cliente: 'Cliente',
}

export const ETIQUETA_TIPO_ACCION: Record<TipoAccion, string> = {
  llamada: 'Llamada',
  reunion: 'Reunión',
  email: 'Email',
  whatsapp: 'WhatsApp',
  otro: 'Otro',
}

export const ETIQUETA_ESTADO_ACCION: Record<EstadoAccion, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  gerencia: 'Gerencia',
  jdv: 'Jefe de Ventas',
  vendedor: 'Vendedor',
  analista: 'Analista',
}

export const ETIQUETA_TIPO_SOLICITUD: Record<TipoSolicitud, string> = {
  descuento: 'Descuento',
  reasignacion_cliente: 'Reasignación de cliente',
}

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  denegada: 'Denegada',
}

export const ETIQUETA_ROL_APROBADOR: Record<RolAprobador, string> = {
  jdv: 'el Jefe de Ventas',
  gerencia: 'Gerencia',
}

export const ETIQUETA_ORIGEN_LEAD: Record<OrigenLead, string> = {
  cartera: 'Cartera',
  visita_fria: 'Visita fría',
  referido_calidda: 'Referido Calidda',
  red_contactos: 'Red de contactos',
  otro: 'Otro',
}

/**
 * `Record<Segmento, string>` a propósito: si mañana se añade un valor al enum
 * `Segmento`, TypeScript falla aquí hasta que se le dé etiqueta. Es la red que
 * el array `SEGMENTOS` no puede dar.
 */
export const ETIQUETA_SEGMENTO: Record<Segmento, string> = {
  urbano: 'Urbano',
  interprovincial: 'Interprovincial',
  turismo: 'Turismo',
  personal: 'Personal',
  otro: 'Otro',
}

export function etiquetaEtapa(etapa: string): string {
  return ETIQUETA_ETAPA[etapa as EstadoOportunidad] ?? etapa
}

export function etiquetaCartera(estado: string): string {
  return ETIQUETA_CARTERA[estado as EstadoCartera] ?? estado
}

export const ETIQUETA_ESTADO_META: Record<EstadoMeta, string> = {
  propuesta: 'Propuesta',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

export const ETIQUETA_MES: Record<MesMeta, string> = {
  meta_enero: 'Enero',
  meta_febrero: 'Febrero',
  meta_marzo: 'Marzo',
  meta_abril: 'Abril',
  meta_mayo: 'Mayo',
  meta_junio: 'Junio',
  meta_julio: 'Julio',
  meta_agosto: 'Agosto',
  meta_septiembre: 'Septiembre',
  meta_octubre: 'Octubre',
  meta_noviembre: 'Noviembre',
  meta_diciembre: 'Diciembre',
}
