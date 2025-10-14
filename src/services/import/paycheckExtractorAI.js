/**
 * Paycheck Extractor AI Service
 * Extrai dados de contracheques (PDF/imagem) usando IA
 * Identifica créditos, débitos, categoriza automaticamente
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Converte arquivo para base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

/**
 * Categoriza transação baseada em palavras-chave
 */
const suggestCategory = (description, type, availableCategories) => {
  const desc = description.toLowerCase();
  
  // Mapeamento de palavras-chave para categorias
  const keywordMap = {
    income: {
      'salario': ['subsídio', 'salário', 'vencimento', 'remuneração', 'substituição', 'gecj', 'gratificação'],
      'beneficios': ['auxílio', 'benefício', 'vale', 'ajuda', 'assistência'],
      'bonus': ['bônus', 'prêmio', 'gratificação', 'adicional'],
      'horas_extras': ['hora extra', 'horas extras', 'adicional noturno'],
      'ferias': ['férias', 'terço', '1/3'],
      'decimo': ['13º', 'décimo terceiro', 'gratificação natalina'],
      'outros': ['indenização', 'compensação', 'ressarcimento']
    },
    expense: {
      'saude': ['saúde', 'plano', 'médico', 'unimed', 'amil', 'bradesco saúde', 'odonto'],
      'previdencia': ['previdência', 'rpps', 'inss', 'funpresp', 'contribuição previdenciária'],
      'seguros': ['seguro', 'invalidez', 'morte', 'vida'],
      'impostos': ['imposto', 'ir', 'renda', 'irrf', 'tributo'],
      'emprestimos': ['empréstimo', 'financiamento', 'consignado', 'cef', 'banco'],
      'pensao_alimenticia': ['pensão', 'alimentícia', 'alimentos'],
      'sindicato': ['sindicato', 'associação', 'contribuição sindical', 'amatra', 'ajufe'],
      'outros': ['devolução', 'desconto', 'ajuste']
    }
  };
  
  const keywords = keywordMap[type] || {};
  
  // Procurar categoria correspondente
  for (const [categoryKey, terms] of Object.entries(keywords)) {
    if (terms.some(term => desc.includes(term))) {
      // Encontrar categoria correspondente nas categorias disponíveis
      const category = availableCategories.find(c => 
        c.name.toLowerCase().includes(categoryKey) ||
        categoryKey.includes(c.name.toLowerCase())
      );
      
      if (category) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          confidence: 85
        };
      }
    }
  }
  
  return null;
};

/**
 * Detecta se é pensão alimentícia
 */
const isAlimony = (description) => {
  const desc = description.toLowerCase();
  return desc.includes('pensão') || desc.includes('alimentícia') || desc.includes('alimentos');
};

/**
 * Extrai dados de contracheque usando IA
 */
export const extractFromPaycheck = async (file, aiConfig, availableCategories = []) => {
  try {
    console.log('🔄 Iniciando extração de contracheque com IA...');
    
    // Validar configuração de IA
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.provider) {
      throw new Error('Configuração de IA inválida');
    }
    
    // Converter arquivo para base64
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'application/pdf';
    
    console.log('📄 Arquivo convertido:', {
      name: file.name,
      type: mimeType,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });
    
    // Inicializar IA (suporta apenas Gemini por enquanto para visão)
    if (aiConfig.provider !== 'gemini') {
      throw new Error('Extração de contracheque requer Google Gemini (suporta visão)');
    }
    
    const genAI = new GoogleGenerativeAI(aiConfig.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: aiConfig.model || 'gemini-2.0-flash-exp'
    });
    
    // Prompt detalhado para extração
    const prompt = `Você é um assistente especializado em análise de contracheques brasileiros.

Analise este contracheque e extraia TODAS as informações em formato JSON estruturado.

IMPORTANTE:
1. Separe claramente CRÉDITOS (receitas/proventos) de DÉBITOS (descontos)
2. Para cada item, extraia: rubrica, descrição, mês/referência, quantidade, parcela, valor
3. Identifique o mês/ano do contracheque
4. Extraia nome do funcionário, CPF, órgão/empresa
5. Calcule totais: bruto, descontos, líquido
6. Identifique pensão alimentícia (marque com flag especial)

Retorne APENAS um JSON válido no seguinte formato:

{
  "metadata": {
    "month": 10,
    "year": 2025,
    "employee_name": "Nome do Funcionário",
    "cpf": "000.000.000-00",
    "employer": "Nome do Órgão/Empresa",
    "gross_amount": 0.00,
    "deductions_amount": 0.00,
    "net_amount": 0.00
  },
  "credits": [
    {
      "rubric": "código",
      "description": "Descrição completa",
      "month_ref": "MM/YYYY",
      "quantity": 0,
      "installment": 0,
      "amount": 0.00
    }
  ],
  "debits": [
    {
      "rubric": "código",
      "description": "Descrição completa",
      "month_ref": "MM/YYYY",
      "quantity": 0,
      "installment": 0,
      "amount": 0.00,
      "is_alimony": false
    }
  ]
}

REGRAS:
- Valores devem ser números (sem R$, sem pontos de milhar, use ponto decimal)
- Se não houver rubrica, use string vazia
- Se não houver quantidade/parcela, use 0
- Marque is_alimony=true apenas para pensão alimentícia
- Seja preciso com os valores

Analise o contracheque agora:`;

    // Chamar API Gemini
    console.log('🤖 Chamando API Gemini para análise...');
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    console.log('📝 Resposta da IA recebida');
    
    // Extrair JSON da resposta
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Tentar remover markdown code blocks
      jsonMatch = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      console.error('❌ Resposta da IA não contém JSON válido:', text);
      throw new Error('IA não retornou dados estruturados válidos');
    }
    
    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('✅ Dados extraídos com sucesso:', {
      credits: extractedData.credits?.length || 0,
      debits: extractedData.debits?.length || 0,
      gross: extractedData.metadata?.gross_amount,
      net: extractedData.metadata?.net_amount
    });
    
    // Processar e transformar em transações
    const transactions = [];
    
    // Data de crédito (último dia do mês do contracheque)
    const paymentDate = new Date(
      extractedData.metadata.year,
      extractedData.metadata.month,
      0 // último dia do mês
    ).toISOString().split('T')[0];
    
    // Processar créditos (receitas)
    if (extractedData.credits && Array.isArray(extractedData.credits)) {
      extractedData.credits.forEach((credit, index) => {
        const suggestion = suggestCategory(credit.description, 'income', availableCategories);
        
        transactions.push({
          id: `credit_${index}`,
          type: 'income',
          description: credit.description,
          amount: parseFloat(credit.amount) || 0,
          date: paymentDate,
          rubric: credit.rubric || '',
          month_ref: credit.month_ref || '',
          quantity: credit.quantity || 0,
          installment: credit.installment || 0,
          payment_method: 'paycheck',
          categoryId: suggestion?.categoryId || null,
          aiSuggestedCategory: suggestion?.categoryId || null,
          aiCategoryName: suggestion?.categoryName || null,
          aiConfidence: suggestion?.confidence || 0,
          account_id: null,
          card_id: null,
          selected: true,
          confidence: 90,
          editable: true
        });
      });
    }
    
    // Processar débitos (despesas)
    if (extractedData.debits && Array.isArray(extractedData.debits)) {
      extractedData.debits.forEach((debit, index) => {
        const suggestion = suggestCategory(debit.description, 'expense', availableCategories);
        const isAlimonyFlag = debit.is_alimony || isAlimony(debit.description);
        
        transactions.push({
          id: `debit_${index}`,
          type: 'expense',
          description: debit.description,
          amount: parseFloat(debit.amount) || 0,
          date: paymentDate,
          rubric: debit.rubric || '',
          month_ref: debit.month_ref || '',
          quantity: debit.quantity || 0,
          installment: debit.installment || 0,
          payment_method: 'paycheck',
          categoryId: suggestion?.categoryId || null,
          aiSuggestedCategory: suggestion?.categoryId || null,
          aiCategoryName: suggestion?.categoryName || null,
          aiConfidence: suggestion?.confidence || 0,
          account_id: null,
          card_id: null,
          is_alimony: isAlimonyFlag,
          selected: true,
          confidence: 90,
          editable: true
        });
      });
    }
    
    console.log(`✅ ${transactions.length} transações processadas`);
    
    return {
      metadata: {
        ...extractedData.metadata,
        payment_date: paymentDate,
        source: 'paycheck',
        file_name: file.name,
        processed_at: new Date().toISOString()
      },
      transactions,
      validation: {
        total_credits: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        total_debits: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        expected_gross: extractedData.metadata.gross_amount,
        expected_deductions: extractedData.metadata.deductions_amount,
        expected_net: extractedData.metadata.net_amount
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao extrair contracheque:', error);
    
    // Mensagens de erro mais amigáveis
    if (error.message.includes('API key')) {
      throw new Error('Chave de API inválida. Verifique sua configuração de IA.');
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      throw new Error('Limite de uso da API atingido. Tente novamente mais tarde.');
    } else if (error.message.includes('JSON')) {
      throw new Error('Erro ao processar resposta da IA. O arquivo pode não ser um contracheque válido.');
    }
    
    throw error;
  }
};

export default extractFromPaycheck;

