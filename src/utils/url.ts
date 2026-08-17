/**
 * Esquemas de URL que se permiten renderizar en un `href`.
 *
 * Todo lo demás se descarta, en particular `javascript:`, `data:` y `vbscript:`,
 * que ejecutan código en el origen de la aplicación. React 18 NO bloquea esos
 * esquemas — solo imprime un warning en consola y renderiza el enlace igual.
 */
const ESQUEMAS_PERMITIDOS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Devuelve la URL normalizada si es segura para usar en un `href`, o `undefined`
 * si no lo es.
 *
 * Las URLs que llegan del backend las escribió un usuario del CRM (el sitio web
 * de una empresa, el enlace a una ficha). Un vendedor puede guardar
 * `javascript:fetch('/api/v1/...')` como sitio web y conseguir ejecución de
 * script en el origen del CRM para cualquiera que haga clic — incluido un admin.
 * La CSP en producción hoy bloquea esa ejecución, pero depender de un único
 * control no basta: si alguna vez se relaja, el agujero se reabre en silencio.
 *
 * Un dominio suelto sin esquema ("quantum.pe") se asume `https://`, porque es
 * como la gente escribe un sitio web en un formulario.
 *
 * @example
 * urlSegura('quantum.pe')            // 'https://quantum.pe/'
 * urlSegura('https://quantum.pe')    // 'https://quantum.pe/'
 * urlSegura('javascript:alert(1)')   // undefined
 * urlSegura('data:text/html,<b>')    // undefined
 * urlSegura(null)                    // undefined
 */
export function urlSegura(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  const limpia = url.trim()
  if (limpia === '') return undefined

  let parsed: URL
  try {
    parsed = new URL(limpia)
  } catch {
    // Sin esquema explícito. Se reintenta como https:// antes de descartarla.
    // Ojo: esto NO abre la puerta a `javascript:` — esa cadena SÍ parsea en el
    // primer intento (con protocol 'javascript:') y la corta la lista blanca.
    try {
      parsed = new URL(`https://${limpia}`)
    } catch {
      return undefined
    }
  }

  if (!ESQUEMAS_PERMITIDOS.includes(parsed.protocol)) return undefined

  return parsed.href
}
