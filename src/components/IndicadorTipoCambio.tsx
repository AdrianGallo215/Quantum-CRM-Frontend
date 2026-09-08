import { useTipoCambio } from '@/hooks/useTipoCambio'

/**
 * Tipo de cambio PEN/USD de SUNAT, permanente y discreto en el layout global
 * (`reglas_simulaciones.md` §12, encargo §5.7). Es requisito del LAYOUT, no
 * del módulo de Simulaciones: lo ven todos los roles autenticados (§22 no
 * tiene restricción de rol), incluidos `jdv` y `otro`, que no tienen acceso a
 * Simulaciones. Por eso NO se importa nada de `utils/simulacionPermisos.ts`
 * acá — sería heredar un permiso que este componente no tiene (K21).
 *
 * Sin dato no se renderiza nada (D16): `data: null` con 200 es una respuesta
 * válida y esperada mientras el job diario de las 09:30 Lima no haya corrido
 * todavía por primera vez. No es un error, no es un 404, y no se muestra ni
 * placeholder ni skeleton — el indicador simplemente no existe ese día hasta
 * que el job corra.
 */
export function IndicadorTipoCambio() {
  const { data } = useTipoCambio()

  if (!data) return null

  // `compra`/`venta` son la única excepción del contrato a "montos como
  // string" (§1 vs §22) — si esa excepción se normaliza algún día y empiezan
  // a llegar como string, `Number(...)` los sigue leyendo bien; si llega
  // cualquier otra cosa, no reventamos: este componente se monta en TODAS
  // las páginas para TODOS los roles (K21) y el único ErrorBoundary de la
  // app está en la raíz — un TypeError acá tumbaría el CRM entero por un
  // dato accesorio. Mismo criterio que D16 aplica al `null` (hallazgo C3,
  // auditoría T6.1).
  const compra = Number(data.compra)
  const venta = Number(data.venta)
  if (!Number.isFinite(compra) || !Number.isFinite(venta)) return null

  return (
    <div
      // md, no lg: el <header> que lo contiene (AppLayout.tsx) ya es "hidden
      // md:flex". Con lg quedaba invisible en toda la franja md-lg —tablets y
      // ventanas de escritorio angostas— aunque la topbar sí se viera ahí, y
      // contradecía "permanente" (reglas_simulaciones.md §12). Hallazgo C1,
      // auditoría T6.1.
      className="hidden md:flex items-center gap-2 rounded-pill bg-surface-container-low px-3 py-1.5 text-xs text-on-surface-variant"
      title={`Tipo de cambio SUNAT del ${data.fecha}`}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden>
        currency_exchange
      </span>
      <span>
        Compra <span className="font-bold text-on-surface">{compra.toFixed(3)}</span>
      </span>
      <span className="text-outline-variant">·</span>
      <span>
        Venta <span className="font-bold text-on-surface">{venta.toFixed(3)}</span>
      </span>
    </div>
  )
}
