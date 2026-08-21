import { Select } from 'antd'
import type { EmpleadoResumen } from '@/types'
import { nombreCompleto } from '@/utils/formato'

function opciones(empleados: EmpleadoResumen[]) {
  return empleados.map((e) => ({ value: e.id, label: nombreCompleto(e) }))
}

interface EmpleadoSelectProps {
  empleados: EmpleadoResumen[]
  value?: number
  onChange?: (value: number | undefined) => void
  autoFocus?: boolean
  allowClear?: boolean
  placeholder?: string
  cargando?: boolean
  error?: boolean
}

/** Select de un solo empleado (para "Responsable"/`id_asignado`). */
export function EmpleadoSelect({
  empleados,
  value,
  onChange,
  autoFocus,
  allowClear,
  placeholder,
  cargando,
  error,
}: EmpleadoSelectProps) {
  return (
    <Select
      autoFocus={autoFocus}
      allowClear={allowClear}
      placeholder={placeholder}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      value={value}
      onChange={onChange}
      options={opciones(empleados)}
      loading={cargando}
      status={error ? 'error' : undefined}
      notFoundContent={
        error ? 'No se pudieron cargar los empleados' : cargando ? 'Cargando…' : undefined
      }
    />
  )
}

interface EmpleadoMultiSelectProps {
  empleados: EmpleadoResumen[]
  value?: number[]
  onChange?: (value: number[]) => void
  autoFocus?: boolean
  placeholder?: string
  cargando?: boolean
  error?: boolean
}

/** Select de varios empleados (para "Colaboradores"/`ids_colaboradores`). */
export function EmpleadoMultiSelect({
  empleados,
  value,
  onChange,
  autoFocus,
  placeholder,
  cargando,
  error,
}: EmpleadoMultiSelectProps) {
  return (
    <Select
      mode="multiple"
      autoFocus={autoFocus}
      placeholder={placeholder}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      value={value}
      onChange={onChange}
      options={opciones(empleados)}
      loading={cargando}
      status={error ? 'error' : undefined}
      notFoundContent={
        error ? 'No se pudieron cargar los empleados' : cargando ? 'Cargando…' : undefined
      }
    />
  )
}
