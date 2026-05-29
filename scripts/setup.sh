#!/bin/bash
# ============================================
# INCO Gestión Técnica - Script de instalación
# Para Linux/macOS
# ============================================

set -e

echo "==============================================="
echo "   INCO Gestión Técnica - Instalación"
echo "==============================================="
echo ""

# Verificar Node.js
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js no está instalado. Instale desde https://nodejs.org"
    exit 1
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "IMPORTANTE: Edite el archivo .env con sus credenciales:"
    echo "  - DATABASE_URL: Conexion a PostgreSQL"
    echo "  - NEXTAUTH_SECRET: openssl rand -base64 32"
    echo "  - OPENAI_API_KEY: API key de OpenAI (opcional)"
    echo ""
    read -p "Presione Enter para continuar despues de configurar .env..."
fi

# Instalar dependencias
echo "Instalando dependencias npm..."
npm install

# Generar Prisma client
echo "Generando cliente Prisma..."
npm run db:generate

# Aplicar esquema
echo "Aplicando esquema a la base de datos..."
npm run db:push

# Seed
echo "Cargando datos de demostracion..."
npm run db:seed

echo ""
echo "==============================================="
echo "   Instalacion completada exitosamente!"
echo "==============================================="
echo ""
echo "Para iniciar:"
echo "  npm run dev"
echo ""
echo "URL: http://localhost:3000"
echo ""
echo "Credenciales:"
echo "  Super Admin: superadmin@gx.com.co / Admin123!"
echo "  Admin:       admin@gx.com.co / Admin123!"
echo "  Tecnico:     tecnico1@gx.com.co / Admin123!"
echo "  Cliente:     contacto@demo.com / Admin123!"
