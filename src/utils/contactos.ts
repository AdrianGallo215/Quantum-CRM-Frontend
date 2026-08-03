import type { ContactoEmpresaRef } from '@/types'

/** "Empresa X" si hay una sola, "Empresa X +n" si hay 2 o más, "—" si no hay ninguna */
export function resumenEmpresas(empresas: ContactoEmpresaRef[] | undefined): string {
  if (!empresas || empresas.length === 0) return '—'
  if (empresas.length === 1) return empresas[0].razon_social
  return `${empresas[0].razon_social} +${empresas.length - 1}`
}
