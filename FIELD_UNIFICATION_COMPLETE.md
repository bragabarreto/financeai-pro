# Unificação de Campos - Importação e Registro Manual

## Problema Identificado

O sistema FinanceAI Pro apresentava inconsistência entre os campos disponíveis na importação de transações (via arquivos CSV/Excel/PDF e SMS) e o registro manual de transações.

### Campos Faltando no Registro Manual (TransactionModal):
- ❌ `payment_method` (meio de pagamento)
- ❌ `card_id` (vinculação com cartões de crédito)
- ❌ Lógica para alternar entre conta bancária e cartão

### Campos Faltando na Importação (ImportModal):
- ❌ `is_alimony` (marcação de pensão alimentícia)

### Nomenclatura Inconsistente:
- ❌ TransactionModal usava "Despesa" enquanto ImportModal usava "Gasto"

## Solução Implementada

### 1. TransactionModal.jsx - Registro Manual

#### Antes:
```javascript
const TransactionModal = ({ show, onClose, onSave, transaction, categories, accounts }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    category: '',
    account_id: '',  // APENAS CONTA
    date: new Date().toISOString().split('T')[0],
    origin: '',
    is_alimony: false
  });
  // ...
  // Formulário tinha apenas:
  // - Tipo (Despesa/Receita/Investimento)
  // - Descrição
  // - Valor
  // - Categoria
  // - Conta (sem opção de cartão!)
  // - Data
}
```

#### Depois:
```javascript
const TransactionModal = ({ show, onClose, onSave, transaction, categories, accounts, cards = [] }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    category: '',
    account_id: '',
    card_id: '',           // ✅ NOVO
    payment_method: '',    // ✅ NOVO
    date: new Date().toISOString().split('T')[0],
    origin: '',
    is_alimony: false
  });
  // ...
  // Formulário agora tem:
  // - Tipo (Gasto/Receita/Investimento) ✅ Nomenclatura corrigida
  // - Descrição
  // - Valor
  // - Categoria
  // - Meio de Pagamento ✅ NOVO
  //   - Para Gastos: Cartão de Crédito, Cartão de Débito, PIX, Transferência, Contracheque
  //   - Para Receitas: Transferência, PIX, Crédito em Cartão, Contracheque
  //   - Para Investimentos: Aplicação, Resgate
  // - Forma de Pagamento (condicional) ✅ NOVO
  //   - Se meio = Cartão de Crédito → Seletor de Cartões
  //   - Se meio = outros → Seletor de Contas Bancárias
  // - Data
  // - Pensão Alimentícia (checkbox para gastos)
}
```

#### Validações Adicionadas:
```javascript
// Validação do meio de pagamento
if (!formData.payment_method) {
  setError('Selecione o meio de pagamento');
  return;
}

// Validação de cartão quando necessário
if (formData.payment_method === 'credit_card' && !formData.card_id) {
  setError('Selecione um cartão de crédito');
  return;
}

// Validação de conta quando necessário
if (['debit_card', 'pix', 'transfer', 'application', 'redemption', 'paycheck']
    .includes(formData.payment_method) && !formData.account_id) {
  setError('Selecione uma conta bancária');
  return;
}
```

### 2. ImportModal.jsx - Importação

#### Antes:
```javascript
// Tabela de preview tinha colunas:
// - [ ] Checkbox
// - Data
// - Descrição
// - Valor
// - Tipo
// - Categoria
// - Meio Pgto.
// - Forma de Pagamento
// - Confiança
// - [X] Deletar

// SEM coluna de Pensão Alimentícia
```

#### Depois:
```javascript
// Tabela de preview agora tem colunas:
// - [ ] Checkbox
// - Data
// - Descrição
// - Valor
// - Tipo
// - Categoria
// - Meio Pgto.
// - Forma de Pagamento
// - Pensão ✅ NOVO (checkbox para gastos)
// - Confiança
// - [X] Deletar

// Inicialização do campo:
transactions = transactions.map(t => ({
  ...t,
  confidence: calculateSMSConfidence(t),
  selected: true,
  is_alimony: false  // ✅ NOVO
}));
```

### 3. App.jsx

#### Antes:
```javascript
<TransactionModal
  show={showTransactionModal}
  onClose={...}
  onSave={handleSaveTransaction}
  transaction={editingTransaction}
  categories={[...categories.expense, ...categories.income, ...categories.investment]}
  accounts={accounts}
  // FALTANDO cards!
/>
```

#### Depois:
```javascript
<TransactionModal
  show={showTransactionModal}
  onClose={...}
  onSave={handleSaveTransaction}
  transaction={editingTransaction}
  categories={[...categories.expense, ...categories.income, ...categories.investment]}
  accounts={accounts}
  cards={cards}  // ✅ NOVO
/>
```

## Estrutura de Dados Unificada

Agora todas as transações, independentemente da forma de entrada (manual, CSV, SMS), têm a mesma estrutura:

```javascript
{
  id: string,                    // Gerado pelo Supabase
  user_id: string,               // ID do usuário
  type: string,                  // 'expense' | 'income' | 'investment'
  description: string,           // Descrição da transação
  amount: number,                // Valor
  category: string,              // ID da categoria
  date: string,                  // Data (YYYY-MM-DD)
  payment_method: string,        // 'credit_card' | 'debit_card' | 'pix' | 'transfer' | etc.
  card_id: string | null,        // ID do cartão (se payment_method = credit_card)
  account_id: string | null,     // ID da conta (se payment_method != credit_card)
  is_alimony: boolean,           // true se é pensão alimentícia (apenas expense)
  origin: string,                // Origem da transação
  created_at: timestamp          // Data de criação
}
```

## Fluxo de Uso

### Registro Manual de Gasto com Cartão de Crédito:
1. Clicar em "Nova Transação"
2. Selecionar Tipo: **Gasto**
3. Preencher Descrição e Valor
4. Selecionar Categoria
5. Selecionar Meio de Pagamento: **Cartão de Crédito**
6. ✅ Sistema mostra seletor de cartões
7. Selecionar o cartão específico
8. Selecionar Data
9. ✅ (Opcional) Marcar como Pensão Alimentícia
10. Salvar

### Registro Manual de Receita via PIX:
1. Clicar em "Nova Transação"
2. Selecionar Tipo: **Receita**
3. Preencher Descrição e Valor
4. Selecionar Categoria
5. Selecionar Meio de Pagamento: **PIX**
6. ✅ Sistema mostra seletor de contas bancárias
7. Selecionar a conta
8. Selecionar Data
9. Salvar

### Importação via SMS:
1. Clicar em "Importar"
2. Selecionar modo "SMS/Texto"
3. Colar notificação bancária
4. Clicar em "Processar SMS"
5. ✅ Revisar preview com todas as colunas:
   - Data, Descrição, Valor, Tipo, Categoria
   - Meio de Pagamento, Forma de Pagamento
   - ✅ **Pensão** (checkbox editável)
   - Confiança
6. Editar se necessário
7. Confirmar importação

## Benefícios

✅ **Consistência Total**: Mesmos campos em importação e registro manual
✅ **Rastreamento Completo**: Todas as transações têm meio de pagamento e vinculação
✅ **Suporte a Cartões**: Agora é possível registrar manualmente transações em cartão de crédito
✅ **Pensão Alimentícia**: Pode ser marcada tanto em importação quanto em registro manual
✅ **Nomenclatura Unificada**: "Gasto" em vez de "Despesa" em todo o sistema
✅ **Validações Robustas**: Garante que todas as transações tenham as informações necessárias
✅ **Experiência do Usuário**: Interface consistente e intuitiva

## Arquivos Modificados

1. `src/components/Modals/TransactionModal.jsx`
   - Adicionados campos `payment_method`, `card_id`
   - Adicionada lógica condicional de renderização
   - Adicionadas validações
   - Corrigida nomenclatura

2. `src/components/Import/ImportModal.jsx`
   - Adicionada coluna "Pensão" na tabela
   - Adicionado checkbox `is_alimony`
   - Inicialização do campo em SMS e arquivo

3. `src/App.jsx`
   - Passado prop `cards` para TransactionModal

## Testes

✅ Build bem-sucedido sem erros de compilação
✅ 9 testes do ImportModal passando
✅ 99 testes dos serviços de importação passando
✅ Nenhuma quebra de funcionalidade existente

## Conclusão

A unificação de campos foi implementada com sucesso, garantindo que:
- Todas as transações têm a mesma estrutura de dados
- Não há mais incompatibilidades entre importação e registro manual
- O sistema está preparado para rastreamento completo de todas as transações
- A experiência do usuário é consistente em todos os fluxos de entrada de dados
