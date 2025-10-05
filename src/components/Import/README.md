# Data Import Feature - FinanceAI Pro

## Visão Geral

O módulo de importação de dados permite que os usuários importem transações financeiras de diversos formatos de arquivo, utilizando inteligência artificial para extrair e processar automaticamente os dados.

## Funcionalidades

### 1. Suporte a Múltiplos Formatos
- **CSV**: Arquivos de texto separados por vírgula
- **XLS/XLSX**: Planilhas do Microsoft Excel
- **PDF**: Extratos bancários e faturas em PDF (funcionalidade básica)

### 2. Extração Inteligente com IA
O sistema utiliza algoritmos de IA para:
- Detectar automaticamente colunas (data, valor, descrição, tipo)
- Converter formatos de data (DD/MM/YYYY, YYYY-MM-DD, etc.)
- Interpretar valores monetários (R$ 1.234,56 ou 1,234.56)
- Categorizar transações baseado na descrição
- Detectar tipo de transação (receita ou despesa)
- Calcular score de confiança para cada extração

### 3. Interface de Revisão
- Visualização tabular dos dados extraídos
- Edição manual de campos antes da importação
- Seleção/deseleção de transações
- Validação em tempo real
- Indicadores visuais de confiança

### 4. Validações
- Verificação de campos obrigatórios
- Validação de formatos de data
- Validação de valores numéricos
- Alertas para dados com baixa confiança
- Resumo de validação antes da importação

## Como Usar

### Passo 1: Upload do Arquivo
1. Clique no botão "Importar" no cabeçalho da aplicação
2. Selecione um arquivo CSV, XLS, XLSX ou PDF
3. Tamanho máximo: 10MB

### Passo 2: Revisão dos Dados
1. O sistema processará o arquivo e extrairá as transações
2. Revise os dados na tabela apresentada
3. Edite campos conforme necessário
4. Desmarque transações que não deseja importar
5. Verifique os indicadores de confiança

### Passo 3: Confirmação
1. Selecione a conta de destino
2. Revise o resumo da importação
3. Confirme a operação

### Passo 4: Resultado
1. Visualize o resultado da importação
2. Veja quantas transações foram importadas com sucesso
3. Identifique possíveis erros

## Formato de Arquivo Recomendado

### CSV/Excel
O arquivo deve conter colunas com os seguintes dados:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| Data | Data da transação | 15/01/2024 |
| Descrição | Descrição da transação | RESTAURANTE ABC |
| Valor | Valor da transação | 150,00 ou 150.00 |
| Tipo | Tipo de transação (opcional) | Débito/Crédito |

**Exemplo:**
```csv
Data,Descricao,Valor,Tipo
15/01/2024,RESTAURANTE PRIMO,150.50,Débito
16/01/2024,SALARIO JANEIRO,5000.00,Crédito
```

### Dicas
- Use cabeçalhos claros nas colunas
- Mantenha formato consistente de datas
- Evite células mescladas no Excel
- Remova linhas de totalização/resumo

## Categorização Automática

O sistema categoriza automaticamente as transações baseado em palavras-chave:

| Categoria | Palavras-chave |
|-----------|---------------|
| Alimentação | restaurante, mercado, supermercado, ifood, padaria |
| Transporte | uber, taxi, gasolina, posto, estacionamento |
| Compras | shopping, loja, magazine, mercado livre, amazon |
| Contas | luz, água, internet, telefone, celular |
| Saúde | farmácia, hospital, clínica, plano de saúde |
| Lazer | cinema, teatro, netflix, spotify |
| Salário | salário, pagamento, vencimento |

## Estrutura de Código

### Serviços
- **fileParser.js**: Parseia arquivos CSV, Excel e PDF
- **aiExtractor.js**: Extração inteligente e categorização
- **importService.js**: Orquestração do processo de importação

### Componentes
- **ImportModal.jsx**: Interface de usuário para importação

### Testes
- **fileParser.test.js**: Testes do parser de arquivos
- **aiExtractor.test.js**: Testes da extração com IA

## Extensibilidade

### Adicionar Novo Formato de Arquivo
1. Implemente parser em `fileParser.js`
2. Adicione extensão em `validateFile()`
3. Atualize a interface para aceitar o novo formato

### Adicionar Nova Categoria
1. Atualize `categorizeTransaction()` em `aiExtractor.js`
2. Adicione padrões de palavras-chave

### Melhorar Detecção de Campos
1. Atualize `FIELD_PATTERNS` em `aiExtractor.js`
2. Adicione novos keywords ou patterns

## Limitações Conhecidas

1. **PDF**: A extração de PDF é básica. Para melhor suporte, considere integração com pdf.js ou backend
2. **Idioma**: Otimizado para português brasileiro
3. **Categorização**: Baseada em regras simples, pode ser melhorada com ML
4. **Tamanho**: Limite de 10MB por arquivo

## Melhorias Futuras

- [ ] Integração com OCR para PDFs escaneados
- [ ] Machine Learning para categorização mais precisa
- [ ] Importação de múltiplos arquivos simultaneamente
- [ ] Templates para diferentes bancos/fontes
- [ ] Histórico de importações com possibilidade de desfazer
- [ ] Exportação de dados processados
- [ ] API para importação programática

## Suporte

Para problemas ou sugestões, abra uma issue no repositório.
