import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const monedaFmt = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numeroFmt = new Intl.NumberFormat('es-PE')

/** Formatea un monto que la API envía como string ("45000.00") → "$ 45,000.00" */
export function formatoMonto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (Number.isNaN(n)) return '—'
  return monedaFmt.format(n)
}

export function formatoNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—'
  return numeroFmt.format(valor)
}

export function formatoPorcentaje(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)}%`
}

export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return dayjs(fecha).format('DD MMM YYYY')
}

export function formatoFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return dayjs(fecha).format('DD MMM YYYY · HH:mm')
}

export function formatoTiempoRelativo(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return dayjs(fecha).fromNow()
}

export function iniciales(nombres?: string | null, apellidos?: string | null): string {
  const a = (nombres ?? '').trim().charAt(0)
  const b = (apellidos ?? '').trim().charAt(0)
  return `${a}${b}`.toUpperCase() || '?'
}

export function nombreCompleto(persona?: { nombres: string; apellidos: string } | null): string {
  if (!persona) return '—'
  return `${persona.nombres} ${persona.apellidos}`.trim()
}

/** Formatea bytes a una unidad legible: 900 → "900 B", 284512 → "277.8 KB", 5242880 → "5.0 MB" */
export function formatoTamanoArchivo(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
