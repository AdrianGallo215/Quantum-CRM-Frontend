import { setupServer } from 'msw/node'

/**
 * Servidor MSW compartido por toda la suite. Arranca sin handlers: cada test
 * declara los suyos con `servidorMock.use(...)`, y `resetHandlers()` los retira
 * al terminar para que ninguna prueba herede el mock de otra.
 */
export const servidorMock = setupServer()

/**
 * Base que deben usar los handlers. Se deriva de `VITE_API_BASE_URL` en vez de
 * hardcodearla: `apiClient` (`src/api/client.ts`) lee esa misma variable, y
 * Vitest carga `.env` igual que Vite — un valor fijo aquí diverge en silencio
 * en cuanto alguien cambia el `.env` (pasó con el puerto 8080 del `.env` local),
 * y entonces MSW nunca intercepta nada: las requests salen con otro origin y
 * la prueba falla con "Sin notificaciones"/timeout en vez de un error claro.
 */
export const BASE_API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/api/v1'
