# 🤖 Guia de Configuração de IA - FinanceAI Pro

**Data**: 13/10/2025  
**Problema**: Importação por foto não funciona (botão "Processar Foto" não faz nada)  
**Causa**: API keys de IA não configuradas no ambiente de produção

---

## 🔴 Problema Identificado

### Sintoma
- Foto é anexada com sucesso
- Preview da imagem aparece
- Botão "Processar Foto" não faz nada quando clicado
- Nenhum erro visível na interface

### Causa Raiz
O código verifica se há API keys configuradas antes de processar:

```javascript
// src/components/Import/ImportModal.jsx (linha 212-215)
if (!useAI || !isAIAvailable()) {
  setError('Extração de fotos requer IA configurada...');
  return;
}
```

**Problema**: Nenhuma API key está configurada no Vercel!

---

## ✅ Solução: Configurar API Keys no Vercel

### Opção 1: OpenAI (Recomendado)

**Vantagens**:
- Melhor precisão para OCR
- Modelo GPT-4 Vision para imagens
- Mais confiável

**Custo**: ~$0.01 por imagem processada

#### Passos:

1. **Obter API Key da OpenAI**:
   - Acesse: https://platform.openai.com/api-keys
   - Faça login
   - Clique "Create new secret key"
   - Copie a key (começa com `sk-...`)

2. **Configurar no Vercel**:
   ```
   1. Acesse: https://vercel.com/dashboard
   2. Selecione projeto: financeai-pro
   3. Settings → Environment Variables
   4. Clique "Add New"
   5. Name: REACT_APP_OPENAI_API_KEY
   6. Value: sk-... (cole sua key)
   7. Environments: Production, Preview, Development
   8. Clique "Save"
   ```

3. **Redeploy**:
   ```
   1. Deployments → Último deployment
   2. ... → Redeploy
   3. Aguarde 2-3 minutos
   ```

4. **Testar**:
   ```
   1. Acesse: https://financeai-pro.vercel.app
   2. Importar → Foto
   3. Anexar foto
   4. Clicar "Processar Foto"
   5. Aguardar IA processar
   6. ✅ Deve funcionar!
   ```

---

### Opção 2: Google Gemini

**Vantagens**:
- Gratuito (até certo limite)
- Boa precisão
- Fácil de configurar

**Custo**: Gratuito (60 requisições/minuto)

#### Passos:

1. **Obter API Key do Google**:
   - Acesse: https://makersuite.google.com/app/apikey
   - Faça login com Google
   - Clique "Create API Key"
   - Copie a key

2. **Configurar no Vercel**:
   ```
   Name: REACT_APP_GEMINI_API_KEY
   Value: (cole sua key)
   Environments: Production, Preview, Development
   ```

3. **Redeploy e Testar** (mesmos passos da Opção 1)

---

### Opção 3: Anthropic Claude

**Vantagens**:
- Excelente para análise de contexto
- Boa precisão

**Custo**: ~$0.008 por imagem

#### Passos:

1. **Obter API Key da Anthropic**:
   - Acesse: https://console.anthropic.com/
   - Faça login
   - API Keys → Create Key
   - Copie a key

2. **Configurar no Vercel**:
   ```
   Name: REACT_APP_ANTHROPIC_API_KEY
   Value: (cole sua key)
   Environments: Production, Preview, Development
   ```

3. **Redeploy e Testar** (mesmos passos da Opção 1)

---

## 📋 Variáveis de Ambiente Necessárias

### Para Funcionar (pelo menos 1):
- `REACT_APP_OPENAI_API_KEY` (Recomendado)
- `REACT_APP_GEMINI_API_KEY` (Gratuito)
- `REACT_APP_ANTHROPIC_API_KEY`

### Opcional (já configuradas):
- Supabase (já configurado)
- Outras variáveis do projeto

---

## 🧪 Como Testar se Funcionou

### Teste 1: Verificar Configuração

1. Acesse: https://financeai-pro.vercel.app
2. Abra Console do navegador (F12)
3. Digite: `localStorage.getItem('ai_config')`
4. Se retornar algo, IA está configurada

### Teste 2: Processar Foto

1. Importar → Foto
2. Anexar foto de comprovante
3. Clicar "Processar Foto"
4. **Esperado**:
   - Loading aparece
   - Mensagem "Processando com IA..."
   - Após 5-10 segundos, dados extraídos aparecem
   - Preview mostra: valor, descrição, data, estabelecimento

### Teste 3: Verificar Extração

Dados que devem ser extraídos da foto:
- ✅ Valor (R$ 562,93)
- ✅ Estabelecimento (MANUS AI)
- ✅ Data (13 out. 18:29)
- ✅ Cartão (UNIQUE INFINITE - Final 0405)
- ✅ Tipo (Crédito)

---

## 🔍 Troubleshooting

### Problema: Botão ainda não funciona

**Possíveis causas**:
1. API key não foi salva corretamente
2. Redeploy não foi feito
3. Cache do navegador

**Solução**:
```
1. Verificar se variável está no Vercel (Settings → Env Vars)
2. Fazer redeploy manual
3. Limpar cache do navegador (Ctrl+Shift+Delete)
4. Testar em modo anônimo
```

### Problema: Erro "API key inválida"

**Solução**:
```
1. Verificar se copiou a key completa
2. Verificar se a key não expirou
3. Gerar nova key
4. Atualizar no Vercel
5. Redeploy
```

### Problema: Erro "Quota exceeded"

**Solução**:
```
1. Se OpenAI: Adicionar créditos na conta
2. Se Gemini: Aguardar reset do limite (1 minuto)
3. Ou trocar para outro provider
```

---

## 💡 Recomendações

### Para Desenvolvimento
- Use **Gemini** (gratuito)
- Bom para testes

### Para Produção
- Use **OpenAI** (mais preciso)
- Configure billing alerts
- Monitore uso

### Para Economia
- Use **Gemini** primeiro (gratuito)
- Fallback para OpenAI se falhar
- Código já suporta múltiplos providers

---

## 📊 Comparação de Providers

| Provider | Custo | Precisão | Velocidade | Limite Gratuito |
|----------|-------|----------|------------|-----------------|
| OpenAI | $0.01/img | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $5 inicial |
| Gemini | Grátis | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 60 req/min |
| Claude | $0.008/img | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $5 inicial |

**Recomendação**: Comece com **Gemini** (gratuito) para testar!

---

## 🚀 Passo a Passo Rápido (Gemini - Gratuito)

```
1. https://makersuite.google.com/app/apikey
2. Create API Key
3. Copiar key
4. https://vercel.com/dashboard
5. financeai-pro → Settings → Environment Variables
6. Add: REACT_APP_GEMINI_API_KEY = (sua key)
7. Save
8. Deployments → ... → Redeploy
9. Aguardar 2-3 min
10. Testar: https://financeai-pro.vercel.app
```

**Tempo total**: 5 minutos  
**Custo**: R$ 0,00 (gratuito)

---

## ✅ Checklist de Configuração

- [ ] Obter API key (OpenAI/Gemini/Claude)
- [ ] Adicionar variável no Vercel
- [ ] Selecionar todos os environments
- [ ] Salvar variável
- [ ] Fazer redeploy
- [ ] Aguardar build completar (2-3 min)
- [ ] Limpar cache do navegador
- [ ] Testar importação por foto
- [ ] Verificar se dados são extraídos
- [ ] Confirmar que transação é criada

---

## 📞 Suporte

Se após seguir todos os passos ainda não funcionar:

1. Verifique logs no Vercel (Deployments → Logs)
2. Verifique console do navegador (F12)
3. Verifique se API key está ativa
4. Tente outro provider
5. Me avise para investigar mais profundamente

---

## 🎓 Informações Técnicas

### Como o Código Funciona

1. **Verificação** (`isAIAvailable()`):
   ```javascript
   return AI_CONFIG.openai.enabled || 
          AI_CONFIG.gemini.enabled || 
          AI_CONFIG.anthropic.enabled;
   ```

2. **Seleção de Provider**:
   - Tenta OpenAI primeiro
   - Se falhar, tenta Gemini
   - Se falhar, tenta Claude
   - Se todos falharem, mostra erro

3. **Processamento**:
   - Upload da imagem para IA
   - IA analisa e extrai dados
   - Retorna JSON estruturado
   - Preenche formulário automaticamente

### Arquivos Relacionados

- `src/services/import/aiService.js` - Configuração de IA
- `src/services/import/photoExtractorAI.js` - Extração de foto
- `src/components/Import/ImportModal.jsx` - Interface

---

## 📝 Resumo

**Problema**: Botão "Processar Foto" não funciona  
**Causa**: API keys não configuradas  
**Solução**: Configurar API key no Vercel  
**Tempo**: 5 minutos  
**Custo**: R$ 0 (Gemini) ou ~R$ 0,05/foto (OpenAI)  

**Recomendação**: Use **Gemini** (gratuito) para começar!

---

**Após configurar, a importação por foto funcionará perfeitamente!** 🎉

