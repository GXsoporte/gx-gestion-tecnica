# INCO Gestión Técnica

Plataforma SaaS empresarial para gestión de soporte técnico y mantenimiento tecnológico. Multi-empresa, con autenticación segura, módulos completos y diagnóstico con IA.

## Stack Tecnológico

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Base de datos**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js con JWT
- **IA**: OpenAI GPT-4o
- **Gráficas**: Recharts
- **Formularios**: React Hook Form + Zod
- **UI**: Componentes custom + Lucide Icons

## Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | KPIs, gráficas, actividad reciente |
| Tickets | Sistema completo de soporte (GX-TCK-XXXXXX) |
| Actividades | Registro técnico con tiempos (GX-ACT-XXXXXX) |
| Clientes | Gestión multiempresa |
| Inventario | Hoja de vida de activos (GX-AST-XXXXXX) |
| Mantenimientos | Preventivos y correctivos con calendario |
| Diagnóstico IA | Motor GPT-4o para análisis técnico |
| Reportes | PDF y Excel con filtros |
| Documentos | Repositorio documental |
| Tiempos | Control de productividad por técnico |
| Configuración | Usuarios, roles, empresa |

## Instalación rápida

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### 1. Clonar e instalar
```bash
cd inco-gestion-tecnica
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

Variables mínimas requeridas:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/inco_gestion"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
```

### 3. Preparar base de datos
```bash
npm run db:generate    # Genera el cliente Prisma
npm run db:push        # Crea las tablas
npm run db:seed        # Carga datos de demostración
```

### 4. Ejecutar
```bash
npm run dev
# Disponible en http://localhost:3000
```

## Credenciales de demostración

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Super Admin | superadmin@gx.com.co | Admin123! |
| Admin | admin@gx.com.co | Admin123! |
| Técnico | tecnico1@gx.com.co | Admin123! |
| Técnico 2 | tecnico2@gx.com.co | Admin123! |
| Cliente | contacto@demo.com | Admin123! |

## Deploy con Docker

```bash
# Copiar y configurar variables
cp .env.example .env
# Editar .env

# Levantar todos los servicios
docker-compose up -d

# Ejecutar migraciones y seed
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

## Deploy en VPS / cPanel

### Con Node.js directo
```bash
npm install
npm run build
npm run db:migrate
npm run db:seed
npm start
```

### Con PM2 (recomendado para producción)
```bash
npm install -g pm2
npm run build
pm2 start npm --name "inco-app" -- start
pm2 save
pm2 startup
```

### Con Nginx (proxy reverso)
```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en vercel.com
```

## Estructura del proyecto

```
inco-gestion-tecnica/
├── prisma/
│   ├── schema.prisma      # Esquema BD completo
│   └── seed.ts            # Datos de demostración
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login
│   │   ├── (dashboard)/   # Todos los módulos
│   │   │   ├── dashboard/
│   │   │   ├── tickets/
│   │   │   ├── actividades/
│   │   │   ├── clientes/
│   │   │   ├── inventario/
│   │   │   ├── mantenimientos/
│   │   │   ├── diagnostico/
│   │   │   ├── reportes/
│   │   │   ├── tiempos/
│   │   │   └── configuracion/
│   │   └── api/           # API Routes REST
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   └── ui/            # Componentes reutilizables
│   ├── lib/
│   │   ├── auth.ts        # NextAuth config
│   │   ├── db.ts          # Prisma client
│   │   ├── utils.ts       # Utilidades y constantes
│   │   └── api-helpers.ts # Helpers para API
│   ├── types/             # TypeScript types
│   └── middleware.ts      # Protección de rutas
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Roles y permisos

| Acción | Super Admin | Admin | Técnico | Cliente |
|--------|-------------|-------|---------|---------|
| Ver todos los tickets | ✅ | ✅ | Solo asignados | Solo propios |
| Crear tickets | ✅ | ✅ | ✅ | ✅ |
| Asignar técnicos | ✅ | ✅ | ❌ | ❌ |
| Ver clientes | ✅ | ✅ | ✅ | ❌ |
| Gestionar clientes | ✅ | ✅ | ❌ | ❌ |
| Registrar actividades | ✅ | ✅ | ✅ | ❌ |
| Ver inventario | ✅ | ✅ | ✅ | Solo propio |
| Diagnóstico IA | ✅ | ✅ | ✅ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ✅ | ❌ | ❌ |
| Gestionar empresas | ✅ | ❌ | ❌ | ❌ |

## Integración OpenAI (Diagnóstico IA)

1. Obtén una API key en [platform.openai.com](https://platform.openai.com)
2. Agrega al `.env`:
```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"
```
3. El módulo de Diagnóstico IA estará disponible automáticamente.

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build producción
npm run start        # Iniciar producción
npm run lint         # Lint del código

npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar esquema
npm run db:migrate   # Crear migración
npm run db:seed      # Cargar datos demo
npm run db:studio    # Abrir Prisma Studio
npm run db:reset     # Reset + seed
```

## Seguridad

- Autenticación JWT con NextAuth.js
- Protección de rutas con middleware
- Rate limiting en API
- Sanitización de inputs con Zod
- Auditoría de todas las acciones
- Separación de datos por empresa (multi-tenant)
- Contraseñas hasheadas con bcrypt (12 rounds)

## Soporte y contribuciones

Desarrollado por INCO Sistemas S.A.S.  
Versión 1.0.0 - Listo para producción
