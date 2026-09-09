import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { useAuthStore } from '@/store/authStore'
import type { Actividad, Empleado, Rol } from '@/types'
import { HistorialActividadesPage } from './HistorialActividadesPage'

function empleadoCon(rol: Rol): Empleado {
  return {
    id: 7,
    nombres: 'Juan',
    apellidos: 'Pérez',
    email: 'juan@quantum.pe',
    rol,
    area: 'Ventas',
    puesto: 'Vendedor',
    activo: true,
  }
}

function actividadTarea(): Actividad {
  return {
    tipo: 'tarea',
    id: 42,
    titulo: 'llamada',
    descripcion: 'Llamar al contacto',
    estado: 'pendiente',
    fecha_hora: '2026-09-10T15:00:00Z',
    fecha_dia: null,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'ACME SAC', distrito: 'Miraflores' },
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 3,
    created_at: '2026-09-01T10:00:00Z',
  }
}

/** El evento 42: mismo ID que la tarea, secuencias independientes (D10). */
function actividadEvento(): Actividad {
  return {
    tipo: 'evento',
    id: 42,
    titulo: 'Visita a planta',
    descripcion: null,
    estado: 'pendiente',
    fecha_hora: null,
    fecha_dia: '2026-09-15',
    id_empresa: null,
    empresa: null,
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 0,
    created_at: '2026-09-02T14:30:00Z',
  }
}

function handlerHistorial(datos: Actividad[], total = datos.length) {
  return http.get(`${BASE_API}/actividades`, () =>
    HttpResponse.json({
      data: datos,
      meta: { page: 1, per_page: 20, total, total_pages: Math.max(1, Math.ceil(total / 20)) },
      error: null,
    }),
  )
}

const handlerEmpleados = http.get(`${BASE_API}/empleados`, () =>
  HttpResponse.json({ data: [empleadoCon('vendedor')], meta: null, error: null }),
)

describe('HistorialActividadesPage', () => {
  afterEach(() => useAuthStore.setState({ empleado: null, cargando: false }))

  describe('como vendedor', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('no muestra el selector de empleado', async () => {
      // informe §7: un no-supervisor solo puede ver su propio historial. Ofrecer
      // el selector solo consigue que se coma un 403.
      servidorMock.use(handlerHistorial([actividadTarea()]))
      renderConProviders(<HistorialActividadesPage />)
      await screen.findByText('ACME SAC')
      expect(screen.queryByText(/^Empleado$/i)).not.toBeInTheDocument()
    })

    it('pide el historial con su propio id_empleado', async () => {
      let urlVista = ''
      servidorMock.use(
        http.get(`${BASE_API}/actividades`, ({ request }) => {
          urlVista = request.url
          return HttpResponse.json({
            data: [actividadTarea()],
            meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
            error: null,
          })
        }),
      )
      renderConProviders(<HistorialActividadesPage />)
      await screen.findByText('ACME SAC')
      expect(urlVista).toContain('id_empleado=7')
    })
  })

  describe('como gerencia', () => {
    beforeEach(() => useAuthStore.setState({ empleado: { ...empleadoCon('gerencia'), id: 1 }, cargando: false }))

    it('muestra el selector de empleado', async () => {
      servidorMock.use(handlerHistorial([actividadTarea()]), handlerEmpleados)
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/^Empleado$/i)).toBeInTheDocument()
    })
  })

  describe('render de filas', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('muestra una tarea y un evento con el mismo ID sin colapsarlos', async () => {
      // D10: los IDs de tareas y eventos son secuencias independientes. Con
      // rowKey="id" React descarta una de las dos filas.
      servidorMock.use(handlerHistorial([actividadTarea(), actividadEvento()]))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText('llamada')).toBeInTheDocument()
      expect(screen.getByText('Visita a planta')).toBeInTheDocument()
    })

    it('muestra la fecha del evento sin retroceder un día', async () => {
      servidorMock.use(handlerHistorial([actividadEvento()]))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/15 sep 2026/)).toBeInTheDocument()
    })

    it('muestra el estado vacío cuando no hay actividades', async () => {
      servidorMock.use(handlerHistorial([], 0))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/sin actividades/i)).toBeInTheDocument()
    })
  })

  describe('errores', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('ante un 403 explica que hace falta ser supervisor', async () => {
      servidorMock.use(
        http.get(`${BASE_API}/actividades`, () =>
          HttpResponse.json(
            { data: null, meta: null, error: { code: 'PERMISO_INSUFICIENTE', message: 'Sin permiso' } },
            { status: 403 },
          ),
        ),
      )
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/historial de otro empleado/i)).toBeInTheDocument()
    })
  })

  describe('detalle', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('al hacer clic en una fila abre la ficha con sus comentarios', async () => {
      servidorMock.use(
        handlerHistorial([actividadTarea()]),
        http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
          HttpResponse.json({ data: [], meta: null, error: null }),
        ),
        http.get(`${BASE_API}/actividades/tarea/42/auditoria`, () =>
          HttpResponse.json({ data: [], meta: null, error: null }),
        ),
      )
      renderConProviders(<HistorialActividadesPage />)
      await userEvent.click(await screen.findByText('llamada'))
      await waitFor(() => expect(screen.getByLabelText(/nuevo comentario/i)).toBeInTheDocument())
    })
  })
})
