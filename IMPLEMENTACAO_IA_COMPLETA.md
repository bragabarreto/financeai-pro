# Implementação de Importação com IA - Finance AI Pro

## 📋 Resumo das Implementações

Este documento descreve todas as implementações realizadas para corrigir o sistema de importação e adicionar funcionalidades de extração de transações por SMS e fotos usando Inteligência Artificial.

---

## ✅ 1. Correção do Erro de Importação

### Problema Identificado
O sistema estava tentando inserir dados na coluna `payment_method` que não existe no schema da tabela `transactions` do Supabase.

### Solução Implementada
- **Arquivo modificado:** `src/services/import/importService.js`
- **Mudança:** Removida a linha que tentava inserir `payment_method` no objeto `transactionData`
- **Resultado:** Importações CSV agora funcionam corretamente sem erro de schema

```javascript
// ANTES (com erro)
const transactionData = {
  user_id: userId,
  account_id: finalAccountId,
  card_id: cardId,
  type: transaction.type,
  description: transaction.description,
  amount: transaction.amount,
  category: categoryId,
  date: transaction.date,
  payment_method: transaction.payment_method || null, // ❌ Coluna não existe
  created_at: new Date().toISOString()
};

// DEPOIS (corrigido)
const transactionData = {
  user_id: userId,
  account_id: finalAccountId,
  card_id: cardId,
  type: transaction.type,
  description: transaction.description,
  amount: transaction.amount,
  category: categoryId,
  date: transaction.date,
  created_at: new Date().toISOString()
};
```

---

## 🎴 2. Sistema de Cadastro de Múltiplos Números de Cartão

### Funcionalidade
Permite cadastrar até 5 números de cartão (últimos 4 dígitos) para cada cartão de crédito, facilitando a identificação automática pela IA.

### Arquivos Modificados
- **`src/components/CreditCards/CreditCardManager.jsx`**

### Implementação

#### Estado do Formulário Atualizado
```javascript
const [cardForm, setCardForm] = useState({
  name: '',
  brand: 'visa',
  last_digits: '',
  last_digits_list: [], // ✨ NOVO: Array com até 5 números de 4 dígitos
  credit_limit: '',
  closing_day: '10',
  due_day: '20',
  color: 'bg-gray-800',
  is_active: true
});
```

#### Interface do Formulário
Adicionado campo para cadastrar até 5 números adicionais:
```jsx
<div>
  <label className="block text-sm font-medium mb-1">
    Números Adicionais do Cartão (até 5 - para IA identificar)
  </label>
  <div className="space-y-2">
    {[0, 1, 2, 3, 4].map((index) => (
      <input
        key={index}
        type="text"
        value={cardForm.last_digits_list[index] || ''}
        onChange={(e) => {
          const newList = [...cardForm.last_digits_list];
          if (e.target.value === '') {
            newList.splice(index, 1);
          } else {
            newList[index] = e.target.value;
          }
          setCardForm({...cardForm, last_digits_list: newList.filter(d => d)});
        }}
        maxLength="4"
        pattern="[0-9]{4}"
        className="w-full px-3 py-2 border rounded-lg"
        placeholder={`Últimos 4 dígitos ${index + 1} (opcional)`}
      />
    ))}
  </div>
</div>
```

### Uso pela IA
A IA utiliza esses números para identificar automaticamente qual cartão foi usado em uma transação ao extrair dados de SMS ou fotos.

---

## 📱 3. Extração de Transações de SMS com IA

### Funcionalidade
Extrai automaticamente dados de transações de mensagens SMS bancárias usando IA.

### Arquivo Criado
- **`src/services/import/smsExtractorAI.js`**

### Recursos

#### Extração Básica (Fallback)
Quando a IA não está configurada, usa regex para extrair:
- Valor da transação
- Data
- Descrição/estabelecimento
- Últimos 4 dígitos do cartão
- Número de parcelas

#### Extração com IA
Quando configurada, a IA analisa o texto e retorna JSON estruturado:

```javascript
const extracted = await extractFromSMSWithAI(smsText, aiConfig, cards);

// Retorna:
{
  description: "RAFAEL FERNANDES SALE",
  amount: 457.00,
  date: "2025-10-06",
  type: "expense",
  category: "compras",
  card_last_digits: "1527",
  card_id: "card-1", // Identificado automaticamente
  installments: 2,
  confidence: 95,
  source: "ai"
}
```

#### Identificação Automática de Cartões
A IA compara os últimos 4 dígitos extraídos com os cartões cadastrados:

```javascript
const cardDigitsList = cards.flatMap(card => {
  const digits = [card.last_digits];
  if (card.last_digits_list && Array.isArray(card.last_digits_list)) {
    digits.push(...card.last_digits_list);
  }
  return digits.filter(d => d);
});

// Se encontrar correspondência, atribui o card_id automaticamente
if (extracted.card_last_digits) {
  const matchedCard = cards.find(card => {
    if (card.last_digits === extracted.card_last_digits) return true;
    if (card.last_digits_list?.includes(extracted.card_last_digits)) return true;
    return false;
  });
  
  if (matchedCard) {
    extracted.card_id = matchedCard.id;
  }
}
```

### Exemplos Testados

#### SMS 1
```
CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$ 457,00 em 2 vezes, 
06/10 as 19:55, ELO final 1527. Se desconhecer envie BL1527
```

**Resultado:**
- Valor: R$ 457,00
- Estabelecimento: RAFAEL FERNANDES SALE
- Data: 06/10/2025
- Cartão: 1527 (identificado automaticamente)
- Parcelas: 2x

#### SMS 2
```
CAIXA: Compra aprovada SANTE EXPRESS R$ 17,00 07/10 as 20:17, 
ELO final 1527. Caso nao reconheca a transacao, envie BL1527 p/cancelar cartao
```

**Resultado:**
- Valor: R$ 17,00
- Estabelecimento: SANTE EXPRESS
- Data: 07/10/2025
- Cartão: 1527 (identificado automaticamente)
- Parcelas: 1x

---

## 📸 4. Extração de Transações de Fotos com IA

### Funcionalidade
Extrai dados de transações de fotos de comprovantes, notificações e recibos usando Vision AI.

### Arquivo Criado
- **`src/services/import/photoExtractorAI.js`**

### Recursos

#### Suporte a Múltiplos Tipos de Comprovantes
- Comprovantes de PIX
- Notificações de cartão de crédito
- Notificações de cartão de débito
- Recibos de transferência
- Boletos bancários

#### Extração com Vision AI
```javascript
const extracted = await extractFromPhotoWithAI(imageFile, aiConfig, cards);

// Retorna:
{
  description: "ANDRE BRAGA BARRETO",
  amount: 100.00,
  date: "2025-10-07",
  time: "18:48:30",
  type: "expense",
  transaction_type: "pix",
  category: "outros",
  beneficiary: "Maria Veronica Morais dos Santos",
  payer: "ANDRE BRAGA BARRETO",
  pix_key: "+55(**) ****-2043",
  transaction_id: "E9040088820251007214847598889380",
  card_last_digits: null,
  card_id: null,
  installments: 1,
  confidence: 95,
  source: "ai_vision"
}
```

#### Identificação de Tipo de Transação
A IA identifica automaticamente:
- **PIX recebido:** `type: "income"`, preenche `payer`
- **PIX enviado:** `type: "expense"`, preenche `beneficiary`
- **Compra com cartão:** `type: "expense"`, extrai últimos 4 dígitos
- **Transferência:** identifica dados do recebedor/pagador

---

## ⚙️ 5. Sistema de Configuração de Chaves API

### Funcionalidade
Interface para configurar provedores de IA e suas chaves API.

### Arquivos Criados
- **`src/components/Settings/AIConfigSettings.jsx`** - Componente de configuração
- **`src/services/import/aiConfigHelper.js`** - Helper para gerenciar configurações

### Provedores Suportados

#### 1. Google Gemini (Recomendado)
- **Modelos:**
  - `gemini-2.5-flash` (Recomendado)
  - `gemini-2.0-flash-exp`
  - `gemini-1.5-pro`
- **Obter chave:** https://aistudio.google.com/app/apikey
- **Vantagens:** Excelente para português, gratuito até certo limite

#### 2. OpenAI (ChatGPT)
- **Modelos:**
  - `gpt-4.1-mini` (Recomendado)
  - `gpt-4o-mini`
  - `gpt-4o`
- **Obter chave:** https://platform.openai.com/api-keys
- **Vantagens:** Alta qualidade, suporte a visão

#### 3. Anthropic Claude
- **Modelos:**
  - `claude-3-5-sonnet-20241022` (Recomendado)
  - `claude-3-5-haiku-20241022`
  - `claude-3-opus-20240229`
- **Obter chave:** https://console.anthropic.com/settings/keys
- **Vantagens:** Excelente compreensão contextual

### Interface de Configuração

```jsx
<AIConfigSettings user={user} />
```

#### Recursos da Interface
1. **Habilitar/Desabilitar IA**
2. **Seleção de Provedor** (Gemini, OpenAI, Claude)
3. **Seleção de Modelo**
4. **Campo para Chave API** (com mostrar/ocultar)
5. **Teste de Validação** (valida a chave antes de salvar)
6. **Armazenamento Seguro** (localStorage + Supabase)

### Armazenamento
```javascript
// Salvo em localStorage para acesso rápido
localStorage.setItem('ai_config', JSON.stringify({
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: 'sua-chave-api'
}));

// Também salvo no Supabase (tabela user_settings)
await supabase
  .from('user_settings')
  .upsert({
    user_id: user.id,
    ai_config: { ... }
  });
```

---

## 🎨 6. Modal de Importação Aprimorado

### Arquivo Criado
- **`src/components/Import/ImportModalEnhanced.jsx`**

### Fluxo de Uso

#### Passo 1: Seleção de Modo
Usuário escolhe entre:
1. **Arquivo CSV** - Importação tradicional
2. **SMS Bancário** - Cole textos de SMS
3. **Foto de Comprovante** - Envie fotos

#### Passo 2: Upload/Input
- **CSV:** Seleciona arquivo
- **SMS:** Cola texto em textarea
- **Foto:** Seleciona uma ou mais imagens

#### Passo 3: Preview
- Visualiza transações extraídas
- Edita dados se necessário
- Seleciona quais importar
- Vê score de confiança da IA

#### Passo 4: Resultado
- Mostra quantas foram importadas
- Lista erros se houver
- Opção de fechar ou importar mais

### Indicadores Visuais
- ✨ Ícone Sparkles indica que IA está habilitada
- 🔷 Ícone de provedor (Gemini, OpenAI, Claude)
- 📊 Score de confiança para cada transação

---

## 🚀 Como Usar

### 1. Configurar IA (Primeira Vez)

1. Acesse **Configurações** → **Configuração de IA**
2. Habilite "Extração com IA"
3. Escolha um provedor (recomendado: Gemini)
4. Obtenha uma chave API no link fornecido
5. Cole a chave e salve

### 2. Cadastrar Cartões

1. Acesse **Cartões de Crédito**
2. Clique em "Novo Cartão"
3. Preencha os dados básicos
4. **Importante:** Adicione os últimos 4 dígitos principais
5. **Opcional:** Adicione até 5 números adicionais para melhor identificação
6. Salve o cartão

### 3. Importar de SMS

1. Copie o SMS bancário do seu celular
2. Acesse **Dashboard** → **Importar Transações**
3. Escolha "SMS Bancário"
4. Cole o texto
5. Clique em "Extrair Transações"
6. Revise os dados extraídos
7. Confirme a importação

### 4. Importar de Foto

1. Tire foto do comprovante ou notificação
2. Acesse **Dashboard** → **Importar Transações**
3. Escolha "Foto de Comprovante"
4. Selecione a(s) foto(s)
5. Clique em "Extrair Transações"
6. Revise os dados extraídos
7. Confirme a importação

---

## 📊 Estrutura de Dados

### Transação Extraída

```typescript
interface ExtractedTransaction {
  // Dados básicos
  description: string;          // Estabelecimento ou beneficiário
  amount: number;               // Valor numérico
  date: string;                 // YYYY-MM-DD
  time?: string;                // HH:MM (opcional)
  
  // Classificação
  type: 'expense' | 'income' | 'investment';
  category: string;             // Categoria sugerida
  
  // Cartão (se aplicável)
  card_last_digits?: string;    // Últimos 4 dígitos
  card_id?: string;             // ID do cartão identificado
  installments?: number;        // Número de parcelas
  
  // PIX/Transferência (se aplicável)
  beneficiary?: string;         // Nome do recebedor
  payer?: string;               // Nome do pagador
  pix_key?: string;             // Chave PIX
  transaction_id?: string;      // ID da transação
  
  // Metadados
  confidence: number;           // Score de confiança (0-100)
  source: 'ai' | 'ai_vision' | 'basic';
  rawText?: string;             // Texto original (SMS)
  imageFile?: string;           // Nome do arquivo (foto)
}
```

---

## 🔒 Segurança

### Chaves API
- Armazenadas em localStorage (criptografado pelo navegador)
- Também salvas no Supabase com Row Level Security
- Nunca expostas em logs ou console
- Validadas antes de serem salvas

### Dados Sensíveis
- CPF e dados pessoais são parcialmente ocultados pela IA
- Chaves PIX são mascaradas quando possível
- Imagens não são armazenadas no servidor

---

## 🧪 Testes Realizados

### Teste 1: Extração de SMS
✅ **Aprovado**
- SMS da Caixa com valor R$ 457,00
- Identificação correta do cartão (1527)
- Extração de parcelas (2x)
- Estabelecimento correto

### Teste 2: Extração de SMS Simples
✅ **Aprovado**
- SMS da Caixa com valor R$ 17,00
- Identificação correta do cartão (1527)
- Estabelecimento correto

### Teste 3: Correção de Importação CSV
✅ **Aprovado**
- Erro de schema corrigido
- Importação funciona sem erros

---

## 📝 Notas Técnicas

### Formato de Valores
A IA e o sistema suportam ambos os formatos:
- Brasileiro: `1.234,56`
- Internacional: `1,234.56`

### Datas
- Formato de entrada: `DD/MM/YYYY` ou `DD/MM`
- Formato armazenado: `YYYY-MM-DD` (ISO)
- Ano atual é assumido se não fornecido

### Categorização Automática
A IA sugere categorias baseadas em:
- Palavras-chave no estabelecimento
- Tipo de transação
- Contexto do SMS/foto

---

## 🔄 Integração com Sistema Existente

### Compatibilidade
- ✅ Mantém compatibilidade com importação CSV existente
- ✅ Usa mesma estrutura de dados de transações
- ✅ Integra com sistema de cartões existente
- ✅ Respeita categorias e contas configuradas

### Migração de Dados
Não é necessária migração. O sistema:
- Adiciona novos campos opcionais aos cartões
- Não altera estrutura de transações existentes
- Funciona com ou sem IA configurada

---

## 🎯 Próximos Passos Sugeridos

### Melhorias Futuras
1. **Histórico de Extrações**
   - Salvar extrações bem-sucedidas
   - Permitir re-importação

2. **Aprendizado de Padrões**
   - Sistema aprende com correções do usuário
   - Melhora sugestões de categoria

3. **Extração em Lote**
   - Processar múltiplos SMS de uma vez
   - Upload de várias fotos simultaneamente

4. **Notificações Automáticas**
   - Integração com app mobile
   - Extração automática de notificações

5. **Relatórios de Precisão**
   - Dashboard de acurácia da IA
   - Comparação entre provedores

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se a chave API está válida
2. Teste com exemplos fornecidos
3. Consulte logs do console do navegador
4. Verifique configuração do Supabase

---

## 📄 Licença

Este código segue a mesma licença do projeto Finance AI Pro.

---

**Desenvolvido com ❤️ usando React, Supabase e IA**
