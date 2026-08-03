import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import { BrowserRouter } from 'react-router-dom'
import { quantumTheme } from './theme'
import { AppRouter } from './router'
import { useRestaurarSesion } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { estadoHttpDeError } from './api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * No reintentar los errores que un reintento no arregla. Antes se
       * reintentaba todo una vez: un 403 o un 404 duplicaba la petición y
       * retrasaba el mensaje de error que el usuario debía ver de inmediato.
       * El 401 lo resuelve aparte el interceptor de refresh en api/client.
       */
      retry: (contador, error) => {
        const status = estadoHttpDeError(error)
        if (status !== null && status >= 400 && status < 500) return false
        return contador < 1
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function Bootstrap() {
  useRestaurarSesion()
  return <AppRouter />
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={quantumTheme} locale={esES}>
          <AntApp>
            <BrowserRouter>
              <Bootstrap />
            </BrowserRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
