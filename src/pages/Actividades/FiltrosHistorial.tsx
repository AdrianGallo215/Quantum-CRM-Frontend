import { DatePicker, Segmented } from 'antd'
import type { Dayjs } from 'dayjs'
import type { EmpleadoResumen, TipoActividad } from '@/types'
import { EmpleadoSelect } from '@/components/EmpleadoSelect'

const { RangePicker } = DatePicker

/** El valor del Segmented: 'todas' es el "sin filtro", no un tipo del backend. */
type OpcionTipo = 'todas' | TipoActividad

interface Props {
  /** Solo admin/gerencia/jdv ven el selector de empleado (D4, informe §7). */
  esSupervisor: boolean
  empleados: EmpleadoResumen[]
  cargandoEmpleados: boolean
  errorEmpleados: boolean
  idEmpleado: number
  onIdEmpleado: (id: number) => void
  rango: [Dayjs, Dayjs] | null
  onRango: (rango: [Dayjs, Dayjs] | null) => void
  tipo: TipoActividad | undefined
  onTipo: (tipo: TipoActividad | undefined) => void
}

/**
 * Barra de filtros del historial.
 *
 * ⚠ La etiqueta del rango dice "Creadas entre" a propósito: `desde`/`hasta`
 * filtran por `created_at` (cuándo se registró la actividad), NO por la fecha
 * planificada (informe §3, NOTE). Llamarlo "Fecha" haría que un supervisor
 * interprete mal todos los resultados.
 */
export function FiltrosHistorial({
  esSupervisor,
  empleados,
  cargandoEmpleados,
  errorEmpleados,
  idEmpleado,
  onIdEmpleado,
  rango,
  onRango,
  tipo,
  onTipo,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      {esSupervisor && (
        <label className="flex flex-col gap-1 min-w-[240px]">
          <span className="text-label-md text-on-surface-variant uppercase">Empleado</span>
          <EmpleadoSelect
            empleados={empleados}
            value={idEmpleado > 0 ? idEmpleado : undefined}
            onChange={(v) => v !== undefined && onIdEmpleado(v)}
            cargando={cargandoEmpleados}
            error={errorEmpleados}
            placeholder="Selecciona un empleado"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-label-md text-on-surface-variant uppercase">Creadas entre</span>
        <RangePicker
          format="DD/MM/YYYY"
          value={rango}
          onChange={(valores) => {
            const desde = valores?.[0]
            const hasta = valores?.[1]
            onRango(desde && hasta ? [desde, hasta] : null)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-md text-on-surface-variant uppercase">Tipo</span>
        <Segmented<OpcionTipo>
          value={tipo ?? 'todas'}
          onChange={(valor) => onTipo(valor === 'todas' ? undefined : (valor as TipoActividad))}
          options={[
            { label: 'Todas', value: 'todas' },
            { label: 'Tareas', value: 'tarea' },
            { label: 'Eventos', value: 'evento' },
          ]}
        />
      </label>
    </div>
  )
}
