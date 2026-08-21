import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { servidorMock } from './servidor-mock'

// Ant Design usa matchMedia para sus breakpoints responsive; jsdom no lo implementa.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// Varias tablas de Ant Design miden el contenedor con ResizeObserver.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// `error` corta el test ante cualquier request que no tenga handler declarado:
// una petición no prevista es un fallo de la prueba, no un silencio aceptable.
beforeAll(() => servidorMock.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  servidorMock.resetHandlers()
  cleanup()
})
afterAll(() => servidorMock.close())
