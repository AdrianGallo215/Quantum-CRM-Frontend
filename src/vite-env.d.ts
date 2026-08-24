/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /**
   * URL del cotizador de Quantum Investment (sistema externo). OPCIONAL: si no
   * se define, se usa el servidor por defecto de `src/utils/cotizadores.ts`.
   * Solo hace falta para apuntar a otro servidor sin recompilar.
   */
  readonly VITE_COTIZADOR_URL?: string
  /**
   * URL del cotizador de Quantum Leasing (sistema externo). OPCIONAL, mismo
   * criterio que la anterior. Ambos son sistemas separados, con sesión propia
   * e independiente de la del CRM.
   */
  readonly VITE_COTIZADOR_LEASING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
