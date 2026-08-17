import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Typography } from 'antd'
import { post, mensajeDeError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Cargando } from '@/components/Estados'

const schema = z
  .object({
    password_actual: z.string().min(1, 'Requerido'),
    password_nueva: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres'),
    password_confirmacion: z.string().min(1, 'Requerido'),
  })
  .refine((v) => v.password_nueva === v.password_confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmacion'],
  })

type Form = z.infer<typeof schema>

/**
 * Flujo de cambio de contraseña obligatorio (PRD §9.1). El endpoint específico
 * aún no figura en contrato_api.md — se usa POST /auth/cambiar-contrasena y
 * se ajustará cuando el backend publique la firma definitiva.
 */
export function CambiarContrasenaPage() {
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const cargandoSesion = useAuthStore((s) => s.cargando)
  const setEmpleado = useAuthStore((s) => s.setEmpleado)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { password_actual: '', password_nueva: '', password_confirmacion: '' },
  })

  // `cargando` arranca en true mientras useRestaurarSesion resuelve /empleados/me.
  // Sin este chequeo, recargar la página aquí expulsaba al login: en el primer
  // render `empleado` todavía es null aunque la sesión sea válida.
  if (cargandoSesion) return <Cargando mensaje="Verificando sesión…" />
  if (!empleado) return <Navigate to="/login" replace />

  const onSubmit = async (values: Form) => {
    setError(null)
    setEnviando(true)
    try {
      await post('/auth/cambiar-contrasena', {
        password_actual: values.password_actual,
        password_nueva: values.password_nueva,
      })
      setEmpleado({ ...empleado, requiere_cambio_contrasena: false })
      navigate('/', { replace: true })
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cambiar la contraseña'))
    } finally {
      setEnviando(false)
    }
  }

  const campo = (
    name: keyof Form,
    label: string,
  ) => (
    <div style={{ marginTop: 16 }}>
      <label className="eyebrow" htmlFor={name} style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input.Password {...field} id={name} status={errors[name] ? 'error' : undefined} />
        )}
      />
      {errors[name] && (
        <div style={{ color: '#ba1a1a', fontSize: 12, marginTop: 4 }}>{errors[name]?.message}</div>
      )}
    </div>
  )

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
      <div className="bento-card" style={{ width: 420, padding: 32 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Cambia tu contraseña
        </Typography.Title>
        <Typography.Paragraph style={{ color: '#444750' }}>
          Por seguridad debes definir una contraseña nueva antes de continuar.
        </Typography.Paragraph>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 4 }} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {campo('password_actual', 'Contraseña actual')}
          {campo('password_nueva', 'Contraseña nueva')}
          {campo('password_confirmacion', 'Confirmar contraseña nueva')}
          <Button type="primary" htmlType="submit" block loading={enviando} style={{ marginTop: 24 }}>
            Guardar y continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
