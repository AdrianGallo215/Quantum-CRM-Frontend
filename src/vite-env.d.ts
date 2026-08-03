/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /**
   * URL del cotizador (sistema externo). OPCIONAL: si no se define, se usa el
   * servidor por defecto que hay en CotizadorFab.tsx. Solo hace falta para
   * apuntar a otro servidor sin recompilar.
   */
  readonly VITE_COTIZADOR_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
