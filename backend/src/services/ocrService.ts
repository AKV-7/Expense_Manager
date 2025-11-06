import Tesseract from 'tesseract.js';
import { prisma } from '../utils/prisma.js';

interface OCRResult {
  merchantName?: string;
  totalAmount?: number;
  currency?: string;
  date?: Date;
  items?: Array<{ description: string; amount: number }>;
  rawText: string;
  confidence: number;
}

/**
 * Extract text from image using Tesseract.js (client-side OCR)
 */
export async function extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
  try {
    console.log(`🔍 Starting OCR for: ${imagePath}`);
    
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text;
    const confidence = result.data.confidence / 100; // Convert to 0-1 scale

    console.log(`✅ OCR completed with confidence: ${(confidence * 100).toFixed(2)}%`);
    
    return { text, confidence };
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parse receipt text to extract structured data
 */
export function parseReceiptText(text: string): OCRResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let merchantName: string | undefined;
  let totalAmount: number | undefined;
  let currency: string | undefined = 'INR';
  let date: Date | undefined;
  const items: Array<{ description: string; amount: number }> = [];

  // Extract merchant name (usually first non-empty line)
  if (lines.length > 0) {
    merchantName = lines[0];
  }

  // Find total amount (look for keywords: total, amount, sum, etc.)
  const totalRegex = /(?:total|amount|sum|grand total|net total|bill total)[\s:]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const currencySymbols = /[₹$€£¥]/g;
  
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      totalAmount = parseFloat(amountStr);
      
      // Detect currency from symbol
      if (line.includes('₹')) currency = 'INR';
      else if (line.includes('$')) currency = 'USD';
      else if (line.includes('€')) currency = 'EUR';
      else if (line.includes('£')) currency = 'GBP';
      
      break;
    }
  }

  // If no total found, look for any amount with currency symbol
  if (!totalAmount) {
    for (const line of lines) {
      const amountMatch = line.match(/₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (amount > 0 && amount < 1000000) { // Reasonable range
          totalAmount = amount;
          if (line.includes('₹')) currency = 'INR';
          break;
        }
      }
    }
  }

  // Extract date (various formats)
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // DD/MM/YYYY or MM/DD/YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,    // YYYY-MM-DD
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{2,4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          // Try to parse the date
          const dateStr = match[0];
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            date = parsed;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
    }
    if (date) break;
  }

  // Extract line items (description + amount)
  const itemRegex = /^(.+?)\s+₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$/;
  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match && !line.toLowerCase().includes('total')) {
      const description = match[1].trim();
      const amountStr = match[2].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      if (description.length > 2 && amount > 0 && amount < 100000) {
        items.push({ description, amount });
      }
    }
  }

  return {
    merchantName,
    totalAmount,
    currency,
    date,
    items: items.length > 0 ? items : undefined,
    rawText: text,
    confidence: 0.7, // Base confidence for parsing
  };
}

/**
 * Process receipt: extract text and parse
 */
export async function processReceipt(receiptId: string): Promise<OCRResult> {
  try {
    // Update status to processing
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { ocrStatus: 'processing' },
    });

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // Extract text using OCR
    const { text, confidence } = await extractTextFromImage(receipt.imagePath);

    // Parse the extracted text
    const parsed = parseReceiptText(text);

    // Update receipt with OCR results
    const updated = await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ocrStatus: 'completed',
        merchantName: parsed.merchantName,
        totalAmount: parsed.totalAmount,
        currency: parsed.currency,
        date: parsed.date,
        items: parsed.items ? JSON.stringify(parsed.items) : null,
        rawText: parsed.rawText,
        confidence: Math.min(confidence, parsed.confidence || 0.7),
      },
    });

    console.log(`✅ Receipt processed successfully: ${receiptId}`);
    console.log(`   Merchant: ${parsed.merchantName}`);
    console.log(`   Amount: ${parsed.currency} ${parsed.totalAmount}`);
    console.log(`   Items: ${parsed.items?.length || 0}`);

    return parsed;
  } catch (error) {
    console.error(`❌ Receipt processing failed for ${receiptId}:`, error);
    
    // Update status to failed
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { ocrStatus: 'failed' },
    });

    throw error;
  }
}

/**
 * Get receipt by ID with parsed data
 */
export async function getReceiptById(receiptId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!receipt) {
    return null;
  }

  // Parse items JSON if present
  let items = null;
  if (receipt.items) {
    try {
      items = JSON.parse(receipt.items);
    } catch (e) {
      console.error('Failed to parse receipt items:', e);
    }
  }

  return {
    ...receipt,
    items,
  };
}

/**
 * Get user's receipts
 */
export async function getUserReceipts(userId: string, options?: { status?: string; limit?: number }) {
  const where: any = { userId };
  
  if (options?.status) {
    where.ocrStatus = options.status;
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  });

  return receipts.map(receipt => {
    let items = null;
    if (receipt.items) {
      try {
        items = JSON.parse(receipt.items);
      } catch (e) {
        // Ignore parse errors
      }
    }
    return { ...receipt, items };
  });
}

/**
 * Delete receipt and associated file
 */
export async function deleteReceipt(receiptId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  // Delete file from filesystem
  const fs = await import('fs/promises');
  try {
    await fs.unlink(receipt.imagePath);
    console.log(`🗑️  Deleted receipt file: ${receipt.imagePath}`);
  } catch (error) {
    console.error('Failed to delete receipt file:', error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete from database
  await prisma.receipt.delete({
    where: { id: receiptId },
  });

  console.log(`✅ Receipt deleted: ${receiptId}`);
}

/**
 * Link receipt to expense
 */
export async function linkReceiptToExpense(receiptId: string, expenseId: string) {
  const receipt = await prisma.receipt.update({
    where: { id: receiptId },
    data: { expenseId },
  });

  // Update expense with receipt image URL
  await prisma.expense.update({
    where: { id: expenseId },
    data: { receiptImageUrl: receipt.imageUrl },
  });

  return receipt;
}
