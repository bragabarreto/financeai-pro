# Melhorias no Sistema de Importação

## Resumo das Mudanças

Este documento descreve as melhorias implementadas no sistema de importação do FinanceAI Pro conforme os requisitos especificados.

## 1. Identificação de Categorias - Nomenclatura Unificada

### Mudança
- **Antes**: Sistema usava "Despesa" e "Receita" 
- **Depois**: Sistema usa "Gasto" para despesas, mantendo "Receita" e "Investimento"

### Implementação
- Atualizado em `src/components/Import/ImportModal.jsx`
- Atualizado em `src/components/Modals/ImportModal.jsx`
- Atualizado nos exemplos de CSV

### Arquivos Modificados
```javascript
// Antes
<option value="expense">Despesa</option>

// Depois  
<option value="expense">Gasto</option>
```

## 2. Edição de Categoria no Preview

### Status
✅ **Já Implementado** - Funcionalidade já existia no sistema

### Como Funciona
- Usuário pode alterar o tipo (Gasto/Receita/Investimento) diretamente na tabela de preview
- Alterações são refletidas imediatamente
- Categorias são filtradas com base no tipo selecionado

## 3. Classificação do Meio de Pagamento

### Implementação
Sistema agora classifica e permite seleção de:

#### Para Gastos (expense):
- Cartão de Crédito → Seleciona cartão específico
- Cartão de Débito → Seleciona cartão específico
- PIX
- Transferência
- Conta Bancária → Seleciona conta específica
- Contracheque

#### Para Receitas (income):
- Crédito em Conta → Seleciona conta específica
- Crédito em Cartão → Seleciona cartão específico
- Contracheque
- PIX
- Transferência

#### Para Investimentos:
- Aplicação → Seleciona conta específica
- Resgate → Seleciona conta específica

### Nova Coluna na Tabela
Adicionada coluna "Conta/Cartão" que exibe:
- Dropdown de cartões quando meio de pagamento é cartão
- Dropdown de contas quando meio de pagamento é conta bancária ou investimento
- "N/A" para outros meios de pagamento

## 4. Edição de Variáveis no Preview

### Campos Editáveis
Todos os campos abaixo podem ser editados diretamente na tabela de preview:

1. **Data** - Input de data
2. **Descrição** - Campo de texto
3. **Valor** - Input numérico
4. **Tipo** - Dropdown (Gasto/Receita/Investimento)
5. **Categoria** - Texto informativo (já categorizado)
6. **Meio de Pagamento** - Dropdown dinâmico baseado no tipo
7. **Conta/Cartão** - Dropdown de contas ou cartões (NOVO)

### Como Funciona
```javascript
// Lógica de seleção de conta/cartão
{(transaction.payment_method === 'credit_card' || transaction.payment_method === 'debit_card') ? (
  // Mostra dropdown de cartões
  <select value={transaction.card_id}>
    {cards.map(card => <option value={card.id}>{card.name}</option>)}
  </select>
) : (transaction.payment_method === 'bank_account' || ...) ? (
  // Mostra dropdown de contas
  <select value={transaction.account_id}>
    {accounts.map(acc => <option value={acc.id}>{acc.name}</option>)}
  </select>
) : (
  <span>N/A</span>
)}
```

## Fluxo de Uso

### Passo 1: Upload do Arquivo
Usuário faz upload de arquivo CSV/Excel/PDF

### Passo 2: Processamento Automático
Sistema extrai e classifica automaticamente:
- Data
- Descrição
- Valor
- Tipo (expense/income/investment)
- Categoria sugerida
- Meio de pagamento detectado

### Passo 3: Preview e Edição
Usuário revisa e pode editar:
- ✏️ Tipo da transação (Gasto → Receita → Investimento)
- ✏️ Meio de pagamento
- ✏️ Conta ou cartão específico (NOVO)
- ✏️ Qualquer outro campo

### Passo 4: Confirmação e Importação
Sistema valida e importa as transações selecionadas

## Estrutura de Dados

### Transação com Novos Campos
```javascript
{
  date: '2024-01-01',
  description: 'Supermercado',
  amount: 150.00,
  type: 'expense',          // expense/income/investment
  category: 'alimentacao',
  payment_method: 'credit_card',  // Tipo de pagamento
  card_id: 'card123',            // ID do cartão (NOVO)
  account_id: null,              // OU ID da conta (NOVO)
  confidence: 85
}
```

## Props Atualizadas

### ImportModal
```javascript
<ImportModal
  show={showImportModal}
  onClose={() => setShowImportModal(false)}
  user={user}
  categories={categories}
  accounts={accounts}
  cards={cards}  // NOVO - necessário para seleção de cartões
/>
```

## Compatibilidade

### Backwards Compatibility
✅ Mudanças são retrocompatíveis:
- Cards prop é opcional (default: [])
- Sistema funciona sem cartões cadastrados
- Importações antigas continuam funcionando

### Testes
✅ Todos os testes existentes passam:
- 68 testes totais
- 67 passando
- 1 skipped (não relacionado)
- 0 falhando

## Exemplo de CSV Atualizado

```csv
Data,Descrição,Valor,Tipo
01/01/2024,Supermercado XYZ,150.00,gasto
02/01/2024,Salário,3000.00,receita
03/01/2024,Aplicação CDB,1000.00,investimento
```

## Notas Técnicas

### Detecção Automática
O sistema tenta detectar automaticamente:
1. **Tipo de transação** usando:
   - Campo "tipo" no arquivo
   - Palavras-chave (débito, crédito, aplicação, etc.)
   - Sinal do valor (negativo = gasto, positivo = receita)

2. **Meio de pagamento** usando:
   - Campo "meio de pagamento" no arquivo
   - Palavras-chave na descrição (pix, cartão, transferência, etc.)

3. **Categoria** usando:
   - Palavras-chave na descrição
   - Categorias existentes do usuário
   - Score de confiança

### Nível de Confiança
Sistema exibe nível de confiança da classificação:
- 🟢 Verde (≥80%): Alta confiança
- 🟡 Amarelo (50-79%): Média confiança  
- 🔴 Vermelho (<50%): Baixa confiança

## Benefícios para o Usuário

1. **Maior Precisão**: Seleção específica de conta/cartão evita erros
2. **Flexibilidade Total**: Todos os campos editáveis no preview
3. **Terminologia Clara**: "Gasto" é mais intuitivo que "Despesa"
4. **Workflow Eficiente**: Menos cliques para importar corretamente
5. **Transparência**: Usuário vê exatamente o que será importado

## Suporte

Para dúvidas ou problemas, consulte:
- IMPORT_GUIDE.md - Guia de uso da importação
- USAGE_EXAMPLES.md - Exemplos de uso
- TECHNICAL_SUMMARY.md - Detalhes técnicos
