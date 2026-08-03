export interface ReporteFiltros {
  fecha_desde?: string
  fecha_hasta?: string
  id_vendedor?: number
}

export interface ReporteVentas {
  monto_total: string
  unidades_total: number
  operaciones_count: number
  ticket_promedio: string
  dcto_promedio: string
  por_mes: { mes: string; monto: string; unidades: number; operaciones: number }[]
  por_vendedor: { id_vendedor: number; nombre: string; monto: string; unidades: number }[]
  por_modelo: { modelo: string; unidades: number; monto: string }[]
}

export interface ReportePipeline {
  por_etapa: {
    etapa: string
    count: number
    valor: string
    tiempo_promedio_dias: number
    oportunidades_sobre_promedio: number
  }[]
  total_activo: string
  concentracion_calidda_pct: string
  oportunidades_sin_actividad: {
    id: number
    empresa: string
    estado: string
    dias_sin_actividad: number
    monto_total: string
    vendedor: string
  }[]
}

export interface ReporteEquipoItem {
  vendedor: { id: number; nombre: string }
  oportunidades_activas: number
  valor_pipeline: string
  oportunidades_cerradas_mes: number
  valor_cerrado_mes: string
  tareas_completadas_semana: number
  tareas_vencidas: number
  dias_ultimo_registro: number
  dcto_promedio: string
  velocidad_promedio_dias: number
}

export interface ReporteVelocidadEtapa {
  etapa: string
  dias_promedio: number
  dias_mediana: number
  muestra: number
}

export interface ReporteProspeccion {
  ingresadas: number
  hito_1_completado: number
  hito_2_completado: number
  hito_3_completado: number
  convertidas_a_oportunidad: number
  tasa_conversion_pct: string
  tiempo_promedio_conversion_dias: number
  por_origen_lead: { origen: string; ingresadas: number; convertidas: number; tasa_pct: string }[]
}

export interface ReporteDescuentos {
  dcto_promedio_global: string
  por_vendedor: {
    vendedor: string
    dcto_promedio: string
    operaciones_sin_dcto: number
    operaciones_con_dcto: number
    dcto_maximo_aplicado: string
  }[]
}
