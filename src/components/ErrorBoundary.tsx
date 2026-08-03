import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Result, Typography } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Red de seguridad de último recurso. Sin esto, cualquier excepción durante el
 * render deja la pantalla EN BLANCO, sin mensaje ni forma de recuperarse salvo
 * que el usuario sepa que debe recargar — en producción eso se lee como "la app
 * se cayó" y genera un ticket por cada ocurrencia.
 *
 * Tiene que ser un componente de clase: React no expone equivalente en hooks.
 * Envuelve al router entero en App.tsx, así que cubre todas las pantallas.
 *
 * El detalle técnico solo se muestra en desarrollo: en producción un stack
 * trace no ayuda al vendedor y puede filtrar rutas internas del bundle.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No hay servicio de error reporting en el proyecto (ni Sentry ni similar).
    // La consola es el único canal disponible para soporte; el prefijo permite
    // filtrarlo rápido cuando alguien comparte una captura de la consola.
    console.error('[CRITICO][RENDER] Error no controlado en la interfaz', error, info.componentStack)
  }

  private reintentar = (): void => {
    this.setState({ error: null })
  }

  private volverAlInicio = (): void => {
    // Recarga completa a propósito: si el árbol quedó en un estado inconsistente,
    // remontar sin más puede volver a romper en el mismo punto.
    window.location.assign('/')
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F4F7FE' }}>
        <Result
          status="error"
          title="Algo salió mal"
          subTitle="La pantalla no se pudo mostrar. Puedes reintentar o volver al inicio; tus datos no se han perdido."
          extra={[
            <Button type="primary" key="reintentar" onClick={this.reintentar}>
              Reintentar
            </Button>,
            <Button key="inicio" onClick={this.volverAlInicio}>
              Volver al inicio
            </Button>,
          ]}
        >
          {import.meta.env.DEV && (
            <Typography.Paragraph type="danger" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {error.message}
            </Typography.Paragraph>
          )}
        </Result>
      </div>
    )
  }
}
