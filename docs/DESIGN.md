# Quantum CRM — Sistema de Diseño

> Fuente de verdad del diseño para `quantum-crm-frontend`. Extraído de los prototipos de Stitch. Claude Code aplica estos tokens al pie de la letra — sin interpretarlos, sin "modernizarlos", sin agregar elementos no documentados aquí. Toda decisión de diseño no cubierta en este archivo debe consultarse antes de implementarse.

---

## 1. Principios

1. **Corporativo moderno, no genérico.** La referencia es Salesforce y Monday CRM: azul profundo, superficies blancas limpias, tipografía sin serif para todo. No ivory, no clay, no serif.
2. **Jerarquía por superficie.** Las capas se distinguen con variantes de superficie (container, container-low, container-lowest) más que con sombras pesadas. Las sombras son sutiles y solo existen en cards y hovers.
3. **Un solo acento primario.** Navy (#244481) es el único color de acción. Aparece en botones primarios, nav activo, íconos de acción, links. El teal (#006a64) es el acento secundario para estados positivos y métricas favorables.
4. **Material Symbols para iconos.** Toda iconografía usa Material Symbols Outlined. Sin mezcla de librerías de íconos.
6. **Pills para acciones, 4px para contenido.** Botones, badges y tags son `border-radius: 9999px`. Cards, inputs, tablas y paneles usan `4px`. Modales usan `8px`.

---

## 2. Colores

### Paleta completa (tokens canónicos)

```
PRIMARIOS
primary:                  #244481   → botones primarios, nav activo, links, íconos de acción
primary-container:        #3e5c9a   → hover de botón primario, superficies de énfasis leve
on-primary:               #ffffff   → texto sobre primary
on-primary-container:     #c8d7ff   → texto sobre primary-container
primary-fixed:            #d9e2ff   → backgrounds de avatar/iniciales primarios
primary-fixed-dim:        #afc6ff   → variante tenue de primary-fixed
on-primary-fixed:         #001a43   → texto sobre primary-fixed
on-primary-fixed-variant: #254582   → texto secundario sobre primary-fixed

SECUNDARIOS (teal — estados positivos, métricas favorables)
secondary:                #006a64   → texto de estado positivo, progress bars de éxito
secondary-container:      #8ff0e8   → background de badge positivo
secondary-fixed:          #92f3eb   → background claro para highlights teal
secondary-fixed-dim:      #75d7ce   → variante tenue
on-secondary:             #ffffff
on-secondary-container:   #006f69
on-secondary-fixed:       #00201e
on-secondary-fixed-variant:#00504b

ERROR (rojo — alertas, métricas negativas, urgente)
error:                    #ba1a1a
error-container:          #ffdad6
on-error:                 #ffffff
on-error-container:       #93000a

SUPERFICIES (niveles de elevación)
background:               #F4F7FE   → fondo de página (body background)
surface:                  #fbf8ff   → nav bar, sidebars
surface-bright:           #fbf8ff   → alias de surface
surface-dim:              #d1d8ff   → hover muy sutil en áreas grandes
surface-container-lowest: #ffffff   → cards, tablas, inputs, el nivel más claro
surface-container-low:    #f3f2ff   → hover de fila de tabla, items seleccionados
surface-container:        #ecedff   → tab switcher background, chips
surface-container-high:   #e4e7ff   → separadores, bordes de sección, thead
surface-container-highest:#dde1ff   → backgrounds de celdas especiales

TEXTO Y BORDES
on-background:            #0e193e   → texto principal de página
on-surface:               #0e193e   → texto principal en cards
on-surface-variant:       #444750   → texto secundario, labels, placeholders
outline:                  #747781   → bordes de inputs, iconos secundarios
outline-variant:          #c4c6d1   → bordes de cards, separadores, dividers

MISCELÁNEOS
tertiary:                 #42464c   → íconos neutros
tertiary-container:       #5a5e64   → backgrounds de estado neutral
tertiary-fixed:           #dfe2e9   → backgrounds muy claros neutros
tertiary-fixed-dim:       #c3c7cd   → íconos inactivos
on-tertiary:              #ffffff
on-tertiary-container:    #d4d8de
on-tertiary-fixed:        #181c21
on-tertiary-fixed-variant:#43474d
inverse-surface:          #242e55   → tooltips, overlays oscuros
inverse-on-surface:       #efefff   → texto en inverse-surface
surface-tint:             #3f5d9b   → tinte de elevación
surface-variant:          #dde1ff   → alias de surface-container-highest
```

### Uso semántico rápido

| Situación | Color a usar |
|---|---|
| Botón primario | `primary` bg + `on-primary` texto |
| Botón outline/secundario | `outline` border + `on-surface` texto |
| Badge positivo (éxito, ganado) | `secondary-container` bg + `on-secondary-container` texto |
| Badge urgente / negativo | `error-container` bg + `on-error-container` texto |
| Badge pendiente / neutral | `surface-container-high` bg + `on-surface-variant` texto |
| Nav link activo | `primary` texto + `primary` border-bottom |
| Nav link inactivo | `on-surface-variant` texto |
| Fondo de página | `background` (#F4F7FE) |
| Cards y paneles | `surface-container-lowest` (#ffffff) |
| Hover de fila en tabla | `surface-container-low` |
| Valor numérico positivo | `secondary` |
| Valor numérico negativo | `error` |

---

## 3. Tipografía

### Familias

| Familia | Fuente | Uso |
|---|---|---|
| Headlines | **Manrope** (600, 700) | Títulos de página, títulos de sección, nombre del sistema |
| Body / Labels | **Inter** (400, 500, 600) | Texto de cuerpo, labels, navegación, botones |
| Métricas | **Inter** (400, 500, 600) | Valores numéricos calculados: montos, porcentajes, conteos, IDs de referencia |


### Escala tipográfica

| Token | Familia | Tamaño | Line-height | Letter-spacing | Peso |
|---|---|---|---|---|---|
| `headline-lg` | Manrope | 32px | 40px | −0.02em | 700 |
| `headline-md` | Manrope | 24px | 32px | −0.01em | 600 |
| `headline-sm` | Manrope | 20px | 28px | — | 600 |
| `body-lg` | Inter | 16px | 24px | — | 400 |
| `body-md` | Inter | 14px | 20px | — | 400 |
| `label-md` | Inter | 12px | 16px | +0.05em | 600 |
| `metric` | Inter | contextual | — | — | 400–600 |

**Uso de `label-md`:** siempre en uppercase para eyebrows (labels encima de secciones), títulos de columnas de tabla, y badges. Aplica `tracking-wider` en estos contextos.

**Uso de `metric`:** cualquier valor que el sistema calcula — precios (`$2.4M`), porcentajes (`34.2%`), conteos (`1,248`), días (`42 días`). 

---

## 4. Espaciado y layout

| Token | Valor | Uso |
|---|---|---|
| `unit` | 4px | Unidad base del sistema |
| `container-padding` | 20px | Padding interno de cards y paneles |
| `gutter` | 24px | Gap entre columnas del grid |
| `margin-page` | 32px | Padding horizontal de la página |
| `sidebar-width` | 280px | Ancho del sidebar (si aplica) |
| `max-width` | 1440px | Ancho máximo del contenido de página |

**Grid:** 12 columnas, gap de `gutter` (24px). En md: 4 columnas. En sm: 1 columna.

**Padding interno de cards:** 20px en todos los lados (`container-padding`).

**Alto de TopAppBar:** 64px (h-16).

**Gap entre secciones de una página:** `gutter` (24px) o `py-8` (32px) según el contexto.

---

## 5. Border Radius

| Token | Valor | Uso |
|---|---|---|
| `DEFAULT` | 4px | Cards, inputs, tablas, paneles, widgets, la mayoría de elementos |
| `lg` | 8px | Modales, drawers, containers más grandes |
| `xl` | 12px | — (reservado, usar con moderación) |
| `full` | 9999px | Botones, badges, pills, tabs activos, avatares circulares |

**Regla:** si es interactivo y tiene texto → pill (9999px). Si es contenedor de contenido → 4px.

---

## 6. Sombras y elevación

```
ambient:       0 4px 20px rgba(0, 0, 0, 0.05)   → cards en estado normal
ambient-hover: 0 8px 30px rgba(0, 0, 0, 0.08)   → cards en hover
```

Transición de sombra: `transition: box-shadow 0.3s ease`.

**Nunca** usar sombras grandes o dramáticas. Las superficies se diferencian principalmente por color de background, no por elevación de sombra.

---

## 7. Íconos

- **Librería:** Material Symbols Outlined exclusivamente.
- **Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```
- **Tamaños:** 18px en botones y labels, 20px en headers de sección, 24px como default.
- **Color:** heredar del contexto o usar `on-surface-variant` para íconos neutros.
- **Estilo de la fuente:** `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`.

Para Ant Design v5 usar el componente `<Icon>` con `<span className="material-symbols-outlined">`.

---

## 8. Animaciones y transiciones

```
Interactivos (hover, active):  transition: all 0.15s ease  o  transition-colors 0.2s
Sombras de card:               transition: box-shadow 0.3s ease
Tab switcher:                  transition: all 0.2s
Botón active (press):          active:scale-[0.98]
```

Nada de animaciones complejas ni keyframes. Solo micro-interacciones en hover y active states.

---

## 9. Patrones de componentes

### 9.1 TopAppBar

```
Altura:        64px
Background:    surface (#fbf8ff)
Border-bottom: 1px solid outline-variant
Padding-x:     margin-page (32px)
Max-width:     1440px centrado

Logo:          font-headline-md, text-primary, font-bold, tracking-tight
Nav links:     text-body-md, on-surface-variant → hover: text-primary
               Active: text-primary, font-bold, border-b-2 border-primary, py-5
Botón CTA:     bg-primary-container, on-primary text, rounded-full, label-md, px-5 py-2
Icon buttons:  rounded-full, hover: bg-surface-container-high
Avatar:        w-8 h-8 rounded-full, border outline-variant
               Fallback iniciales: bg-primary-fixed, on-primary-fixed-variant text
```

### 9.2 Bento Card (panel de contenido)

```
Background:    surface-container-lowest (#ffffff)
Border-radius: 4px
Shadow:        ambient (0 4px 20px rgba(0,0,0,0.05))
Hover shadow:  ambient-hover (0 8px 30px rgba(0,0,0,0.08))
Padding:       20px
Transición:    box-shadow 0.3s ease
```

### 9.3 Metric Card

```
Height:        128px (h-32)
Layout:        flex flex-col justify-between
Label:         label-md, on-surface-variant, uppercase, tracking-wider
Value:         3xl font-bold, Inter, on-background
Sub-label:     10px, on-surface-variant
Badge de tendencia: rounded-full, px-2 py-0.5, text-xs font-semibold
  Positivo: secondary bg + on-secondary-fixed-variant texto
  Negativo: error-container bg + on-error-container texto
```

### 9.4 Botones

```
Primary:
  bg-primary, on-primary texto
  rounded-full, label-md, px-5 py-2
  hover: opacity-90
  active: scale-[0.98]

Secondary / Outline:
  border border-outline, on-surface texto
  rounded-full, label-md, px-4 py-2
  hover: bg-surface-container-low

Destructive:
  bg-error, on-error texto
  rounded-full, label-md

Icon button:
  w-8 h-8, rounded-full
  border border-outline-variant, outline texto
  hover: bg-primary, on-primary texto, border-primary
  Transición: all 0.2s

Full-width primary CTA (en móvil o paneles):
  w-full, rounded-full, shadow-md, flex items-center justify-center gap-2
```

### 9.5 Badges / Status Chips

```
Forma:         rounded-full, px-2-3 py-0.5-1
Tipografía:    10px font-bold uppercase tracking-wider (o text-xs font-semibold)

Urgente / Error:    error-container bg + on-error-container texto
Pendiente:          primary-container bg + on-primary-container texto
Positivo / Éxito:   secondary-container bg + on-secondary-container texto
Neutral / Info:     surface-container-high bg + on-surface-variant texto
Legal / Categoría:  secondary-container bg (más oscuro) + on-secondary-container
Operativo:          surface-variant bg + on-surface-variant texto
```

### 9.6 Tab Switcher (selector de vista)

```
Contenedor:  bg-surface-container, p-1, rounded DEFAULT (4px)
Botón activo:  bg-surface-container-lowest, text-primary, shadow-sm, rounded-[2px]
Botón inactivo: text-on-surface-variant, hover: text-on-surface
Tipografía:    label-md
Transición:    all 0.2s
```

### 9.7 Lista de items (cards de tarea / evento)

**Tarea:**
```
Layout:        flex items-center justify-between
Background:    surface-container-lowest
Border:        1px solid outline-variant
Border-radius: DEFAULT (4px) [rounded-sm]
Padding:       12px
Hover:         shadow-sm
Cursor:        pointer
Contenido izq: ID en label-md uppercase, descripción en body-md semibold, fecha con ícono
Contenido der: badge de estado (pill)
```

**Evento:**
```
Layout:        flex items-stretch gap-4
Bloque fecha:  min-w-[56px], flex-col items-center, rounded DEFAULT, py-2
  Hoy/urgente:   bg-primary, on-primary texto
  Futuro:        bg-surface-container-high, on-surface-variant texto
  Mes:           10px font-bold uppercase
  Día:           headline-sm font-bold
Contenido:     flex-grow flex-col, truncate con min-w-0
  Título:        body-md semibold on-surface, truncate
  Subtítulo:     label-md text-primary, truncate
Flecha:        w-8 h-8 rounded-full border outline-variant
  hover group:   bg-primary, on-primary, border-primary
```

### 9.8 Tablas de datos

```
Estructura:    border-collapse w-full
Thead:         border-b surface-container-high
  Celda:       label-md uppercase tracking-wider, on-surface-variant
               py-3 px-2, font-semibold
Tbody:         body-md
  Fila:        border-b surface-container-high, hover: bg-surface-container-lowest
               transition-colors, cursor depende del contexto
  Celda:       py-4 px-2
Valores num.:  font-medium metric-value (Inter)
Progress bar:  h-1.5, bg-surface-container-highest, rounded-full, overflow-hidden
               Fill: bg-primary o bg-secondary según contexto
```

### 9.9 Inputs y formularios

```
Border:        1px solid outline-variant
Border-radius: 4px (DEFAULT)
Focus:         border-primary, outline none
Background:    surface-container-lowest (#ffffff)
Texto:         on-surface, body-md
Placeholder:   on-surface-variant
Label:         label-md, on-surface-variant, mb-1
Error:         border-error, texto error
```

### 9.10 Avatares de usuario

```
Forma:         rounded-full
Tamaño default: w-8 h-8 (32px)
Con imagen:    object-cover, border outline-variant
Con iniciales: bg-primary-fixed, on-primary-fixed-variant texto, font-bold text-xs
               (hasta 2 letras)
```

### 9.11 BottomNavBar (solo mobile)

```
Position:      fixed bottom-0, full-width
Background:    surface
Border-top:    1px outline-variant
Ítems:         flex-col items-center, on-surface-variant, hover: on-primary
Ítem activo:   bg-secondary-container, on-secondary-container, rounded-full, scale-95
Tipografía:    10px label-md
Ícono:         Material Symbols 24px
```

---

## 10. Configuración del tema de Ant Design v5

Colocar en el `App.tsx` o en el provider de tema raíz. Este objeto mapea los tokens del sistema de diseño a los tokens de Ant Design.

```typescript
import { ThemeConfig } from 'antd'

export const quantumTheme: ThemeConfig = {
  token: {
    // ── Color ──────────────────────────────────────────
    colorPrimary:              '#244481',
    colorPrimaryBg:            '#f3f2ff',
    colorPrimaryBgHover:       '#e4e7ff',
    colorPrimaryBorder:        '#c4c6d1',
    colorPrimaryBorderHover:   '#3e5c9a',
    colorPrimaryHover:         '#3e5c9a',
    colorPrimaryActive:        '#1b3466',
    colorPrimaryTextHover:     '#3e5c9a',
    colorPrimaryText:          '#244481',
    colorPrimaryTextActive:    '#1b3466',

    colorSuccess:              '#006a64',
    colorSuccessBg:            '#92f3eb',
    colorSuccessBgHover:       '#8ff0e8',
    colorSuccessBorder:        '#75d7ce',
    colorSuccessHover:         '#005f5a',
    colorSuccessActive:        '#004e4a',
    colorSuccessText:          '#006a64',
    colorSuccessTextHover:     '#005f5a',
    colorSuccessTextActive:    '#004e4a',

    colorWarning:              '#d97706',
    colorWarningBg:            '#fef3c7',

    colorError:                '#ba1a1a',
    colorErrorBg:              '#ffdad6',
    colorErrorBorder:          '#f5a3a3',
    colorErrorHover:           '#a01515',
    colorErrorActive:          '#880f0f',
    colorErrorText:            '#ba1a1a',

    colorInfo:                 '#244481',

    // ── Background ──────────────────────────────────────
    colorBgBase:               '#fbf8ff',
    colorBgContainer:          '#ffffff',
    colorBgElevated:           '#ffffff',
    colorBgLayout:             '#F4F7FE',
    colorBgSpotlight:          '#ecedff',
    colorBgMask:               'rgba(13, 25, 62, 0.45)',

    // ── Text ────────────────────────────────────────────
    colorText:                 '#0e193e',
    colorTextSecondary:        '#444750',
    colorTextTertiary:         '#747781',
    colorTextQuaternary:       '#c4c6d1',
    colorTextDisabled:         '#c4c6d1',
    colorTextPlaceholder:      '#747781',
    colorTextHeading:          '#0e193e',

    // ── Border ──────────────────────────────────────────
    colorBorder:               '#c4c6d1',
    colorBorderSecondary:      '#e4e7ff',
    colorSplit:                '#e4e7ff',

    // ── Fill ────────────────────────────────────────────
    colorFill:                 '#ecedff',
    colorFillSecondary:        '#e4e7ff',
    colorFillTertiary:         '#f3f2ff',
    colorFillQuaternary:       '#fbf8ff',

    // ── Typography ──────────────────────────────────────
    fontFamily:                "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontFamilyCode:            "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize:                  14,
    fontSizeSM:                12,
    fontSizeLG:                16,
    fontSizeXL:                20,
    fontSizeHeading1:          32,
    fontSizeHeading2:          24,
    fontSizeHeading3:          20,
    fontSizeHeading4:          16,
    fontSizeHeading5:          14,
    lineHeight:                1.5714,
    lineHeightLG:              1.5,
    lineHeightSM:              1.3333,

    // ── Border Radius ────────────────────────────────────
    borderRadius:              4,
    borderRadiusSM:            4,
    borderRadiusLG:            8,
    borderRadiusXS:            2,

    // ── Spacing ──────────────────────────────────────────
    padding:                   20,
    paddingLG:                 24,
    paddingXL:                 32,
    paddingMD:                 16,
    paddingSM:                 12,
    paddingXS:                 8,
    paddingXXS:                4,
    margin:                    20,
    marginLG:                  24,
    marginXL:                  32,
    marginMD:                  16,
    marginSM:                  12,
    marginXS:                  8,
    marginXXS:                 4,

    // ── Control ──────────────────────────────────────────
    controlHeight:             36,
    controlHeightSM:           28,
    controlHeightLG:           44,
    controlHeightXS:           24,
    controlOutlineWidth:       2,
    controlItemBgHover:        '#f3f2ff',
    controlItemBgActive:       '#e4e7ff',
    controlItemBgActiveHover:  '#dde1ff',
    controlItemBgActiveDisabled: '#ecedff',

    // ── Shadow ───────────────────────────────────────────
    boxShadow:                 '0 4px 20px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary:        '0 8px 30px rgba(0, 0, 0, 0.08)',
    boxShadowTertiary:         '0 1px 4px rgba(0, 0, 0, 0.04)',

    // ── Motion ───────────────────────────────────────────
    motionDurationFast:        '0.1s',
    motionDurationMid:         '0.2s',
    motionDurationSlow:        '0.3s',
    motionEaseInOut:           'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut:             'cubic-bezier(0, 0, 0.2, 1)',

    // ── Wireframe ────────────────────────────────────────
    wireframe:                 false,
  },
  components: {
    Button: {
      borderRadius:            9999,   // siempre pill
      borderRadiusSM:          9999,
      borderRadiusLG:          9999,
      fontWeight:              600,
      primaryShadow:           'none',
      defaultShadow:           'none',
      dangerShadow:            'none',
    },
    Tag: {
      borderRadius:            9999,   // badges siempre pill
      fontSizeSM:              10,
    },
    Badge: {
      borderRadius:            9999,
    },
    Card: {
      borderRadius:            4,
      paddingLG:               20,
      boxShadow:               '0 4px 20px rgba(0, 0, 0, 0.05)',
    },
    Table: {
      borderRadius:            4,
      headerBg:                '#fbf8ff',
      headerColor:             '#444750',
      rowHoverBg:              '#f3f2ff',
      headerSortActiveBg:      '#f3f2ff',
    },
    Input: {
      borderRadius:            4,
      activeBorderColor:       '#244481',
      hoverBorderColor:        '#3e5c9a',
      colorBgContainer:        '#ffffff',
    },
    Select: {
      borderRadius:            4,
    },
    Modal: {
      borderRadius:            8,
      borderRadiusSM:          8,
    },
    Tabs: {
      inkBarColor:             '#244481',
      itemActiveColor:         '#244481',
      itemSelectedColor:       '#244481',
      itemHoverColor:          '#3e5c9a',
    },
    Menu: {
      itemBorderRadius:        4,
      itemSelectedBg:          '#f3f2ff',
      itemSelectedColor:       '#244481',
      itemHoverBg:             '#ecedff',
      itemHoverColor:          '#244481',
      activeBarBorderWidth:    2,
    },
    Typography: {
      titleMarginBottom:       '0.5em',
      titleMarginTop:          '1em',
      fontWeightStrong:        600,
    },
    Notification: {
      borderRadius:            8,
    },
    Message: {
      borderRadius:            8,
    },
    Avatar: {
      borderRadius:            9999,
      colorTextPlaceholder:    '#afc6ff',
    },
  },
}
```

### Uso en la app

```tsx
// App.tsx o main.tsx
import { ConfigProvider } from 'antd'
import { quantumTheme } from './theme'

function App() {
  return (
    <ConfigProvider theme={quantumTheme}>
      {/* resto de la app */}
    </ConfigProvider>
  )
}
```

---

## 11. Variables CSS globales complementarias

Para estilos que Ant Design no cubre directamente, agregar en `index.css` o `global.css`:

```css
:root {
  /* Layout */
  --sidebar-width:      280px;
  --topbar-height:      64px;
  --max-width:          1440px;
  --page-padding-x:     32px;
  --gutter:             24px;
  --container-padding:  20px;

  /* Color (espejo de los tokens para CSS puro) */
  --bg:                 #F4F7FE;
  --surface:            #fbf8ff;
  --surface-lowest:     #ffffff;
  --surface-container:  #ecedff;
  --on-surface:         #0e193e;
  --on-surface-variant: #444750;
  --outline:            #747781;
  --outline-variant:    #c4c6d1;
  --primary:            #244481;
  --primary-container:  #3e5c9a;
  --secondary:          #006a64;
  --error:              #ba1a1a;
  --error-container:    #ffdad6;

  /* Shadow */
  --shadow-ambient:     0 4px 20px rgba(0, 0, 0, 0.05);
  --shadow-hover:       0 8px 30px rgba(0, 0, 0, 0.08);
}

body {
  background-color: var(--bg);
  color: var(--on-surface);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.metric-value {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.bento-card {
  background-color: var(--surface-lowest);
  border-radius: 4px;
  box-shadow: var(--shadow-ambient);
  padding: var(--container-padding);
  transition: box-shadow 0.3s ease;
}

.bento-card:hover {
  box-shadow: var(--shadow-hover);
}
```

---

## 12. Lo que NO hacer

- ❌ Serif en ningún elemento de la UI
- ❌ Fuentes Monoespaciadas para nada
- ❌ Sombras grandes o dramáticas (`box-shadow: 0 20px 60px rgba(...)`)
- ❌ Gradientes en backgrounds de página o cards
- ❌ Mezclar librerías de íconos con Material Symbols
- ❌ Dark mode — los prototipos solo tienen tema claro
- ❌ Colores fuera de la paleta documentada — no inventar variantes
- ❌ Border-radius de 4px en botones (siempre rounded-full = 9999px)
- ❌ Border-radius de 9999px en cards o paneles (siempre 4px)
- ❌ Copiar el HTML/CSS de los prototipos de Stitch — reconstruir con Ant Design y estos tokens