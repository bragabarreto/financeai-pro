#!/bin/bash

# Script Automatizado para Configurar Variáveis de Ambiente no Vercel
# Projeto: financeai-pro
# Requer: Vercel CLI instalado (npm i -g vercel)

set -e

echo "🚀 Configuração Automatizada de Variáveis de Ambiente - FinanceAI Pro"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado!"
    echo ""
    echo "Por favor, instale o Vercel CLI:"
    echo "  npm i -g vercel"
    echo ""
    echo "Ou use o método manual descrito em CONFIGURACAO_VERCEL.md"
    exit 1
fi

echo "✅ Vercel CLI encontrado!"
echo ""

# Variáveis do Supabase
SUPABASE_URL="https://ubyvdvtlyhrmvplroiqf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjgxMzcsImV4cCI6MjA3NTAwNDEzN30.dgPykHdUGxe99FnImqphLnT-xV5VNwgnPZzmxhYw3dQ"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyODEzNywiZXhwIjoyMDc1MDA0MTM3fQ._wDxY3fDMXOTy0VTsDvuuLpygmN_mlWH228FmDuHl_8"

echo "📋 Configurando variáveis de ambiente..."
echo ""

# Função para adicionar variável
add_env_var() {
    local name=$1
    local value=$2
    local target=$3
    
    echo "  → Adicionando: $name ($target)"
    vercel env add "$name" "$target" <<EOF
$value
EOF
}

echo "🔧 Configurando variáveis para PRODUCTION..."
echo ""

# Production
add_env_var "REACT_APP_SUPABASE_URL" "$SUPABASE_URL" "production"
add_env_var "REACT_APP_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "production"
add_env_var "SUPABASE_URL" "$SUPABASE_URL" "production"
add_env_var "SUPABASE_KEY" "$SUPABASE_ANON_KEY" "production"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "production"

echo ""
echo "🔧 Configurando variáveis para PREVIEW..."
echo ""

# Preview
add_env_var "REACT_APP_SUPABASE_URL" "$SUPABASE_URL" "preview"
add_env_var "REACT_APP_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "preview"
add_env_var "SUPABASE_URL" "$SUPABASE_URL" "preview"
add_env_var "SUPABASE_KEY" "$SUPABASE_ANON_KEY" "preview"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "preview"

echo ""
echo "🔧 Configurando variáveis para DEVELOPMENT..."
echo ""

# Development
add_env_var "REACT_APP_SUPABASE_URL" "$SUPABASE_URL" "development"
add_env_var "REACT_APP_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "development"
add_env_var "SUPABASE_URL" "$SUPABASE_URL" "development"
add_env_var "SUPABASE_KEY" "$SUPABASE_ANON_KEY" "development"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "development"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Variáveis de ambiente configuradas com sucesso!"
echo ""
echo "🔄 Fazendo redeploy do projeto..."
echo ""

# Redeploy
vercel --prod

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Configuração concluída!"
echo ""
echo "✅ Variáveis configuradas: 5 variáveis x 3 ambientes = 15 configurações"
echo "✅ Redeploy iniciado"
echo ""
echo "🔗 Acesse: https://financeai-pro.vercel.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
