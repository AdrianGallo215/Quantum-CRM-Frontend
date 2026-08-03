import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Typography } from 'antd'
import { authApi } from '@/api/auth'
import { estadoHttpDeError, mensajeDeError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Cargando } from '@/components/Estados'

const schema = z.object({
  email: z.string().min(1, 'Requerido').email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
})

type LoginForm = z.infer<typeof schema>

/**
 * Traduce el fallo del login. Distinguir el 401 del resto no es un detalle:
 * si el backend está caído o no hay red, decirle al usuario "contraseña
 * incorrecta" lo manda a reintentar credenciales que son correctas.
 */
function mensajeDeLogin(error: unknown): string {
  const status = estadoHttpDeError(error)
  if (status === 401) return 'Email o contraseña incorrectos'
  if (status === 429) return 'Demasiados intentos. Espera unos minutos antes de volver a probar'
  if (status !== null && status >= 500) {
    return 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos'
  }
  return mensajeDeError(error, 'No se pudo iniciar sesión')
}

export function LoginPage() {
  const navigate = useNavigate()
  const setEmpleado = useAuthStore((s) => s.setEmpleado)
  const empleado = useAuthStore((s) => s.empleado)
  const cargandoSesion = useAuthStore((s) => s.cargando)
  const [errorLogin, setErrorLogin] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginForm) => {
    setErrorLogin(null)
    setEnviando(true)
    try {
      const res = await authApi.login(values.email, values.password)
      setEmpleado(res.empleado)
      if (res.empleado.requiere_cambio_contrasena) {
        navigate('/cambiar-contrasena', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (e) {
      // El 401 sigue sin revelar si falló el email o la contraseña (contrato §6);
      // los demás fallos sí se nombran, para no culpar al usuario de una caída.
      setErrorLogin(mensajeDeLogin(e))
    } finally {
      setEnviando(false)
    }
  }

  // Mientras se restaura la sesión no sabemos si hay usuario: mostrar el
  // formulario aquí provocaba un parpadeo de login a quien ya estaba dentro.
  if (cargandoSesion) return <Cargando mensaje="Verificando sesión…" />
  if (empleado) {
    return <Navigate to={empleado.requiere_cambio_contrasena ? '/cambiar-contrasena' : '/'} replace />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F7FE',
      }}
    >
      <div className="bento-card" style={{ width: 400, maxWidth: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span
            className="headline"
            style={{ fontSize: 28, fontWeight: 700, color: '#244481', letterSpacing: '-0.02em' }}
          >
            Quantum <span style={{ color: '#006a64' }}>CRM</span>
          </span>
          <Typography.Paragraph style={{ color: '#444750', marginTop: 8, marginBottom: 0 }}>
            Ingresa con tu cuenta corporativa
          </Typography.Paragraph>
        </div>

        {errorLogin && (
          <Alert
            type="error"
            showIcon
            message={errorLogin}
            style={{ marginBottom: 16, borderRadius: 4 }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="eyebrow" htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="email"
                type="email"
                placeholder="nombre@quantum.pe"
                status={errors.email ? 'error' : undefined}
                autoComplete="email"
              />
            )}
          />
          {errors.email && (
            <div style={{ color: '#ba1a1a', fontSize: 12, marginTop: 4 }}>{errors.email.message}</div>
          )}

          <label
            className="eyebrow"
            htmlFor="password"
            style={{ display: 'block', marginTop: 16, marginBottom: 4 }}
          >
            Contraseña
          </label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                id="password"
                placeholder="••••••••"
                status={errors.password ? 'error' : undefined}
                autoComplete="current-password"
              />
            )}
          />
          {errors.password && (
            <div style={{ color: '#ba1a1a', fontSize: 12, marginTop: 4 }}>
              {errors.password.message}
            </div>
          )}

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={enviando}
            style={{ marginTop: 24 }}
          >
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  )
}
