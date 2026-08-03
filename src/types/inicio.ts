import type { TipoAccion } from './enums'

export interface InicioTarea {
  id: number
  descripcion: string
  tipo_accion: TipoAccion
  fecha_ejecucion: string
  esta_vencida: boolean
  es_hoy: boolean
  empresa: { id: number; razon_social: string }
  id_oportunidad: number | null
  contacto: { id: number; nombres: string; apellidos: string } | null
}

export interface InicioEvento {
  id: number
  nombre: string
  fecha_seguimiento: string
  seguimiento_vencido: boolean
  dispara_cambio_estado: boolean
  empresa: { id: number; razon_social: string }
  id_oportunidad: number | null
}

export interface ResumenPipelineEtapa {
  count: number
  valor: string
  cantidad_unidades: number
}

export interface InicioData {
  tareas_pendientes: InicioTarea[]
  eventos_por_seguir: InicioEvento[]
  resumen_pipeline: {
    valor_total: string
    oportunidades_activas: number
    cantidad_unidades: number
    por_etapa: Record<string, ResumenPipelineEtapa>
  }
  resumen_prospeccion: {
    total: number
    listas_para_convertir: number
    requieren_atencion: number
  }
  /** null para cualquier rol que no sea vendedor/jdv — no renderizar el bloque en ese caso. */
  meta_ventas: InicioMetaVentas | null
}

export interface MetaPeriodo {
  tiene_meta: boolean
  unidades_meta: number | null
  unidades_logradas: number
  porcentaje: number | null
}

export interface MetaVentasResumen {
  mensual: MetaPeriodo
  anual: MetaPeriodo
}

export interface InicioMetaVentas extends MetaVentasResumen {
  /** Solo poblado para rol jdv (agregado del equipo). null para vendedor. */
  equipo: MetaVentasResumen | null
}
