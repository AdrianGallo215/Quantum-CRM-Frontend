import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import { MemoryRouter } from 'react-router-dom'

/**
 * QueryClient nuevo por test, con reintentos apagados: en pruebas un reintento
 * solo añade latencia y esconde el error que se está verificando.
 */
export function crearQueryClientDePrueba(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface OpcionesRender extends Omit<RenderOptions, 'wrapper'> {
  rutaInicial?: string
  queryClient?: QueryClient
}

/**
 * `render` con todos los providers que la app monta en App.tsx. Usar SIEMPRE
 * este en vez del `render` crudo de Testing Library: sin ConfigProvider/AntApp
 * los componentes que llaman a `App.useApp()` caen al fallback estático de antd.
 */
export function renderConProviders(ui: ReactElement, opciones: OpcionesRender = {}) {
  const { rutaInicial = '/', queryClient = crearQueryClientDePrueba(), ...resto } = opciones

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ token: {} }} locale={esES}>
          <AntApp>
            <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...resto }) }
}

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
