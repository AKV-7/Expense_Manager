import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Expense Tracker'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    });

    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Expense Tracker! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for joining Expense Tracker. We're excited to help you manage your shared expenses effortlessly.</p>
          
          <h3>What you can do:</h3>
          <ul>
            <li>✨ Create groups and invite friends</li>
            <li>💰 Track shared expenses</li>
            <li>📊 View balances and settlements</li>
            <li>💳 Record payments with UPI</li>
            <li>📈 Get detailed activity reports</li>
          </ul>
          
          <p>Get started by creating your first group and adding an expense!</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Happy tracking! 🚀</p>
        </div>
        <div class="footer">
          <p>© 2025 Expense Tracker. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Expense Tracker! 🎉',
    html,
  });
}

/**
 * Send expense notification email
 */
export async function sendExpenseNotification(
  email: string,
  name: string,
  expenseDetails: {
    description: string;
    amount: number;
    paidBy: string;
    groupName: string;
    yourShare: number;
  }
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .expense-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c; }
        .amount { font-size: 28px; font-weight: bold; color: #f5576c; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 New Expense Added</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>A new expense has been added to <strong>${expenseDetails.groupName}</strong></p>
          
          <div class="expense-card">
            <h3>${expenseDetails.description}</h3>
            <div class="amount">₹${expenseDetails.amount.toFixed(2)}</div>
            <p><strong>Paid by:</strong> ${expenseDetails.paidBy}</p>
            <p><strong>Your share:</strong> ₹${expenseDetails.yourShare.toFixed(2)}</p>
          </div>
          
          <p>View all expenses and settle up with your group members.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/groups" class="button">View Group</a>
        </div>
        <div class="footer">
          <p>© 2025 Expense Tracker. All rights reserved.</p>
          <p>You can manage notification preferences in your profile settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `New Expense: ${expenseDetails.description} - ${expenseDetails.groupName}`,
    html,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(
  email: string,
  name: string,
  paymentDetails: {
    amount: number;
    paidTo: string;
    groupName: string;
    method: string;
  }
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .payment-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38ef7d; }
        .amount { font-size: 28px; font-weight: bold; color: #11998e; }
        .success-badge { background: #38ef7d; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Payment Recorded</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <div class="success-badge">Payment Successful</div>
          
          <div class="payment-card">
            <h3>Payment Details</h3>
            <div class="amount">₹${paymentDetails.amount.toFixed(2)}</div>
            <p><strong>Paid to:</strong> ${paymentDetails.paidTo}</p>
            <p><strong>Group:</strong> ${paymentDetails.groupName}</p>
            <p><strong>Method:</strong> ${paymentDetails.method}</p>
          </div>
          
          <p>Your payment has been recorded successfully. Your balance has been updated.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/groups" class="button">View Balance</a>
        </div>
        <div class="footer">
          <p>© 2025 Expense Tracker. All rights reserved.</p>
          <p>You can manage notification preferences in your profile settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Payment Recorded: ₹${paymentDetails.amount} to ${paymentDetails.paidTo}`,
    html,
  });
}

/**
 * Strip HTML tags from string (for plain text fallback)
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
