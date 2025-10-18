/**
 * @jest-environment jsdom
 */

import {
  extractFromSMS,
  extractMultipleFromText,
  calculateSMSConfidence,
  validateSMSExtraction
} from '../smsExtractor';

describe('SMS Extractor Service', () => {
  describe('extractFromSMS', () => {
    it('deve extrair transação do formato CAIXA', () => {
      const sms = 'CAIXA: Compra aprovada COLSANTACECIL R$ 450,00 06/10 às 16:45, ELO VIRTUAL final 6539';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.description).toBe('COLSANTACECIL');
      expect(result.amount).toBe(450);
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('credit_card');
      expect(result.origin).toBe('sms_import');
      expect(result.bank_name).toBe('CAIXA');
      expect(result.card_last_digits).toBe('6539');
    });

    it('deve extrair transação do formato CAIXA com LA BRASILERIE', () => {
      const sms = 'CAIXA: Compra aprovada LA BRASILERIE R$ 47,20 09/10 as 06:49, ELO final 1527';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.description).toBe('LA BRASILERIE');
      expect(result.amount).toBe(47.20);
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('credit_card');
      expect(result.date).toBe('2025-10-09T06:49:00'); // With time
      expect(result.bank_name).toBe('CAIXA');
      expect(result.card_last_digits).toBe('1527');
    });

    it('deve extrair transação do formato CAIXA com parcelamento', () => {
      const sms = 'CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$       457,00 em   2 vezes, 06/10 as 19:55, ELO final 1527. Se desconhecer envie BL1527';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.description).toBe('RAFAEL FERNANDES SALE');
      expect(result.amount).toBe(228.5); // Divided by 2 installments
      expect(result.installments).toBe(2);
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('credit_card');
      expect(result.origin).toBe('sms_import');
      expect(result.bank_name).toBe('CAIXA');
      expect(result.card_last_digits).toBe('1527');
      expect(result.category).toBeDefined(); // Should have a category
    });

    it('deve extrair transação do formato Nubank', () => {
      const sms = 'Nubank: Compra aprovada: R$ 150,00 em RESTAURANTE XYZ em 15/03';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.amount).toBe(150);
      expect(result.description).toBe('RESTAURANTE XYZ');
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('credit_card');
    });

    it('deve extrair PIX recebido', () => {
      const sms = 'Você recebeu um Pix de R$ 250,00 de João Silva em 10/03 às 14:30';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.amount).toBe(250);
      expect(result.description).toBe('João Silva');
      expect(result.type).toBe('income');
      expect(result.payment_method).toBe('pix');
    });

    it('deve extrair PIX enviado', () => {
      const sms = 'Você enviou um Pix de R$ 100,00 para Maria Santos em 10/03 às 10:15';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.amount).toBe(100);
      expect(result.description).toBe('Maria Santos');
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('pix');
    });

    it('deve extrair transferência bancária', () => {
      const sms = 'Transferência de R$ 500,00 para Conta 1234-5 em 08/03';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.amount).toBe(500);
      expect(result.type).toBe('expense');
      expect(result.payment_method).toBe('transfer');
    });

    it('deve parsear formato brasileiro de valor com pontos e vírgula', () => {
      const sms = 'CAIXA: Compra aprovada LOJA R$ 1.234,56 06/10 às 16:45';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.amount).toBe(1234.56);
    });

    it('deve retornar null para SMS inválido', () => {
      const sms = 'Este é um SMS sem informação de transação';
      const result = extractFromSMS(sms);

      expect(result).toBeNull();
    });

    it('deve retornar null para texto vazio', () => {
      expect(extractFromSMS('')).toBeNull();
      expect(extractFromSMS(null)).toBeNull();
      expect(extractFromSMS(undefined)).toBeNull();
    });

    it('deve parsear data corretamente no formato DD/MM', () => {
      const sms = 'CAIXA: Compra aprovada LOJA R$ 100,00 06/10 às 16:45';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.date).toBe('2025-10-06T16:45:00'); // October 6th, 2025 with time
      expect(result.date.startsWith('2025-10-06')).toBe(true); // Date portion is correct
    });

    it('deve parsear data corretamente sem hora', () => {
      const sms = 'Transferência de R$ 500,00 para Conta 1234-5 em 08/10';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.date).toBe('2025-10-08'); // October 8th, 2025 without time
    });

    it('deve extrair banco e últimos dígitos do cartão', () => {
      const sms = 'CAIXA: Compra aprovada RESTAURANTE R$ 150,00 09/10 às 12:30, ELO final 1234';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.bank_name).toBe('CAIXA');
      expect(result.card_last_digits).toBe('1234');
    });

    it('deve categorizar estabelecimentos de alimentação', () => {
      const sms1 = 'CAIXA: Compra aprovada LA BRASILERIE R$ 47,20 09/10 às 06:49, ELO final 1527';
      const result1 = extractFromSMS(sms1);
      
      expect(result1).not.toBeNull();
      expect(result1.category).toBe('alimentacao');
      
      const sms2 = 'CAIXA: Compra aprovada PIZZARIA BELLA R$ 80,00 10/10 às 19:00, ELO final 1234';
      const result2 = extractFromSMS(sms2);
      
      expect(result2).not.toBeNull();
      expect(result2.category).toBe('alimentacao');
    });

    it('deve categorizar estabelecimentos de transporte', () => {
      const sms = 'CAIXA: Compra aprovada UBER TRIP R$ 25,00 10/10 às 08:30, ELO final 1234';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.category).toBe('transporte');
    });

    it('deve categorizar estabelecimentos de saúde', () => {
      const sms = 'CAIXA: Compra aprovada FARMACIA POPULAR R$ 35,00 10/10 às 15:00, ELO final 1234';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.category).toBe('saude');
    });

    it('deve detectar PIX como meio de pagamento', () => {
      const sms = 'Você enviou um Pix de R$ 100,00 para Maria Santos em 10/03 às 10:15';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.payment_method).toBe('pix');
    });

    it('deve detectar débito como meio de pagamento', () => {
      const sms = 'Débito de R$ 45,00 em ESTABELECIMENTO em 05/03';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.payment_method).toBe('debit_card');
    });

    it('deve usar credit_card como padrão quando não há PIX ou débito', () => {
      const sms = 'CAIXA: Compra aprovada LOJA XYZ R$ 100,00 10/10 às 14:00, ELO final 1234';
      const result = extractFromSMS(sms);
      
      expect(result).not.toBeNull();
      expect(result.payment_method).toBe('credit_card');
    });

    it('deve dividir valor por número de parcelas quando especificado', () => {
      const sms1 = 'CAIXA: Compra aprovada LOJA ABC R$ 300,00 em 3 vezes, 10/10 às 14:00, ELO final 1234';
      const result1 = extractFromSMS(sms1);
      
      expect(result1).not.toBeNull();
      expect(result1.amount).toBe(100); // 300 / 3
      expect(result1.installments).toBe(3);
      
      const sms2 = 'CAIXA: Compra aprovada LOJA DEF R$ 600,00 em 6 vezes, 10/10 às 15:00, ELO final 5678';
      const result2 = extractFromSMS(sms2);
      
      expect(result2).not.toBeNull();
      expect(result2.amount).toBe(100); // 600 / 6
      expect(result2.installments).toBe(6);
    });
  });

  describe('extractMultipleFromText', () => {
    it('deve extrair múltiplas transações separadas por linha', () => {
      const text = `CAIXA: Compra aprovada LOJA1 R$ 100,00 06/10 às 16:45
Você recebeu um Pix de R$ 250,00 de João Silva
Nubank: Compra aprovada: R$ 75,00 em RESTAURANTE`;

      const results = extractMultipleFromText(text);

      expect(results).toHaveLength(3);
      expect(results[0].amount).toBe(100);
      expect(results[1].amount).toBe(250);
      expect(results[2].amount).toBe(75);
    });

    it('deve ignorar linhas inválidas', () => {
      const text = `CAIXA: Compra aprovada LOJA1 R$ 100,00 06/10 às 16:45
Esta linha não contém transação
Você recebeu um Pix de R$ 250,00`;

      const results = extractMultipleFromText(text);

      expect(results).toHaveLength(2);
    });

    it('deve retornar array vazio para texto inválido', () => {
      expect(extractMultipleFromText('')).toEqual([]);
      expect(extractMultipleFromText(null)).toEqual([]);
      expect(extractMultipleFromText('Sem transações aqui')).toEqual([]);
    });
  });

  describe('calculateSMSConfidence', () => {
    it('deve calcular confiança alta para transação completa', () => {
      const transaction = {
        amount: 450,
        description: 'COLSANTACECIL',
        type: 'expense',
        payment_method: 'credit_card',
        date: '2024-10-06'
      };

      const confidence = calculateSMSConfidence(transaction);
      expect(confidence).toBe(100);
    });

    it('deve calcular confiança média para transação parcial', () => {
      const transaction = {
        amount: 450,
        description: 'LOJA',
        type: 'expense'
      };

      const confidence = calculateSMSConfidence(transaction);
      expect(confidence).toBe(75); // 40 + 25 + 10
    });

    it('deve calcular confiança baixa para transação mínima', () => {
      const transaction = {
        amount: 450
      };

      const confidence = calculateSMSConfidence(transaction);
      expect(confidence).toBe(40);
    });
  });

  describe('validateSMSExtraction', () => {
    it('deve validar extração bem-sucedida', () => {
      const transactions = [
        { amount: 100, description: 'LOJA1', type: 'expense' },
        { amount: 200, description: 'LOJA2', type: 'expense' }
      ];

      const validation = validateSMSExtraction(transactions);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.validTransactions).toBe(2);
      expect(validation.totalTransactions).toBe(2);
    });

    it('deve gerar avisos para transações incompletas', () => {
      const transactions = [
        { amount: 100, description: 'OK' },
        { amount: 0, description: 'Sem valor' },
        { amount: 200, description: '' }
      ];

      const validation = validateSMSExtraction(transactions);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('deve avisar quando não há transações', () => {
      const validation = validateSMSExtraction([]);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Nenhuma transação');
    });

    it('deve invalidar entrada não-array', () => {
      const validation = validateSMSExtraction(null);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
    });
  });
});
