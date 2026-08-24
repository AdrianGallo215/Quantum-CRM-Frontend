/**
 * Los dos cotizadores externos que el CRM enlaza. Viven fuera de este repo y
 * cada uno tiene **sesión propia**: abrirlos no arrastra la sesión del CRM.
 *
 * Las URLs por defecto son los servidores actuales, así que los enlaces
 * funcionan sin configurar nada. Las `VITE_COTIZADOR_*` solo sirven para
 * apuntar a otro servidor sin recompilar.
 *
 * ⚠️ El default de Investment va por `http://` (ese servidor no expone TLS
 * hoy). Cuando el CRM se sirve por HTTPS, el navegador marca esa navegación
 * como insegura. Leasing sí va por `https://`. Ver el hallazgo M-2 de
 * `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`: en cuanto Investment tenga
 * certificado, basta con cambiar la constante de abajo o definir la variable
 * de entorno con https://.
 */

/** Un cotizador externo enlazable desde el FAB. */
export interface Cotizador {
  /** Identificador estable: `key` de React y punto de anclaje de los tests. */
  id: 'investment' | 'leasing'
  /** Etiqueta visible en la píldora del speed-dial. */
  nombre: string
  url: string
  /** Nombre del ícono Material Symbols Outlined. */
  icono: string
}

/** Subconjunto de `import.meta.env` que necesita `construirCotizadores`. */
export interface EnvCotizadores {
  readonly VITE_COTIZADOR_URL?: string
  readonly VITE_COTIZADOR_LEASING_URL?: string
}

const URL_INVESTMENT_POR_DEFECTO = 'http://quantum.okserver43.com/app/modulos/cotizacion/'
const URL_LEASING_POR_DEFECTO = 'https://quantumleasing.okserver51.com/app/modulos/cotizacion/'

/**
 * Resuelve una URL configurada. Docker y GitHub Actions pasan la variable
 * siempre: cuando no está configurada llega como cadena vacía, no como
 * `undefined`. Por eso el `trim()` antes del `||`.
 */
function resolverUrl(configurada: string | undefined, porDefecto: string): string {
  return configurada?.trim() || porDefecto
}

/**
 * Pura a propósito: recibe el entorno en vez de leer `import.meta.env`
 * directamente, para poder probar la resolución de URLs sin manipular el
 * entorno global del proceso de test.
 */
export function construirCotizadores(env: EnvCotizadores): Cotizador[] {
  return [
    {
      id: 'investment',
      nombre: 'Quantum Investment',
      url: resolverUrl(env.VITE_COTIZADOR_URL, URL_INVESTMENT_POR_DEFECTO),
      icono: 'corporate_fare',
    },
    {
      id: 'leasing',
      nombre: 'Quantum Leasing',
      url: resolverUrl(env.VITE_COTIZADOR_LEASING_URL, URL_LEASING_POR_DEFECTO),
      icono: 'directions_bus',
    },
  ]
}

/**
 * Acceso por id sin `undefined`. Con `noUncheckedIndexedAccess`, indexar el
 * array devuelve `Cotizador | undefined` y ese `undefined` acabaría en un
 * `window.open(undefined)`. Aquí falla ruidosamente y en el sitio correcto.
 */
export function buscarCotizador(cotizadores: Cotizador[], id: Cotizador['id']): Cotizador {
  const encontrado = cotizadores.find((cotizador) => cotizador.id === id)
  if (!encontrado) throw new Error(`No existe ningún cotizador con id "${id}"`)
  return encontrado
}

/** Catálogo real de la app, resuelto contra el entorno de build. */
export const COTIZADORES: Cotizador[] = construirCotizadores(import.meta.env)

/**
 * Dónde tiene sentido cotizar: el tablero de oportunidades y el detalle de
 * una oportunidad concreta. El listado `/oportunidades` queda fuera a
 * propósito — sin una oportunidad delante no hay nada que cotizar.
 */
export function enRutaCotizable(pathname: string): boolean {
  return pathname === '/pipeline' || pathname.startsWith('/oportunidades/')
}
