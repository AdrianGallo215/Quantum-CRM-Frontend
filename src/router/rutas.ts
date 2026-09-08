/**
 * Rutas que se referencian desde más de un módulo. Tenerlas como literal suelto
 * hacía que renombrar una en el router dejara a los guards comparando contra un
 * path inexistente, sin que fallara ni el build ni ningún tipo.
 */
export const RUTA_LOGIN = '/login'
export const RUTA_CAMBIO_CONTRASENA = '/cambiar-contrasena'
export const RUTA_INICIO = '/'
// Referenciadas desde `router/index.tsx` y `components/navItems.ts` (Plan 05,
// T2.2, D31): el vendedor no ve `/simulaciones` en la navegación pero sí
// `/calculadora` — que las dos vivan acá evita que un renombre en una se
// olvide en la otra.
export const RUTA_SIMULACIONES = '/simulaciones'
export const RUTA_CALCULADORA = '/calculadora'
