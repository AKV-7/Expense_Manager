/**
 * UPI Payment Link Parameters
 */
export interface UPILinkParams {
  upiId: string;           // Payee Address (pa) - UPI ID of receiver
  name: string;            // Payee Name (pn) - Name of receiver
  amount: number;          // Amount (am) - Payment amount
  note: string;            // Transaction Note (tn) - Description
  transactionRef?: string; // Transaction Reference (tr) - For tracking
  merchantCode?: string;   // Merchant Category Code (mc) - Optional
  currency?: string;       // Currency (cu) - Default INR
}

/**
 * Generate UPI Deep Link
 * Creates a UPI payment link that opens UPI apps with pre-filled details
 * 
 * @param params - UPI link parameters
 * @returns UPI deep link string (e.g., upi://pay?pa=john@paytm&pn=John&am=500&cu=INR&tn=Payment)
 */
export function generateUPILink(params: UPILinkParams): string {
  const { upiId, name, amount, note, transactionRef, merchantCode, currency = 'INR' } = params;
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    pa: upiId,                        // Payee Address
    pn: encodeURIComponent(name),     // Payee Name (URL encoded)
    am: amount.toFixed(2),            // Amount (2 decimal places)
    cu: currency,                     // Currency
    tn: encodeURIComponent(note),     // Transaction Note (URL encoded)
  });

  // Add optional parameters
  if (transactionRef) {
    queryParams.append('tr', transactionRef);
  }
  
  if (merchantCode) {
    queryParams.append('mc', merchantCode);
  }

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Generate Intent Link for Android
 * Creates an Android intent link for better app selection
 */
export function generateUPIIntentLink(params: UPILinkParams): string {
  const upiLink = generateUPILink(params);
  const encodedUPI = encodeURIComponent(upiLink);
  
  return `intent://${encodedUPI.replace('upi://', '')}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
}

/**
 * Generate unique transaction reference ID
 * Format: SPLIT_<userId>_<timestamp>_<random>
 * 
 * @param userId - User ID
 * @param paymentId - Payment ID (optional)
 * @returns Unique transaction reference string
 */
export function generateTransactionRef(userId: string, paymentId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userPrefix = userId.slice(0, 8).toUpperCase();
  const paymentPrefix = paymentId ? paymentId.slice(0, 8) : random;
  
  return `SPLIT_${userPrefix}_${paymentPrefix}_${timestamp}`;
}

/**
 * Validate UPI ID format
 * Valid formats: username@bankname or mobilenumber@bankname
 * 
 * @param upiId - UPI ID to validate
 * @returns boolean indicating if UPI ID is valid
 */
export function validateUPIId(upiId: string): boolean {
  // UPI ID format: username@provider or mobile@provider
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(upiId);
}

/**
 * Parse UPI transaction reference from payment confirmation
 * Extracts transaction details from UPI reference strings
 */
export function parseTransactionRef(refString: string): {
  userId?: string;
  paymentId?: string;
  timestamp?: number;
} | null {
  // Format: SPLIT_<userId>_<paymentId>_<timestamp>
  const match = refString.match(/SPLIT_([A-Z0-9]+)_([A-Z0-9]+)_(\d+)/);
  
  if (!match) return null;
  
  return {
    userId: match[1],
    paymentId: match[2],
    timestamp: parseInt(match[3]),
  };
}

/**
 * Generate QR code data for UPI payment
 * Returns the UPI link that can be encoded into a QR code
 */
export function generateQRData(params: UPILinkParams): string {
  return generateUPILink(params);
}

/**
 * Format amount for display
 * Converts number to Indian Rupee format
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse SMS payment confirmation
 * Extracts payment details from bank SMS
 * Note: SMS formats vary by bank
 */
export function parseSMS(smsText: string): {
  amount?: number;
  refNumber?: string;
  upiId?: string;
  success: boolean;
} {
  const result: any = { success: false };
  
  // Extract amount (handles formats like Rs.500, Rs 500, INR 500)
  const amountMatch = smsText.match(/(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract UPI reference number (handles various formats)
  const refPatterns = [
    /UPI\s*(?:Ref|Reference)\s*(?:No|Number)[:\s]+(\d+)/i,
    /Ref(?:erence)?\s*(?:No|Number)[:\s]+(\d+)/i,
    /UTR[:\s]+(\d+)/i,
  ];
  
  for (const pattern of refPatterns) {
    const match = smsText.match(pattern);
    if (match) {
      result.refNumber = match[1];
      break;
    }
  }
  
  // Extract UPI ID
  const upiMatch = smsText.match(/to\s+([\w.-]+@[\w.-]+)/i);
  if (upiMatch) {
    result.upiId = upiMatch[1];
  }
  
  // Check if transaction was successful
  const successKeywords = ['success', 'successful', 'completed', 'debited', 'sent'];
  result.success = successKeywords.some(keyword => 
    smsText.toLowerCase().includes(keyword)
  );
  
  return result;
}

/**
 * Get popular UPI apps information
 * Returns list of common UPI apps with package names for deep linking
 */
export function getUPIApps() {
  return [
    { name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', icon: '💳' },
    { name: 'PhonePe', package: 'com.phonepe.app', icon: '💜' },
    { name: 'Paytm', package: 'net.one97.paytm', icon: '💙' },
    { name: 'Amazon Pay', package: 'in.amazon.mShop.android.shopping', icon: '🛒' },
    { name: 'BHIM', package: 'in.org.npci.upiapp', icon: '🇮🇳' },
    { name: 'WhatsApp', package: 'com.whatsapp', icon: '💬' },
  ];
}
