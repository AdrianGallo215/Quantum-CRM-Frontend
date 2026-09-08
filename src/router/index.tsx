import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { Cargando } from '@/components/Estados'
import { RequireAuth, RequireRol } from './guards'
import {
  RUTA_CALCULADORA,
  RUTA_CAMBIO_CONTRASENA,
  RUTA_INICIO,
  RUTA_LOGIN,
  RUTA_SIMULACIONES,
} from './rutas'
import {
  ROLES_ADMIN,
  ROLES_BANDEJA_GERENCIA,
  ROLES_REPORTES,
  ROLES_SOLICITANTES,
} from '@/store/authStore'
import type { Rol } from '@/types'
import { LoginPage } from '@/pages/Login/LoginPage'
import { CambiarContrasenaPage } from '@/pages/Login/CambiarContrasenaPage'
import { InicioPage } from '@/pages/Inicio/InicioPage'

/**
 * Carga diferida por ruta. Antes todo (9 pantallas + AntD completo) viajaba en
 * un único bundle que había que descargar entero para ver el login. Login,
 * cambio de contraseña e Inicio van en el bundle principal porque son lo primero
 * que ve cualquiera; el resto se descarga al navegar.
 *
 * Cada `lazy` necesita un default export, y las páginas exportan con nombre, así
 * que se remapea aquí en lugar de tocar 12 archivos.
 */
const PipelinePage = lazy(() =>
  import('@/pages/Pipeline/PipelinePage').then((m) => ({ default: m.PipelinePage })),
)
const ProspeccionPage = lazy(() =>
  import('@/pages/Prospeccion/ProspeccionPage').then((m) => ({ default: m.ProspeccionPage })),
)
const CarteraPage = lazy(() =>
  import('@/pages/Cartera/CarteraPage').then((m) => ({ default: m.CarteraPage })),
)
const EmpresaDetallePage = lazy(() =>
  import('@/pages/EmpresaDetalle/EmpresaDetallePage').then((m) => ({ default: m.EmpresaDetallePage })),
)
const OportunidadDetallePage = lazy(() =>
  import('@/pages/OportunidadDetalle/OportunidadDetallePage').then((m) => ({
    default: m.OportunidadDetallePage,
  })),
)
const ContactosPage = lazy(() =>
  import('@/pages/Contactos/ContactosPage').then((m) => ({ default: m.ContactosPage })),
)
const ContactoDetallePage = lazy(() =>
  import('@/pages/Contactos/ContactoDetallePage').then((m) => ({ default: m.ContactoDetallePage })),
)
const ReportesPage = lazy(() =>
  import('@/pages/Reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })),
)
const ActividadesPage = lazy(() =>
  import('@/pages/Actividades/ActividadesPage').then((m) => ({ default: m.ActividadesPage })),
)
const AdminPage = lazy(() => import('@/pages/Admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const GerenciaPage = lazy(() =>
  import('@/pages/Gerencia/GerenciaPage').then((m) => ({ default: m.GerenciaPage })),
)
const SolicitudesPage = lazy(() =>
  import('@/pages/Solicitudes/SolicitudesPage').then((m) => ({ default: m.SolicitudesPage })),
)
const EnConstruccionPage = lazy(() =>
  import('@/pages/EnConstruccion/EnConstruccionPage').then((m) => ({ default: m.EnConstruccionPage })),
)

/**
 * Roles del módulo de Simulaciones y de la Calculadora (matriz_permisos.md
 * §2.15). Se rearman acá en vez de importarse de `simulacionPermisos.ts` a
 * propósito: ese módulo expone predicados por `Empleado` (`puedeVer...`,
 * `puedeUsar...`), no arrays de `Rol` — que es lo que pide `RequireRol` — y
 * sus constantes están deliberadamente sin exportar (comentario en el propio
 * archivo) para que nadie las confunda con `ROLES_APOYO`/`ROLES_SUPERVISION`
 * de `authStore`. `RequireRol` es un guard de UX (`CLAUDE.md` regla 8), igual
 * que las funciones que filtran `navItems.ts` — la fuente de verdad real es
 * el backend.
 */
const ROLES_MODULO_SIMULACIONES: Rol[] = ['admin', 'gerencia', 'analista']
const ROLES_CALCULADORA: Rol[] = ['admin', 'gerencia', 'analista', 'vendedor']

export function AppRouter() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path={RUTA_LOGIN} element={<LoginPage />} />
        <Route path={RUTA_CAMBIO_CONTRASENA} element={<CambiarContrasenaPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<InicioPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/prospeccion" element={<ProspeccionPage />} />
          <Route path="/cartera" element={<CarteraPage />} />
          <Route path="/actividades" element={<ActividadesPage />} />
          <Route path="/empresas/:id" element={<EmpresaDetallePage />} />
          <Route path="/oportunidades/:id" element={<OportunidadDetallePage />} />
          <Route path="/contactos" element={<ContactosPage />} />
          <Route path="/contactos/:id" element={<ContactoDetallePage />} />
          <Route
            path="/reportes"
            element={
              <RequireRol roles={ROLES_REPORTES}>
                <ReportesPage />
              </RequireRol>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireRol roles={ROLES_ADMIN}>
                <AdminPage />
              </RequireRol>
            }
          />
          <Route
            path="/gerencia"
            element={
              <RequireRol roles={ROLES_BANDEJA_GERENCIA}>
                <GerenciaPage />
              </RequireRol>
            }
          />
          <Route
            path="/solicitudes"
            element={
              <RequireRol roles={ROLES_SOLICITANTES}>
                <SolicitudesPage />
              </RequireRol>
            }
          />
          {/*
            Plan 05, T2.2 (resolución H0): SimulacionesPage, SimulacionDetallePage
            y CalculadoraPage (T3.1/T5.1) están bloqueadas por el hito de diseño
            pendiente. Las tres rutas ya quedan cableadas contra el mismo
            placeholder — cuando esas páginas existan, se reemplaza únicamente
            el `lazy(() => import(...))` de cada una.
          */}
          <Route
            path={RUTA_SIMULACIONES}
            element={
              <RequireRol roles={ROLES_MODULO_SIMULACIONES}>
                <EnConstruccionPage titulo="Módulo Simulaciones" />
              </RequireRol>
            }
          />
          <Route
            path={`${RUTA_SIMULACIONES}/:id`}
            element={
              <RequireRol roles={ROLES_MODULO_SIMULACIONES}>
                <EnConstruccionPage titulo="Detalle de Simulación" />
              </RequireRol>
            }
          />
          <Route
            path={RUTA_CALCULADORA}
            element={
              <RequireRol roles={ROLES_CALCULADORA}>
                <EnConstruccionPage titulo="Calculadora Financiera" />
              </RequireRol>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={RUTA_INICIO} replace />} />
      </Routes>
    </Suspense>
  )
}
