import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
});

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  // Check if we're in the browser (not SSR)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Handle 401 Unauthorized or 404 on auth endpoints (invalid/expired token or user not found)
      if (error.response?.status === 401 || 
          (error.response?.status === 404 && error.config?.url?.includes('/auth/me'))) {
        console.log('🚪 Invalid or expired token detected, logging out...');
        
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// UPI Payment APIs
export const upiApi = {
  // Generate UPI payment link
  generatePaymentLink: (data: {
    amount: number;
    recipientUpiId: string;
    recipientName: string;
    note: string;
    expenseId?: number;
    groupId?: number;
  }) => api.post('/upi/generate-link', data),

  // Generate UPI QR code
  generateQRCode: (data: {
    amount: number;
    recipientUpiId: string;
    recipientName: string;
    note: string;
    expenseId?: number;
    groupId?: number;
  }) => api.post('/upi/generate-qr', data),

  // Mark payment as completed
  confirmPayment: (paymentLinkId: number, data: {
    upiTransactionId?: string;
    screenshot?: string;
  }) => api.post(`/upi/confirm/${paymentLinkId}`, data),

  // Get payment status
  getPaymentStatus: (paymentLinkId: number) => api.get(`/upi/status/${paymentLinkId}`),

  // Get user's payment history
  getPaymentHistory: () => api.get('/upi/history'),

  // Update user's UPI ID
  updateUpiId: (upiId: string) => api.put('/upi/update-id', { upiId }),

  // Validate UPI ID format
  validateUpiId: (upiId: string) => {
    const upiRegex = /^[\w.-]+@[\w]+$/;
    return upiRegex.test(upiId);
  },
};

// Balance APIs
export const balanceApi = {
  // Get all balances for current user
  getBalances: () => api.get('/dashboard/balances'),
  
  // Get balance with specific user
  getBalanceWith: (userId: number) => api.get(`/dashboard/balance/${userId}`),
};

export default api;
