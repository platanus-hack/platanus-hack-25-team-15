# SecondBrain - Landing Page Pública

Landing page minimalista en español para SecondBrain, un sistema de gestión de conocimiento personal con IA.

## Stack Tecnológico

- **Next.js 15.5.6** - Framework React con App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Diseño responsivo y utilidades CSS
- **Lucide React** - Iconos consistentes
- **Node.js 20+** - Runtime

## Estructura

```
src/
├── app/
│   ├── layout.tsx       # Layout raíz
│   ├── page.tsx         # Página principal
│   └── globals.css      # Estilos globales
├── components/
│   ├── Header.tsx       # Navegación principal
│   ├── Footer.tsx       # Pie de página
│   └── sections/
│       ├── Hero.tsx     # Sección principal
│       ├── Features.tsx # Características
│       ├── HowItWorks.tsx # Cómo funciona
│       ├── Testimonials.tsx # Testimonios
│       ├── Pricing.tsx  # Precios
│       └── CTA.tsx      # Llamada a acción
```

## Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env.local (opcional)
cp .env.example .env.local
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

## Validación

```bash
# Lint
npm run lint

# Type checking
npm run type-check

# Build
npm run build

# Validación completa
npm run validate
```

## Características de la Landing

✨ **Diseño Minimalista**
- Paleta de colores oscura y profesional
- Tipografía clara e legible
- Espacios en blanco generosos

🎯 **Secciones**
1. **Hero** - Propuesta de valor clara
2. **Features** - 6 características principales con iconos
3. **How It Works** - 4 pasos simples del proceso
4. **Testimonials** - 4 testimonios de usuarios
5. **Pricing** - 3 planes (Gratuito, Pro, Team)
6. **CTA** - Llamada a acción final

📱 **Responsive**
- Diseño mobile-first
- Adaptado para tablets y desktop
- Navegación móvil funcional

🌐 **Internacionalización**
- Completamente en español
- Fácil de adaptar a otros idiomas

## Temas de Color

```
Background:    #0F0F0F (Oscuro profundo)
Foreground:    #E5E5E5 (Blanco opaco)
Card:          #1A1A1A (Gris muy oscuro)
Card Border:   #2A2A2A (Gris oscuro)
Text Secondary:#999999 (Gris medio)
Accent:        #3B82F6 (Azul)
```

## Deployment

### AWS Amplify

```bash
# Conectar repositorio GitHub
# Amplify detectará automáticamente Next.js

# Build command
next build

# Start command
next start
```

### Vercel

```bash
# Opción más sencilla para Next.js
npm install -g vercel
vercel
```

## Próximas Mejoras

- [ ] Integrar formulario de email
- [ ] Agregar más secciones (Use Cases por rol)
- [ ] Blog integrado
- [ ] Chatbot de soporte
- [ ] Dark/Light mode toggle
- [ ] Analytics (Plausible o Mixpanel)

## Licencia

MIT
