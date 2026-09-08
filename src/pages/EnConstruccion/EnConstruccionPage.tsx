import { Result } from 'antd'

interface Props {
  /** Nombre de la sección que todavía no tiene vista, p.ej. "Módulo Simulaciones". */
  titulo: string
}

/**
 * Placeholder ÚNICO y reutilizable para rutas cuya vista real está bloqueada
 * por un hito de diseño pendiente (Plan 05, H0: propuestas de Stitch
 * aprobadas). Sigue el mismo patrón visual que `SinAcceso`
 * (`src/router/guards.tsx`) — un `<Result>` de antd — pero con `status="info"`
 * en vez de `"403"`: acá no es un problema de permisos, es que la pantalla
 * todavía no existe.
 *
 * Se monta hoy en `/simulaciones`, `/simulaciones/:id` y `/calculadora`
 * (Plan 05, T2.2, resolución de H0). Cuando T3.1/T5.1 construyan las páginas
 * reales, el `lazy(() => import(...))` de esas rutas en `router/index.tsx` se
 * reemplaza por la página real — nada más cambia acá.
 */
export function EnConstruccionPage({ titulo }: Props) {
  return (
    <Result
      status="info"
      title={titulo}
      subTitle="Esta sección está en construcción."
    />
  )
}
