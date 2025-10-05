# Sistema de Importação de Dados Financeiros

## Visão Geral

O FinanceAI Pro agora suporta importação inteligente de transações a partir de arquivos CSV, com categorização automática baseada em categorias existentes no banco de dados do usuário.

## Funcionalidades

### 1. Categorização Inteligente (aiExtractor.js)

O sistema analisa cada transação importada e sugere categorias com base em:
- **Categorias existentes do usuário**: Consulta o banco de dados para usar as categorias já cadastradas
- **Palavras-chave**: Identifica padrões comuns em descrições (ex: "uber", "restaurante", "salário")
- **Similaridade**: Calcula score de confiança baseado na semelhança entre descrição e categoria

#### Níveis de Confiança
- **Alta confiança (≥70%)**: Match forte entre descrição e categoria
- **Média confiança (40-69%)**: Match parcial, recomenda-se revisão
- **Baixa confiança (<40%)**: Sugestão incerta, edição manual necessária

### 2. Preview e Edição (ImportModal)

Antes de confirmar a importação, o usuário pode:
- ✅ Revisar todas as transações extraídas
- ✅ Editar categoria, descrição, valor, data e tipo
- ✅ Ver nível de confiança de cada sugestão
- ✅ Selecionar conta bancária para cada transação
- ✅ Remover transações indesejadas
- ✅ Confirmar ou cancelar a importação em lote

#### Indicadores Visuais
- **Fundo amarelo**: Categoria sugerida automaticamente
- **Fundo branco**: Categoria confirmada ou editada manualmente
- **Texto colorido**: Nível de confiança (verde=alta, amarelo=média, vermelho=baixa)

## Como Usar

### 1. Preparar o arquivo CSV

Crie um arquivo CSV com as seguintes colunas:
```csv
Data,Descrição,Valor,Tipo
01/01/2024,Supermercado Extra,345.67,despesa
02/01/2024,Salário,5000.00,receita
```

#### Formato das Colunas:
- **Data**: DD/MM/YYYY, YYYY-MM-DD ou DD-MM-YYYY
- **Descrição**: Texto descritivo da transação
- **Valor**: Número decimal (use ponto como separador)
- **Tipo**: `despesa`, `receita` ou `investimento`

### 2. Importar transações

1. Clique no botão **"Importar"** no header do aplicativo
2. Selecione o arquivo CSV
3. Clique em **"Processar Arquivo"**
4. Aguarde a análise e categorização automática

### 3. Revisar e editar

1. Revise as categorias sugeridas na tabela de preview
2. Edite qualquer campo conforme necessário
3. Selecione a conta bancária para cada transação
4. Remova transações indesejadas (botão X)

### 4. Confirmar importação

1. Verifique que todas as transações têm categoria e conta definidas
2. Clique em **"Confirmar Importação"**
3. As transações serão salvas no banco de dados

## Exemplo de Arquivo CSV

Um arquivo de exemplo está disponível em `exemplo-importacao.csv` na raiz do projeto.

## Testes Automatizados

O sistema inclui testes unitários completos:

### aiExtractor.test.js
- Extração de transações de CSV
- Consulta de categorias do banco de dados
- Categorização automática com score de confiança
- Tratamento de diferentes formatos de data
- Validação de dados inválidos

### ImportModal.test.jsx
- Renderização do modal
- Upload de arquivos
- Processamento e preview
- Edição inline de transações
- Validação antes de importação
- Indicadores de confiança

### Executar Testes
```bash
npm test
```

## Arquitetura

### Componentes

```
src/
├── services/
│   └── aiExtractor.js          # Serviço de extração e categorização
├── components/
│   └── Modals/
│       └── ImportModal.jsx     # Interface de importação
└── App.jsx                     # Integração principal
```

### Fluxo de Dados

1. **Upload**: Usuário seleciona arquivo CSV
2. **Extração**: `extractTransactionsFromFile()` parseia o CSV
3. **Categorização**: `categorizeTransactions()` sugere categorias
4. **Preview**: Modal exibe transações para revisão
5. **Confirmação**: `handleBulkImportTransactions()` salva no banco
6. **Atualização**: Interface recarrega transações e saldos

## Melhorias Futuras

- [ ] Suporte para formatos OFX e QIF
- [ ] Importação de anexos de email
- [ ] Machine Learning para melhorar sugestões
- [ ] Histórico de importações
- [ ] Deduplicação automática
- [ ] Templates de mapeamento personalizados

## Contribuindo

Para adicionar novos formatos de arquivo ou melhorar a categorização:
1. Edite `src/services/aiExtractor.js`
2. Adicione testes em `src/services/aiExtractor.test.js`
3. Execute `npm test` para validar
4. Envie um pull request

## Suporte

Para problemas ou dúvidas sobre a funcionalidade de importação, abra uma issue no GitHub.
