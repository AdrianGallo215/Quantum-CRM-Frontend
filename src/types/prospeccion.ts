export interface HitoProspeccion {
  nombre: string
  completado: boolean
  fecha: string | null
}

export interface ProspeccionItem {
  id_empresa: number
  ruc: string
  razon_social: string
  corta: string | null
  distrito: string | null
  segmentos: string[]
  contacto_principal: {
    id: number
    nombres: string
    apellidos: string
    tlf_1: string | null
  } | null
  checkpoints_completados: number
  checkpoints_total: number
  hitos: HitoProspeccion[]
  dias_sin_actividad: number
  ultima_actividad_at: string | null
  siguiente_tarea: string | null
  lista_para_convertir: boolean
}
