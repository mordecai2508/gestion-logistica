#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno
# Ejecutar al inicio de cada sesión de trabajo.
# Si termina con exit code 0: el entorno está listo.
# Si falla: resolver el problema antes de tocar código.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

ok() { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  Sistema de Gestión de Logística y Envíos"
echo "  Verificación de entorno — $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Herramientas de entorno ──────────────────────
echo "── [1/6] Herramientas de entorno ──"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version)
  ok "Node.js: $NODE_VERSION"
else
  fail "Node.js no está instalado"
fi

if command -v npm &>/dev/null; then
  ok "npm: $(npm --version)"
else
  fail "npm no está instalado"
fi

if command -v npx &>/dev/null; then
  ok "npx disponible"
else
  fail "npx no disponible"
fi

echo ""

# ── 2. Estructura del arnés ─────────────────────────
echo "── [2/6] Estructura del arnés ──"

for f in AGENTS.md CHECKPOINTS.md CLAUDE.md feature_list.json; do
  [ -f "$f" ] && ok "$f existe" || fail "$f FALTA"
done

for f in docs/architecture.md docs/conventions.md docs/specs.md docs/verification.md docs/wireframe-reference.md; do
  [ -f "$f" ] && ok "$f existe" || fail "$f FALTA"
done

for f in progress/current.md progress/history.md; do
  [ -f "$f" ] && ok "$f existe" || fail "$f FALTA"
done

for f in .claude/agents/leader.md .claude/agents/spec_author.md .claude/agents/implementer.md .claude/agents/reviewer.md; do
  [ -f "$f" ] && ok "$f existe" || fail "$f FALTA"
done

echo ""

# ── 3. Regla: una sola feature in_progress ──────────
echo "── [3/6] Consistencia de feature_list.json ──"

if command -v node &>/dev/null && [ -f feature_list.json ]; then
  IN_PROGRESS=$(node -e "
    const f = require('./feature_list.json');
    const ip = f.features.filter(x => x.status === 'in_progress');
    console.log(ip.length + ' ' + ip.map(x => x.name).join(', '));
  " 2>/dev/null)
  COUNT=$(echo "$IN_PROGRESS" | cut -d' ' -f1)
  NAMES=$(echo "$IN_PROGRESS" | cut -d' ' -f2-)
  
  if [ "$COUNT" -eq 0 ]; then
    ok "Sin features in_progress (estado inicial)"
  elif [ "$COUNT" -eq 1 ]; then
    ok "Exactamente una feature in_progress: $NAMES"
  else
    fail "VIOLACIÓN: $COUNT features in_progress simultáneas: $NAMES"
  fi

  # Verificar specs para features sdd en spec_ready/in_progress/done
  node -e "
    const f = require('./feature_list.json');
    const needs = f.features.filter(x => x.sdd && ['spec_ready','in_progress','done'].includes(x.status));
    let allOk = true;
    needs.forEach(feat => {
      const dir = 'specs/' + feat.name;
      const fs = require('fs');
      ['requirements.md','design.md','tasks.md'].forEach(file => {
        const path = dir + '/' + file;
        if (!fs.existsSync(path)) {
          console.log('MISSING_SPEC:' + path);
          allOk = false;
        }
      });
    });
    if (allOk && needs.length > 0) console.log('SPECS_OK:' + needs.length);
    else if (needs.length === 0) console.log('SPECS_NONE');
  " 2>/dev/null | while IFS= read -r line; do
    if [[ "$line" == MISSING_SPEC:* ]]; then
      fail "Spec faltante: ${line#MISSING_SPEC:}"
    elif [[ "$line" == SPECS_OK:* ]]; then
      ok "Specs presentes para ${line#SPECS_OK:} feature(s) sdd activas"
    elif [[ "$line" == SPECS_NONE ]]; then
      ok "Sin features sdd activas aún"
    fi
  done
else
  warn "No se puede verificar feature_list.json (node o archivo no disponible)"
fi

echo ""

# ── 4. Backend ──────────────────────────────────────
echo "── [4/6] Backend ──"

if [ -d "backend" ]; then
  if [ -f "backend/package.json" ]; then
    ok "backend/package.json existe"
    if [ -d "backend/node_modules" ]; then
      ok "backend/node_modules instalado"
    else
      warn "backend/node_modules no existe — ejecutar: cd backend && npm install"
    fi
    if [ -f "backend/.env" ]; then
      ok "backend/.env existe"
    else
      warn "backend/.env no existe — copiar backend/.env.example y configurar"
    fi
    if [ -f "backend/prisma/schema.prisma" ]; then
      ok "schema.prisma existe"
    else
      warn "backend/prisma/schema.prisma no existe aún"
    fi
    
    if [ -d "backend/node_modules" ]; then
      echo -n "  Ejecutando lint backend... "
      if (cd backend && npm run lint --silent 2>/dev/null); then
        ok "lint backend: sin errores"
      else
        fail "lint backend: hay errores (ejecutar: cd backend && npm run lint)"
      fi
      
      echo -n "  Ejecutando tests backend... "
      if (cd backend && npm run test --silent 2>/dev/null); then
        ok "tests backend: todos verdes"
      else
        fail "tests backend: hay fallos (ejecutar: cd backend && npm run test)"
      fi
    else
      warn "Saltando lint/test de backend (node_modules no instalado)"
    fi
  else
    warn "backend/ existe pero no tiene package.json (boilerplate pendiente)"
  fi
else
  warn "backend/ no existe aún — pendiente de crear boilerplate"
fi

echo ""

# ── 5. Frontend ─────────────────────────────────────
echo "── [5/6] Frontend ──"

if [ -d "frontend" ]; then
  if [ -f "frontend/package.json" ]; then
    ok "frontend/package.json existe"
    if [ -d "frontend/node_modules" ]; then
      ok "frontend/node_modules instalado"
    else
      warn "frontend/node_modules no existe — ejecutar: cd frontend && npm install"
    fi
    if [ -f "frontend/.env" ]; then
      ok "frontend/.env existe"
    else
      warn "frontend/.env no existe — copiar frontend/.env.example y configurar"
    fi
    
    if [ -d "frontend/node_modules" ]; then
      echo -n "  Ejecutando lint frontend... "
      if (cd frontend && npm run lint --silent 2>/dev/null); then
        ok "lint frontend: sin errores"
      else
        fail "lint frontend: hay errores (ejecutar: cd frontend && npm run lint)"
      fi
      
      echo -n "  Ejecutando tests frontend... "
      if (cd frontend && npm run test --silent 2>/dev/null); then
        ok "tests frontend: todos verdes"
      else
        fail "tests frontend: hay fallos (ejecutar: cd frontend && npm run test)"
      fi
    else
      warn "Saltando lint/test de frontend (node_modules no instalado)"
    fi
  else
    warn "frontend/ existe pero no tiene package.json (boilerplate pendiente)"
  fi
else
  warn "frontend/ no existe aún — pendiente de crear boilerplate"
fi

echo ""

# ── 6. Resumen ──────────────────────────────────────
echo "── [6/6] Resumen ──"
echo ""

TOTAL=$((PASS+FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ Todo verde: $PASS/$TOTAL checks pasaron${NC}"
  echo ""
  echo "El entorno está listo. Abre AGENTS.md para empezar."
  exit 0
else
  echo -e "${RED}❌ $FAIL/$TOTAL checks fallaron${NC}"
  echo ""
  echo "Resuelve los errores antes de tocar código."
  exit 1
fi
