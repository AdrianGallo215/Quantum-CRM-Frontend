import type { ContactoEmpresaRef } from '@/types'

/** "Empresa X" si hay una sola, "Empresa X +n" si hay 2 o más, "—" si no hay ninguna */
export function resumenEmpresas(empresas: ContactoEmpresaRef[] | undefined): string {
  const primera = empresas?.[0]
  if (!primera) return '—'
  if (empresas.length === 1) return primera.razon_social
  return `${primera.razon_social} +${empresas.length - 1}`
}
