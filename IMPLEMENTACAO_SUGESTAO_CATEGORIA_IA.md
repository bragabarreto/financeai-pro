# Implementação de Sugestão de Categoria por IA

## Data: 13 de outubro de 2025

## Objetivo

Implementar sugestão automática de categoria por IA quando o usuário digita a descrição de uma transação manual no TransactionModal.

## Situação Atual

- ✅ Função `enhanceTransactionWithAI` já existe em `src/services/import/aiService.js`
- ✅ Função funciona e sugere categoria baseada em descrição
- ❌ Função NÃO está sendo usada no TransactionModal
- ❌ Usuário precisa selecionar categoria manualmente

## Implementação Necessária

### 1. Adicionar Import no TransactionModal

```javascript
import { enhanceTransactionWithAI, isAIAvailable } from '../../services/import/aiService';
```

### 2. Adicionar Estado para Sugestão de IA

```javascript
const [aiSuggestion, setAiSuggestion] = useState(null);
const [loadingAI, setLoadingAI] = useState(false);
```

### 3. Criar Função para Buscar Sugestão

```javascript
const fetchAISuggestion = async (description) => {
  if (!description || description.length < 3) {
    setAiSuggestion(null);
    return;
  }

  if (!isAIAvailable()) {
    return; // Não fazer nada se IA não disponível
  }

  setLoadingAI(true);
  
  try {
    const tempTransaction = {
      description,
      amount: formData.amount,
      type: formData.type,
      payment_method: formData.payment_method
    };

    const enhanced = await enhanceTransactionWithAI(
      tempTransaction,
      categories,
      cards,
      accounts
    );

    if (enhanced.suggestedCategory) {
      setAiSuggestion({
        category: enhanced.suggestedCategory,
        confidence: enhanced.categoryConfidence || 0,
        reasoning: enhanced.reasoning || ''
      });
    }
  } catch (error) {
    console.error('Erro ao buscar sugestão de IA:', error);
  } finally {
    setLoadingAI(false);
  }
};
```

### 4. Adicionar useEffect para Monitorar Descrição

```javascript
useEffect(() => {
  // Debounce: aguardar 500ms após usuário parar de digitar
  const timer = setTimeout(() => {
    if (formData.description) {
      fetchAISuggestion(formData.description);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [formData.description]);
```

### 5. Adicionar UI para Mostrar Sugestão

Após o campo de Categoria, adicionar:

```jsx
{aiSuggestion && !formData.category && (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900">
          Sugestão de IA: {aiSuggestion.category}
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Confiança: {aiSuggestion.confidence}%
        </p>
        {aiSuggestion.reasoning && (
          <p className="text-xs text-blue-600 mt-1">
            {aiSuggestion.reasoning}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setFormData({...formData, category: aiSuggestion.category});
          setAiSuggestion(null);
        }}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
      >
        Aplicar
      </button>
    </div>
  </div>
)}

{loadingAI && (
  <div className="mt-2 text-sm text-gray-500">
    <span className="animate-pulse">Buscando sugestão de categoria...</span>
  </div>
)}
```

## Benefícios

1. **UX Melhorada**: Usuário não precisa pensar qual categoria usar
2. **Consistência**: IA sugere categorias baseadas em padrões aprendidos
3. **Velocidade**: Reduz tempo de criação de transações
4. **Inteligente**: Aprende com descrições de estabelecimentos

## Exemplo de Uso

**Usuário digita**: "CM Industria De Paes E"

**IA sugere**: 
- Categoria: "Alimentação" ou "Compras"
- Confiança: 85%
- Raciocínio: "Estabelecimento comercial relacionado a alimentação"

**Usuário**: Clica em "Aplicar" e categoria é preenchida automaticamente

## Configuração Necessária

Para funcionar, precisa ter pelo menos uma API key configurada:

- `REACT_APP_OPENAI_API_KEY` (OpenAI GPT)
- `REACT_APP_GEMINI_API_KEY` (Google Gemini)
- `REACT_APP_ANTHROPIC_API_KEY` (Anthropic Claude)

Se nenhuma estiver configurada, a funcionalidade simplesmente não aparece (graceful degradation).

## Status

- [ ] Import adicionado
- [ ] Estados criados
- [ ] Função fetchAISuggestion implementada
- [ ] useEffect adicionado
- [ ] UI de sugestão implementada
- [ ] Testado em produção

## Próximos Passos

1. Implementar código no TransactionModal.jsx
2. Testar localmente
3. Fazer commit e push
4. Deploy no Vercel
5. Testar em produção com transação real

