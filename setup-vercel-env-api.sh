#!/bin/bash

# Script para Configurar Variáveis de Ambiente via API REST do Vercel
# Projeto: financeai-pro
# Requer: Token do Vercel

set -e

echo "🚀 Configuração via API REST - FinanceAI Pro"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configurações do projeto
VERCEL_TOKEN="x83ZAdS1yPsPGJjjVUiJ4Zhh"
PROJECT_ID="prj_6ARcM7ucLP1wsapgWfsvxIJUpZye"
TEAM_ID="team_2WKWoTdUV98pvXKyRkeKSDxw"

# Variáveis do Supabase
SUPABASE_URL="https://ubyvdvtlyhrmvplroiqf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjgxMzcsImV4cCI6MjA3NTAwNDEzN30.dgPykHdUGxe99FnImqphLnT-xV5VNwgnPZzmxhYw3dQ"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyODEzNywiZXhwIjoyMDc1MDA0MTM3fQ._wDxY3fDMXOTy0VTsDvuuLpygmN_mlWH228FmDuHl_8"

# Função para adicionar variável de ambiente
add_env_var() {
    local key=$1
    local value=$2
    local target=$3
    local type=$4
    
    echo "  → Adicionando: $key ($target)"
    
    local response=$(curl -s -X POST \
        "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
        -H "Authorization: Bearer ${VERCEL_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"key\": \"${key}\",
            \"value\": \"${value}\",
            \"type\": \"${type}\",
            \"target\": [\"${target}\"]
        }")
    
    if echo "$response" | grep -q '"error"'; then
        echo "    ⚠️  Erro ou já existe: $(echo $response | jq -r '.error.message // .error.code // "Unknown error"')"
    else
        echo "    ✅ Adicionada com sucesso!"
    fi
}

echo "📋 Configurando variáveis de ambiente..."
echo ""

# Variáveis para todos os ambientes
declare -a TARGETS=("production" "preview" "development")

for target in "${TARGETS[@]}"; do
    echo "🔧 Configurando para: $target"
    echo ""
    
    # Frontend (React)
    add_env_var "REACT_APP_SUPABASE_URL" "$SUPABASE_URL" "$target" "plain"
    add_env_var "REACT_APP_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "$target" "plain"
    
    # Backend (Serverless)
    add_env_var "SUPABASE_URL" "$SUPABASE_URL" "$target" "plain"
    add_env_var "SUPABASE_KEY" "$SUPABASE_ANON_KEY" "$target" "plain"
    add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$target" "secret"
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuração concluída!"
echo ""
echo "🔄 Fazendo redeploy..."
echo ""

# Trigger redeploy
DEPLOY_RESPONSE=$(curl -s -X POST \
    "https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"financeai-pro\",
        \"project\": \"${PROJECT_ID}\",
        \"target\": \"production\",
        \"gitSource\": {
            \"type\": \"github\",
            \"org\": \"bragabarreto\",
            \"repo\": \"financeai-pro\",
            \"ref\": \"main\"
        }
    }")

if echo "$DEPLOY_RESPONSE" | grep -q '"error"'; then
    echo "⚠️  Erro ao fazer redeploy automático"
    echo "   Por favor, faça o redeploy manualmente no dashboard"
else
    DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.id // .uid')
    DEPLOY_URL=$(echo "$DEPLOY_RESPONSE" | jq -r '.url')
    echo "✅ Redeploy iniciado!"
    echo "   Deployment ID: $DEPLOY_ID"
    echo "   URL: https://$DEPLOY_URL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Processo concluído!"
echo ""
echo "🔗 Acesse: https://financeai-pro.vercel.app"
echo "📊 Dashboard: https://vercel.com/dashboard"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
