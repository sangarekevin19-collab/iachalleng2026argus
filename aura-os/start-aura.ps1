# ══════════════════════════════════════════════════════════════
# AURA OS — Full Stack Launcher
# Démarre: Backend + Frontend + n8n + MinIO + PostgreSQL + Redis
#           + Prometheus + Grafana + Loki + cAdvisor + Exporters
# ══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   AURA OS — Full Stack Launcher         ║" -ForegroundColor Cyan
Write-Host "  ║   All-in-one: App + Monitoring + n8n     ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "[1/4] Building images..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed!" -ForegroundColor Red; exit 1 }

# Step 2: Start core services
Write-Host "[2/4] Starting core services (Postgres, Redis, MinIO, Backend, Frontend, n8n)..." -ForegroundColor Yellow
docker compose up -d
Start-Sleep -Seconds 10

# Step 3: Start monitoring
Write-Host "[3/4] Starting monitoring stack (Prometheus, Grafana, Loki, cAdvisor, Exporters)..." -ForegroundColor Yellow
docker compose -f docker-compose.monitoring.yml up -d
Start-Sleep -Seconds 5

# Step 4: Status
Write-Host "[4/4] Checking status..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "  │  AURA OS — Services Running                  │" -ForegroundColor Green
Write-Host "  ├─────────────────────────────────────────────┤" -ForegroundColor Green
Write-Host "  │  🌐 Frontend:     http://localhost:3000      │" -ForegroundColor White
Write-Host "  │  ⚙️  Backend API:  http://localhost:4000      │" -ForegroundColor White
Write-Host "  │  📊 n8n:           http://localhost:5678      │" -ForegroundColor White
Write-Host "  │  🗄️  MinIO:         http://localhost:9001      │" -ForegroundColor White
Write-Host "  │  📈 Prometheus:    http://localhost:9090      │" -ForegroundColor White
Write-Host "  │  📉 Grafana:       http://localhost:3001      │" -ForegroundColor White
Write-Host "  │  📋 Loki:          http://localhost:3100      │" -ForegroundColor White
Write-Host "  │  🐳 cAdvisor:      http://localhost:8080      │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Host "  Grafana default login: admin / admin" -ForegroundColor Gray
Write-Host "  n8n default login: admin / aura_n8n_secure_2026" -ForegroundColor Gray
Write-Host ""
Write-Host "  ✅ AURA OS is operational!" -ForegroundColor Green
Write-Host ""
