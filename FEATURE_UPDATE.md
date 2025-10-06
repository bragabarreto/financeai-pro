# Atualização do Sistema de Importação de Transações Financeiras

## Visão Geral

O sistema de importação e processamento de dados financeiros foi atualizado para atender aos novos requisitos de identificação de tipos de transação, meios de pagamento, e edição aprimorada no preview.

## Novas Funcionalidades

### 1. Identificação do Tipo de Transação

As transações agora são classificadas em três categorias:

#### **Despesa**
- Transação padrão quando o usuário é o pagador
- Detectada por palavras-chave: "débito", "saída", "despesa", "gasto"
- Detectada quando o valor é negativo

#### **Receita**
- Quando o usuário é identificado como beneficiário
- Detectada por palavras-chave: "crédito", "entrada", "receita"
- Detectada quando o usuário aparece no campo de beneficiário

#### **Investimento**
- Quando o usuário é tanto depositante quanto beneficiário
- Detectada por palavras-chave: "investimento", "aplicação", "resgate"
- Detectada quando o usuário aparece em ambos os campos (depositante e beneficiário)

### 2. Identificação do Meio de Pagamento

#### Para Despesas:
- **Cartão de Crédito**: Selecionar entre cartões cadastrados
- **Cartão de Débito**: Selecionar entre contas bancárias cadastradas
- **PIX**: Selecionar entre contas bancárias cadastradas
- **Transferência Bancária**: TED/DOC entre contas bancárias
- **Conta Bancária**: Débito direto em conta
- **Contracheque**: Desconto em folha de pagamento

#### Para Receitas:
- **Crédito em Conta**: Selecionar entre contas bancárias cadastradas
- **Crédito em Cartão de Crédito**: Selecionar entre cartões cadastrados
- **PIX**: Recebimento via PIX
- **Transferência**: Recebimento via TED/DOC
- **Contracheque**: Recebimento de salário

#### Para Investimentos:
- **Aplicação**: Selecionar conta de origem e investimento de destino
- **Resgate**: Selecionar investimento de origem e conta de destino

### 3. Extração Automática por IA

A inteligência artificial foi aprimorada para identificar automaticamente:

#### Detecção de Tipo de Transação
- Analisa campos de beneficiário e depositante
- Identifica padrões em descrições
- Verifica palavras-chave específicas
- Considera o sinal do valor (positivo/negativo)

#### Detecção de Meio de Pagamento
- Verifica colunas específicas de método de pagamento
- Analisa descrições da transação para identificar padrões
- Detecta automaticamente: PIX, cartões, transferências, etc.
- Adaptável ao tipo de transação detectado

#### Score de Confiança
O sistema calcula um score de confiança (0-100%) baseado em:
- Data válida: +25 pontos
- Valor válido: +25 pontos
- Descrição presente: +20 pontos
- Tipo detectado: +15 pontos
- Categoria detectada: +10 pontos
- Meio de pagamento detectado: +5 pontos

### 4. Edição no Preview

#### Edição Individual
Todos os campos podem ser editados diretamente na tabela de preview:
- **Data**: Seletor de data
- **Descrição**: Campo de texto livre
- **Valor**: Campo numérico
- **Tipo**: Lista suspensa (Despesa/Receita/Investimento)
- **Meio de Pagamento**: Lista suspensa contextual (opções mudam conforme o tipo)

#### Edição em Lote
Nova funcionalidade permite editar múltiplas transações simultaneamente:

1. **Selecionar Transações**:
   - Use os checkboxes individuais
   - Ou clique em "Selecionar Todas"

2. **Ativar Edição em Lote**:
   - Clique no botão "Edição em Lote"
   - Painel roxo aparecerá com opções

3. **Aplicar Alterações**:
   - Escolha o campo a editar (Tipo ou Meio de Pagamento)
   - Selecione o novo valor
   - Clique em "Aplicar"
   - As alterações serão aplicadas a todas as transações selecionadas

#### Meio de Pagamento Contextual
As opções de meio de pagamento mudam automaticamente conforme o tipo da transação:
- **Despesa**: Mostra opções de débito (cartões, PIX, transferência)
- **Receita**: Mostra opções de crédito (contas, cartões)
- **Investimento**: Mostra opções específicas (aplicação, resgate)

### 5. Ajustes nas Variáveis de Registro

#### Novos Campos nas Transações
```javascript
{
  type: 'expense' | 'income' | 'investment',
  payment_method: 'credit_card' | 'debit_card' | 'pix' | 'transfer' | 'bank_account' | 'paycheck' | 'application' | 'redemption',
  beneficiary: String,  // Armazenado em metadata
  depositor: String,    // Armazenado em metadata
  metadata: {
    imported: true,
    confidence: Number,
    original_category: String,
    import_date: String,
    beneficiary: String,
    depositor: String
  }
}
```

#### Cálculo de Saldo Atualizado
- **Receitas**: Aumentam o saldo (+)
- **Despesas**: Diminuem o saldo (-)
- **Investimentos**: Diminuem o saldo (-), pois o dinheiro sai da conta

## Interface do Usuário

### Tela de Preview
A tabela de preview agora inclui:
- Coluna "Meio Pgto." com dropdown contextual
- Badge de confiança colorido (verde ≥80%, amarelo ≥50%, vermelho <50%)
- Botões de ação: Selecionar Todas, Edição em Lote

### Painel de Edição em Lote
- Fundo roxo claro para destaque
- Três colunas: Campo, Valor, Ação
- Desabilitado quando nenhum campo/valor selecionado
- Feedback visual do número de transações selecionadas

### Resumo da Importação
Agora mostra 4 categorias:
- **Receitas**: Quantidade em verde
- **Despesas**: Quantidade em vermelho
- **Investimentos**: Quantidade em roxo
- **Valor Total**: Calculado considerando todos os tipos

## Compatibilidade

### Formatos de Arquivo Suportados
- CSV
- Excel (XLS, XLSX)
- PDF (com extração de texto)

### Formatos de Data Aceitos
- DD/MM/YYYY
- DD-MM-YYYY
- YYYY-MM-DD

### Formatos de Valor Aceitos
- Formato brasileiro: 1.234,56
- Formato americano: 1,234.56
- Com símbolos: R$ 1.234,56
- Negativos: -123,45 ou (123,45)

## Testes

### Cobertura de Testes
- 50 testes automatizados
- 100% de sucesso
- Cobertura inclui:
  - Detecção de tipos de transação
  - Detecção de meios de pagamento
  - Cálculo de confiança
  - Validação de dados
  - Parsing de arquivos

### Exemplos de Teste
```javascript
// Detectar investimento
detectTransactionType('investimento', 100) // => 'investment'

// Detectar meio de pagamento
detectPaymentMethod('PIX', '', 'expense') // => 'pix'

// Confiança completa
calculateConfidence({
  date: '2024-01-15',
  amount: 100,
  description: 'Test',
  type: 'expense',
  category: 'alimentacao',
  payment_method: 'credit_card'
}) // => 100
```

## Exemplos de Uso

### Exemplo 1: Importar Despesas
```
Data        | Descrição              | Valor   | Tipo    | Meio
15/01/2024  | RESTAURANTE XYZ       | 150,00  | Despesa | Cartão de Crédito
16/01/2024  | UBER VIAGEM           | 45,50   | Despesa | PIX
```

### Exemplo 2: Importar Receitas
```
Data        | Descrição              | Valor     | Tipo    | Meio
20/01/2024  | PAGAMENTO SALARIO     | 5.000,00  | Receita | Contracheque
25/01/2024  | FREELANCE PROJETO     | 1.500,00  | Receita | PIX
```

### Exemplo 3: Importar Investimentos
```
Data        | Descrição              | Valor     | Tipo         | Meio
05/01/2024  | APLICACAO CDB         | 2.000,00  | Investimento | Aplicação
15/02/2024  | RESGATE TESOURO       | 1.500,00  | Investimento | Resgate
```

## Melhorias Futuras Sugeridas

1. **Integração com Contas e Cartões**
   - Vincular meio de pagamento a contas/cartões específicos
   - Validar existência de conta/cartão antes de importar

2. **Sugestões Inteligentes**
   - Aprender com importações anteriores
   - Sugerir categorias baseadas em histórico

3. **Regras Personalizadas**
   - Criar regras de categorização personalizadas
   - Aplicar regras automaticamente na importação

4. **Validação Avançada**
   - Detectar duplicatas
   - Alertar sobre valores suspeitos
   - Validar consistência de datas

## Suporte

Para dúvidas ou problemas:
1. Verifique se o arquivo está no formato correto
2. Confirme se as colunas estão nomeadas adequadamente
3. Revise o preview antes de importar
4. Use a edição em lote para correções rápidas
5. Verifique o score de confiança das transações

## Changelog

### Versão 2.1.0 (Atual)
- ✅ Suporte a tipo "Investimento"
- ✅ Detecção automática de meio de pagamento
- ✅ Edição em lote no preview
- ✅ Campos contextuais para meio de pagamento
- ✅ Score de confiança aprimorado
- ✅ 50 testes automatizados
- ✅ Resumo com investimentos

### Versão 2.0.0
- Importação de CSV, Excel e PDF
- Detecção automática de campos
- Preview editável
- Categorização inteligente
