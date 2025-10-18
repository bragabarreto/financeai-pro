# Implementação de Restrição de Categorias na IA

## Objetivo

Garantir que a identificação de categorias pela IA use **somente** as categorias previamente registradas no aplicativo pelo usuário, seja para gastos, receitas ou investimentos.

## Problema Anterior

Antes desta implementação, os serviços de IA (extração de fotos, SMS e análise de transações) sugeriam categorias baseadas em uma lista fixa e pré-definida no código:
- `alimentacao`, `transporte`, `compras`, `saude`, `lazer`, `educacao`, `outros`, etc.

Isso causava problemas quando:
1. O usuário não tinha essas categorias cadastradas
2. O usuário tinha categorias personalizadas com nomes diferentes
3. A IA sugeria categorias que não existiam no sistema do usuário

## Solução Implementada

### 1. Atualização do `photoExtractorAI.js`

**Arquivo**: `src/services/import/photoExtractorAI.js`

**Mudanças**:
- Adicionado parâmetro `availableCategories` nas funções:
  - `extractFromPhotoWithAI(imageFile, aiConfig, cards, availableCategories)`
  - `extractMultipleFromPhotos(imageFiles, aiConfig, cards, availableCategories)`

- O prompt da IA agora inclui **apenas** as categorias cadastradas pelo usuário:
```javascript
const categoryNames = availableCategories.map(c => c.name).join(', ');
const categoryInstruction = categoryNames 
  ? `categoria sugerida (escolha APENAS entre as categorias cadastradas: ${categoryNames})`
  : `categoria sugerida (use "outros" se não houver categorias cadastradas)`;
```

- Instrução explícita no prompt:
```
A categoria DEVE ser escolhida SOMENTE entre as categorias cadastradas pelo usuário: ${categoryNames}
Se nenhuma categoria registrada se encaixar perfeitamente, escolha a mais próxima ou use "outros" se disponível
```

### 2. Atualização do `smsExtractorAI.js`

**Arquivo**: `src/services/import/smsExtractorAI.js`

**Mudanças**:
- Adicionado parâmetro `availableCategories` nas funções:
  - `extractFromSMSWithAI(smsText, aiConfig, cards, availableCategories)`
  - `extractMultipleFromText(text, aiConfig, cards, availableCategories)`

- O prompt da IA agora inclui **apenas** as categorias cadastradas:
```javascript
const categoryNames = availableCategories.map(c => c.name).join(', ');
const categoryInstruction = categoryNames 
  ? `categoria sugerida (escolha APENAS entre as categorias cadastradas: ${categoryNames})`
  : `categoria sugerida (use "outros" se não houver categorias cadastradas)`;
```

- Instrução explícita no prompt:
```
A categoria DEVE ser escolhida SOMENTE entre as categorias cadastradas pelo usuário: ${categoryNames}
```

- **Correção de bug**: Removida declaração duplicada da função `extractCardDigits`

### 3. Atualização do `aiService.js`

**Arquivo**: `src/services/import/aiService.js`

**Mudanças**:
- Removido fallback para categorias padrão hardcoded
- Se não há categorias disponíveis, a função retorna a transação sem modificações:
```javascript
if (!categoryNames) {
  console.warn('No categories available for AI enhancement');
  return transaction;
}
```

- Prompt atualizado com instrução clara:
```
IMPORTANT: You MUST select the category ONLY from the Available Categories list above. 
Do not suggest categories that are not in this list.

Available Categories: ${categoryNames}
```

- Campo de categoria na resposta JSON:
```
"category": "suggested category name (MUST be from Available Categories list)"
```

### 4. Atualização do `ImportModal.jsx`

**Arquivo**: `src/components/Import/ImportModal.jsx`

**Mudanças**:
- Atualizada a chamada para `extractFromPhoto` para passar as categorias:
```javascript
const categoryList = Object.values(categories.expense || [])
  .concat(Object.values(categories.income || []))
  .concat(Object.values(categories.investment || []));

const transaction = await extractFromPhoto(photoFile, aiConfig, cards, categoryList);
```

- O `paycheckExtractorAI` já estava implementado corretamente com suporte a categorias

### 5. Testes Atualizados

**Arquivos**:
- `src/services/import/__tests__/photoExtractorAI.test.js` - Atualizado para passar categorias
- `src/components/Import/__tests__/ImportModal.photoButton.test.jsx` - Atualizado para aceitar parâmetro de categorias
- `src/services/import/__tests__/categoryRestriction.test.js` - **NOVO**: Suite de testes específica para validar a restrição de categorias

**Testes implementados**:
1. ✅ Photo Extractor AI só sugere categorias da lista registrada
2. ✅ Photo Extractor AI não sugere categorias não registradas no prompt
3. ✅ SMS Extractor AI só sugere categorias da lista registrada
4. ✅ SMS Extractor AI instrui a IA para usar apenas categorias cadastradas
5. ✅ AI Service Enhancement verifica que o prompt contém apenas categorias registradas
6. ✅ AI Service retorna transação inalterada se não há categorias disponíveis

## Fluxo de Funcionamento

### Importação de Foto:
1. Usuário seleciona uma foto no ImportModal
2. ImportModal coleta todas as categorias cadastradas do usuário
3. Chama `extractFromPhoto` passando: foto, config IA, cartões, **categorias**
4. `extractFromPhoto` constrói o prompt incluindo apenas os nomes das categorias cadastradas
5. IA retorna sugestão de categoria (limitada às opções fornecidas)
6. Transação é mapeada para a categoria correspondente no banco de dados

### Importação de SMS:
1. Usuário cola texto de SMS no ImportModal
2. ImportModal coleta todas as categorias cadastradas do usuário
3. Sistema processa SMS (pode usar extrator básico ou com IA)
4. Se usar IA: `extractFromSMSWithAI` recebe as **categorias** disponíveis
5. Prompt é construído com apenas as categorias cadastradas
6. IA retorna sugestão de categoria (limitada às opções fornecidas)
7. Transação é mapeada para a categoria correspondente no banco de dados

### Importação de Arquivo CSV:
1. Arquivo é processado e transações extraídas
2. Sistema usa `enhanceTransactionsWithAI` se IA estiver disponível
3. Para cada transação, o prompt inclui **apenas** categorias cadastradas
4. IA sugere categoria da lista fornecida
5. Sistema mapeia sugestão para ID da categoria no banco de dados

## Benefícios

1. ✅ **Precisão**: IA só sugere categorias que existem no sistema do usuário
2. ✅ **Consistência**: Categorias sugeridas sempre correspondem às cadastradas
3. ✅ **Personalização**: Respeita a estrutura de categorias de cada usuário
4. ✅ **Sem erros**: Elimina sugestões de categorias inexistentes
5. ✅ **Flexibilidade**: Funciona com qualquer conjunto de categorias personalizadas

## Compatibilidade

✅ Todas as mudanças são **backward compatible**:
- Se categorias não forem passadas, o sistema funciona com fallback
- Testes existentes foram atualizados para refletir as novas assinaturas
- Nenhuma funcionalidade existente foi removida

## Teste Manual

Para testar a implementação:

1. **Cadastre categorias personalizadas** no aplicativo
2. **Importe uma foto** de comprovante:
   - Verifique que a categoria sugerida está entre suas categorias cadastradas
3. **Importe SMS** bancário:
   - Verifique que a categoria sugerida está entre suas categorias cadastradas
4. **Importe arquivo CSV**:
   - Verifique que todas as sugestões de categoria correspondem às cadastradas

## Arquivos Modificados

- ✅ `src/services/import/photoExtractorAI.js`
- ✅ `src/services/import/smsExtractorAI.js`
- ✅ `src/services/import/aiService.js`
- ✅ `src/components/Import/ImportModal.jsx`
- ✅ `src/services/import/__tests__/photoExtractorAI.test.js`
- ✅ `src/components/Import/__tests__/ImportModal.photoButton.test.jsx`
- ✅ `src/services/import/__tests__/categoryRestriction.test.js` (NOVO)

## Conclusão

A implementação garante que a IA respeite as categorias registradas pelo usuário, melhorando a precisão e evitando sugestões de categorias inexistentes. Todos os pontos de entrada de IA (foto, SMS, análise de transações) agora recebem e usam apenas as categorias cadastradas.
