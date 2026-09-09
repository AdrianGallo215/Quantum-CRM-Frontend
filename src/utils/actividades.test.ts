import { describe, expect, it } from 'vitest'
import { formatoFechaHora } from './formato'
import {
  etiquetaCampoAuditado,
  fechaDisplayActividad,
  formatoFechaDia,
  valorAuditadoDisplay,
} from './actividades'

describe('formatoFechaDia', () => {
  it('no retrocede un día al formatear una fecha calendario', () => {
    // informe §13.2 (CAUTION): `new Date('2026-09-15')` es medianoche UTC; en
    // Lima (UTC-5) eso cae el 14. Esta función NO puede pasar por `Date`.
    expect(formatoFechaDia('2026-09-15')).toContain('15')
    expect(formatoFechaDia('2026-09-15')).not.toContain('14')
  })

  it('devuelve un guion cuando no hay fecha', () => {
    expect(formatoFechaDia(null)).toBe('—')
  })

  it('devuelve el string tal cual si no tiene la forma YYYY-MM-DD', () => {
    expect(formatoFechaDia('no-es-fecha')).toBe('no-es-fecha')
  })
})

describe('fechaDisplayActividad', () => {
  it('prefiere fecha_hora cuando existe', () => {
    const texto = fechaDisplayActividad({
      fecha_hora: '2026-09-10T15:00:00Z',
      fecha_dia: '2026-09-15',
    })
    expect(texto).toBe(formatoFechaHora('2026-09-10T15:00:00Z'))
  })

  it('cae a fecha_dia cuando fecha_hora es null (evento no ocurrido)', () => {
    expect(fechaDisplayActividad({ fecha_hora: null, fecha_dia: '2026-09-15' })).toBe(
      formatoFechaDia('2026-09-15'),
    )
  })

  it('dice "Sin fecha" cuando las dos son null', () => {
    expect(fechaDisplayActividad({ fecha_hora: null, fecha_dia: null })).toBe('Sin fecha')
  })
})

describe('etiquetaCampoAuditado', () => {
  it('traduce los campos que el backend audita hoy', () => {
    // informe §6: tareas → tipo_accion, descripcion, fecha_ejecucion,
    // id_contacto, id_asignado. Eventos → fecha_estimada, fecha_seguimiento,
    // descripcion.
    expect(etiquetaCampoAuditado('fecha_ejecucion')).toBe('Fecha de ejecución')
    expect(etiquetaCampoAuditado('id_asignado')).toBe('Responsable')
  })

  it('no se rompe con un campo que el backend empiece a auditar mañana', () => {
    expect(etiquetaCampoAuditado('campo_nuevo_del_backend')).toBe('campo nuevo del backend')
  })
})

describe('valorAuditadoDisplay', () => {
  it('muestra "(vacío)" cuando el campo no tenía valor', () => {
    expect(valorAuditadoDisplay('descripcion', null)).toBe('(vacío)')
  })

  it('etiqueta los IDs como ID, porque el backend no manda el nombre', () => {
    expect(valorAuditadoDisplay('id_asignado', '12')).toBe('ID 12')
  })

  it('formatea fecha_estimada sin desfase de zona horaria', () => {
    expect(valorAuditadoDisplay('fecha_estimada', '2026-09-15')).toBe(formatoFechaDia('2026-09-15'))
  })

  it('devuelve el texto tal cual para campos de texto libre', () => {
    expect(valorAuditadoDisplay('descripcion', 'Llamar hoy')).toBe('Llamar hoy')
  })
})
