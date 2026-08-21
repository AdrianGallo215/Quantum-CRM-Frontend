/**
 * Rutas que se referencian desde más de un módulo. Tenerlas como literal suelto
 * hacía que renombrar una en el router dejara a los guards comparando contra un
 * path inexistente, sin que fallara ni el build ni ningún tipo.
 */
export const RUTA_LOGIN = '/login'
export const RUTA_CAMBIO_CONTRASENA = '/cambiar-contrasena'
export const RUTA_INICIO = '/'
