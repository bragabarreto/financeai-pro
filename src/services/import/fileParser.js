import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Service for parsing different file formats
 * Supports CSV, XLS, XLSX files
 */

/**
 * Parse CSV file
 * @param {File} file - The CSV file to parse
 * @returns {Promise<Array>} Parsed data as array of objects
 */
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * Parse Excel file (XLS/XLSX)
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Array>} Parsed data as array of objects
 */
export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: ''
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Excel parsing error: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parse PDF file (basic text extraction)
 * @param {File} file - The PDF file to parse
 * @returns {Promise<String>} Extracted text from PDF
 */
export const parsePDF = async (file) => {
  // For browser environment, we'll use a basic implementation
  // In production, you might want to use pdf.js or send to backend
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        // This is a simplified version - in production you'd use pdf.js
        const text = await extractTextFromPDF(e.target.result);
        resolve(text);
      } catch (error) {
        reject(new Error(`PDF parsing error: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extract text from PDF ArrayBuffer
 * Simplified version - in production use pdf.js
 */
const extractTextFromPDF = async (arrayBuffer) => {
  // This is a placeholder - actual implementation would use pdf.js
  // For now, we'll return a message indicating manual processing needed
  return "PDF_CONTENT_PLACEHOLDER";
};

/**
 * Main file parser - automatically detects file type
 * @param {File} file - The file to parse
 * @returns {Promise<Object>} Object with parsed data and metadata
 */
export const parseFile = async (file) => {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  let parsedData;
  let fileType;
  
  try {
    if (fileExtension === 'csv') {
      fileType = 'csv';
      parsedData = await parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      fileType = 'excel';
      parsedData = await parseExcel(file);
    } else if (fileExtension === 'pdf') {
      fileType = 'pdf';
      parsedData = await parsePDF(file);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
    
    return {
      data: parsedData,
      fileType,
      fileName: file.name,
      fileSize: file.size,
      rowCount: Array.isArray(parsedData) ? parsedData.length : 0
    };
  } catch (error) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

/**
 * Validate file before parsing
 * @param {File} file - The file to validate
 * @returns {Object} Validation result
 */
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = ['csv', 'xls', 'xlsx', 'pdf'];
  
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo selecionado' };
  }
  
  const fileExtension = file.name.toLowerCase().split('.').pop();
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande. Tamanho máximo: 10MB' };
  }
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      valid: false, 
      error: `Formato não suportado. Use: ${allowedExtensions.join(', ')}` 
    };
  }
  
  return { valid: true };
};
