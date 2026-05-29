# ============================================
# INCO Gestión Técnica - Script de instalación
# Para Windows (PowerShell)
# ============================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   INCO Gestión Técnica - Instalación" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js no está instalado. Descargue desde https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

# Verificar npm
$npmVersion = npm --version 2>$null
Write-Host "npm: $npmVersion" -ForegroundColor Green

# Copiar .env si no existe
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "IMPORTANTE: Edite el archivo .env con sus credenciales:" -ForegroundColor Yellow
    Write-Host "  - DATABASE_URL: Conexion a PostgreSQL" -ForegroundColor Yellow
    Write-Host "  - NEXTAUTH_SECRET: Secret seguro para JWT" -ForegroundColor Yellow
    Write-Host "  - OPENAI_API_KEY: API key de OpenAI (opcional)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Presione Enter para continuar despues de configurar .env..."
    Read-Host
}

# Instalar dependencias
Write-Host "Instalando dependencias npm..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al instalar dependencias" -ForegroundColor Red
    exit 1
}

# Generar Prisma client
Write-Host "Generando cliente Prisma..." -ForegroundColor Blue
npm run db:generate

# Aplicar esquema a la base de datos
Write-Host "Aplicando esquema a la base de datos..." -ForegroundColor Blue
npm run db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al conectar con la base de datos. Verifique DATABASE_URL en .env" -ForegroundColor Red
    exit 1
}

# Cargar datos de demostración
Write-Host "Cargando datos de demostracion..." -ForegroundColor Blue
npm run db:seed

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Instalacion completada exitosamente!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el servidor de desarrollo:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "La aplicacion estara disponible en:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Credenciales de acceso:" -ForegroundColor Cyan
Write-Host "  Super Admin: superadmin@gx.com.co / Admin123!" -ForegroundColor White
Write-Host "  Admin:       admin@gx.com.co / Admin123!" -ForegroundColor White
Write-Host "  Tecnico:     tecnico1@gx.com.co / Admin123!" -ForegroundColor White
Write-Host "  Cliente:     contacto@demo.com / Admin123!" -ForegroundColor White
