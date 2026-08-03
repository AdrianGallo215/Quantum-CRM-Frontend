import type { CSSProperties } from 'react'

interface IconoProps {
  nombre: string
  tamano?: number
  color?: string
  style?: CSSProperties
  className?: string
}

/** Ícono Material Symbols Outlined (única librería de íconos permitida) */
export function Icono({ nombre, tamano = 24, color, style, className }: IconoProps) {
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      style={{ fontSize: tamano, color, lineHeight: 1, ...style }}
      aria-hidden
    >
      {nombre}
    </span>
  )
}
