# 🚀 Guia Rápido - Importação com IA

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Configure a IA

1. Acesse: https://aistudio.google.com/app/apikey
2. Crie uma chave API do Google Gemini (gratuito)
3. No sistema, vá em **Configurações** → **Configuração de IA**
4. Habilite "Extração com IA"
5. Selecione "Google Gemini"
6. Escolha o modelo: **gemini-2.0-flash-exp** (recomendado)
7. Cole sua chave API
8. Clique em "Salvar Configuração"

### 2️⃣ Cadastre seus Cartões

1. Vá em **Cartões de Crédito**
2. Clique em "Novo Cartão"
3. Preencha:
   - Nome do cartão
   - Bandeira (Visa, Mastercard, ELO, etc.)
   - **Últimos 4 dígitos** (principal)
   - **Números adicionais** (até 5) - opcional mas recomendado
4. Salve

💡 **Dica:** Adicione todos os números de 4 dígitos que aparecem em SMS do seu cartão para melhor identificação.

### 3️⃣ Importe Transações

#### 📱 Por SMS

1. Copie o SMS bancário do celular
2. Vá em **Dashboard** → **Importar Transações**
3. Escolha "SMS Bancário"
4. Cole o texto
5. Clique em "Extrair Transações"
6. Revise e confirme

#### 📸 Por Foto

1. Tire foto do comprovante/notificação
2. Vá em **Dashboard** → **Importar Transações**
3. Escolha "Foto de Comprovante"
4. Selecione a foto
5. Clique em "Extrair Transações"
6. Revise e confirme

---

## 📋 Exemplos de SMS Suportados

### ✅ Compras com Cartão
```
CAIXA: Compra aprovada em LOJA XYZ R$ 100,00 em 2 vezes, 
08/10 as 14:30, ELO final 1527
```

### ✅ PIX Enviado
```
Você enviou um Pix de R$ 50,00 para João Silva em 08/10 às 10:15
```

### ✅ PIX Recebido
```
Você recebeu um Pix de R$ 200,00 de Maria Santos em 08/10 às 14:30
```

### ✅ Transferência
```
Transferência de R$ 500,00 para Conta 1234-5 em 08/10
```

---

## 📸 Tipos de Fotos Suportadas

- ✅ Notificações de compra no WhatsApp
- ✅ Comprovantes de PIX
- ✅ Notificações de cartão de crédito
- ✅ Notificações de cartão de débito
- ✅ Screenshots de apps bancários
- ✅ Fotos de recibos

---

## 🎯 Dicas para Melhor Precisão

### SMS
- ✅ Cole o texto completo do SMS
- ✅ Pode colar vários SMS de uma vez (separe com linha em branco)
- ✅ Funciona com SMS de qualquer banco brasileiro

### Fotos
- ✅ Tire foto com boa iluminação
- ✅ Certifique-se que o texto está legível
- ✅ Pode enviar várias fotos de uma vez
- ✅ Funciona com fotos ou screenshots

### Cartões
- ✅ Cadastre TODOS os números de 4 dígitos que aparecem nos seus SMS
- ✅ Alguns bancos usam números diferentes para o mesmo cartão
- ✅ Quanto mais números cadastrados, melhor a identificação

---

## ⚙️ Provedores de IA

### 🔷 Google Gemini (Recomendado)
- **Gratuito** até certo limite
- Excelente para português
- Modelos: gemini-2.0-flash-exp, gemini-2.5-flash
- Chave API: https://aistudio.google.com/app/apikey

### 🟢 OpenAI (ChatGPT)
- Pago por uso
- Alta qualidade
- Modelos: gpt-4.1-mini, gpt-4o-mini, gpt-4o
- Chave API: https://platform.openai.com/api-keys

### 🟣 Anthropic Claude
- Pago por uso
- Excelente compreensão contextual
- Modelos: claude-3-5-sonnet, claude-3-5-haiku
- Chave API: https://console.anthropic.com/settings/keys

---

## 🔧 Solução de Problemas

### "Configure a IA nas configurações"
➡️ Você precisa configurar uma chave API primeiro (veja passo 1)

### "API não retornou candidatos"
➡️ Verifique se sua chave API está válida
➡️ Tente usar outro modelo (gemini-2.0-flash-exp)

### "Não foi possível extrair transações"
➡️ Verifique se o texto/foto está legível
➡️ Tente com outro SMS/foto para testar
➡️ Verifique se a chave API tem créditos

### Cartão não identificado automaticamente
➡️ Cadastre os últimos 4 dígitos do cartão
➡️ Adicione números adicionais se o banco usar variações
➡️ Revise manualmente e selecione o cartão correto

---

## 📊 O que a IA Extrai Automaticamente

### De SMS
- ✅ Valor da transação
- ✅ Data e hora
- ✅ Estabelecimento/beneficiário
- ✅ Últimos 4 dígitos do cartão
- ✅ Número de parcelas
- ✅ Categoria sugerida
- ✅ Tipo (despesa/receita)

### De Fotos
- ✅ Valor da transação
- ✅ Data e hora
- ✅ Estabelecimento/beneficiário
- ✅ Tipo de transação (PIX, cartão, etc.)
- ✅ Últimos 4 dígitos do cartão
- ✅ Nome do pagador (PIX)
- ✅ Nome do recebedor (PIX)
- ✅ Chave PIX (se visível)
- ✅ ID da transação
- ✅ Categoria sugerida

---

## 💡 Casos de Uso

### 1. Controle Diário
- Recebeu SMS de compra? → Cole no sistema
- Viu notificação no WhatsApp? → Tire print e envie
- **Tempo:** ~10 segundos por transação

### 2. Importação em Lote
- Copie vários SMS de uma vez
- Ou envie várias fotos juntas
- Sistema processa tudo automaticamente
- **Tempo:** ~3 segundos por transação

### 3. Conciliação Bancária
- Compare extratos com transações importadas
- Identifique divergências rapidamente
- Cartões identificados automaticamente

---

## 🔒 Segurança

- ✅ Chave API armazenada localmente (navegador)
- ✅ Também salva no Supabase com segurança
- ✅ Nunca compartilhada com terceiros
- ✅ Imagens não são armazenadas no servidor
- ✅ Dados sensíveis mascarados pela IA

---

## 📈 Próximos Passos

Após dominar o básico:

1. **Explore Categorias**
   - Ajuste categorias sugeridas pela IA
   - Crie categorias personalizadas

2. **Configure Contas**
   - Associe transações a contas específicas
   - Configure conta padrão

3. **Analise Gastos**
   - Use relatórios para ver padrões
   - Identifique oportunidades de economia

4. **Automatize**
   - Configure importação recorrente
   - Integre com apps bancários

---

## 🆘 Precisa de Ajuda?

1. Consulte a documentação completa: `IMPLEMENTACAO_IA_COMPLETA.md`
2. Veja os testes realizados: `TESTES_REALIZADOS.md`
3. Verifique os logs no console do navegador (F12)
4. Entre em contato com o suporte

---

**Desenvolvido com ❤️ para facilitar seu controle financeiro**
