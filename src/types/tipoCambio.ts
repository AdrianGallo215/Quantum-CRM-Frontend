/** `GET /tipo-cambio` (§22). El endpoint devuelve `data: null` con status 200
 *  cuando el job diario aún no pobló ninguna fila — eso NO es un error ni un 404. */
export interface TipoCambio {
  fecha: string
  compra: number
  venta: number
}
