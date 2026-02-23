// @ts-nocheck
/**
 * ReceiptService - Service for generating payment receipts
 * 
 * Requirements: 13.13-13.14
 * Design: .kiro/specs/manual-payment-system/design.md
 * 
 * This service generates PDF receipts for approved payments, including
 * payment details, approval information, and company branding.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaymentDetails } from "@/types/manual-payment";

// Company information for receipt branding
const COMPANY_INFO = {
  name: "Ordax",
  logoUrl: "/logo.png", // Default logo path - can be configured
  address: "São Paulo, Brasil",
  contact: "contato@ordax.com.br",
  website: "https://ordax.com.br"
};

/**
 * Interface for receipt data
 */
export interface ReceiptData {
  paymentReference: string;
  paymentAmount: number;
  paymentCurrency: string;
  paymentDate: string;
  paymentMethod: string;
  approvalDate: string;
  approvedByAdmin: string;
  customerName: string;
  customerEmail: string;
  companyInfo: typeof COMPANY_INFO;
}

/**
 * Generate a PDF receipt for an approved payment
 * 
 * @param paymentId - Payment UUID
 * @returns PDF blob for download
 * @throws Error if payment is not approved or not found
 */
export async function generateReceipt(paymentId: string): Promise<Blob> {
  // Fetch payment details
  const payment = await getPaymentDetailsForReceipt(paymentId);
  
  if (!payment) {
    throw new Error("Payment not found");
  }
  
  if (payment.status !== 'approved') {
    throw new Error("Receipt can only be generated for approved payments");
  }
  
  if (!payment.approved_at || !payment.approved_by) {
    throw new Error("Payment approval information is missing");
  }
  
  // Get admin name who approved the payment
  const adminName = await getAdminName(payment.approved_by);
  
  // Prepare receipt data
  const receiptData: ReceiptData = {
    paymentReference: payment.reference_number,
    paymentAmount: payment.amount,
    paymentCurrency: payment.currency,
    paymentDate: formatDate(payment.created_at),
    paymentMethod: payment.payment_method.name,
    approvalDate: formatDate(payment.approved_at),
    approvedByAdmin: adminName,
    customerName: payment.customer_name || "Cliente",
    customerEmail: payment.customer_email || "",
    companyInfo: COMPANY_INFO
  };
  
  // Generate PDF receipt
  return generatePDFReceipt(receiptData);
}

/**
 * Fetch payment details with all necessary information for receipt generation
 * 
 * @param paymentId - Payment UUID
 * @returns Payment details or null if not found
 */
async function getPaymentDetailsForReceipt(paymentId: string): Promise<PaymentDetails | null> {
  const { data, error } = await supabase
    .from("manual_payments")
    .select(`
      *,
      payment_method:admin_payment_methods(*),
      files:payment_files(*),
      audit_logs:payment_audit_log(*)
    `)
    .eq("id", paymentId)
    .maybeSingle();
  
  if (error) {
    console.error("Failed to fetch payment details:", error);
    return null;
  }
  
  if (!data) {
    return null;
  }
  
  // Fetch user profile for customer information
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", data.user_id)
    .maybeSingle();
  
  return {
    ...data,
    customer_name: profileData?.full_name,
    customer_email: profileData?.email,
  } as PaymentDetails;
}

/**
 * Get admin name from user ID
 * 
 * @param adminId - Admin user UUID
 * @returns Admin name or "Administrador" if not found
 */
async function getAdminName(adminId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", adminId)
    .maybeSingle();
  
  if (error || !data) {
    console.error("Failed to fetch admin name:", error);
    return "Administrador";
  }
  
  return data.full_name || "Administrador";
}

/**
 * Format date for receipt display
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Generate PDF receipt using jsPDF
 * 
 * @param receiptData - Receipt data to include in PDF
 * @returns PDF blob
 */
async function generatePDFReceipt(receiptData: ReceiptData): Promise<Blob> {
  try {
    // Dynamically import jsPDF to avoid bundle size issues
    // Use require for Node.js environment (testing) or import for browser
    let jsPDF;
    try {
      // Try ESM import first (browser)
      const jspdfModule = await import('jspdf');
      jsPDF = jspdfModule.jsPDF;
    } catch (esmError) {
      // Fall back to require for Node.js (testing)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      jsPDF = require('jspdf').jsPDF;
    }
    
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set document properties
    doc.setProperties({
      title: `Recibo de Pagamento - ${receiptData.paymentReference}`,
      subject: 'Recibo de pagamento aprovado',
      author: receiptData.companyInfo.name,
      keywords: 'recibo, pagamento, comprovante',
      creator: 'Ordax Payment System'
    });
    
    // Add company header
    addCompanyHeader(doc, receiptData.companyInfo);
    
    // Add receipt title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('RECIBO DE PAGAMENTO', 105, 50, { align: 'center' });
    
    // Add receipt reference
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Número do Recibo: ${receiptData.paymentReference}`, 20, 70);
    
    // Add payment details section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('DETALHES DO PAGAMENTO', 20, 85);
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    let yPos = 95;
    const lineHeight = 7;
    
    // Payment details
    doc.text(`Cliente: ${receiptData.customerName}`, 20, yPos);
    yPos += lineHeight;
    
    if (receiptData.customerEmail) {
      doc.text(`Email: ${receiptData.customerEmail}`, 20, yPos);
      yPos += lineHeight;
    }
    
    doc.text(`Valor: ${formatCurrency(receiptData.paymentAmount, receiptData.paymentCurrency)}`, 20, yPos);
    yPos += lineHeight;
    
    doc.text(`Método de Pagamento: ${receiptData.paymentMethod}`, 20, yPos);
    yPos += lineHeight;
    
    doc.text(`Data do Pagamento: ${receiptData.paymentDate}`, 20, yPos);
    yPos += lineHeight;
    
    doc.text(`Data de Aprovação: ${receiptData.approvalDate}`, 20, yPos);
    yPos += lineHeight;
    
    doc.text(`Aprovado por: ${receiptData.approvedByAdmin}`, 20, yPos);
    yPos += lineHeight + 5;
    
    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Add footer with company information
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(receiptData.companyInfo.name, 105, yPos, { align: 'center' });
    yPos += 5;
    
    doc.setFontSize(9);
    doc.text(receiptData.companyInfo.address, 105, yPos, { align: 'center' });
    yPos += 4;
    
    doc.text(`Contato: ${receiptData.companyInfo.contact}`, 105, yPos, { align: 'center' });
    yPos += 4;
    
    doc.text(`Website: ${receiptData.companyInfo.website}`, 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Add thank you message
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('Obrigado por sua compra!', 105, yPos, { align: 'center' });
    
    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
    
  } catch (error) {
    console.error("Failed to generate PDF receipt:", error);
    throw new Error("Failed to generate receipt PDF. Please try again.");
  }
}

/**
 * Add company header to PDF
 * 
 * @param doc - jsPDF document instance
 * @param companyInfo - Company information
 */
function addCompanyHeader(doc: any, companyInfo: typeof COMPANY_INFO): void {
  // Add company name
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(companyInfo.name, 20, 20);
  
  // Add company tagline
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema de Pagamento Manual', 20, 27);
  
  // Add date on right side
  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emitido em: ${currentDate}`, 190, 20, { align: 'right' });
  
  // Add separator line
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 35, 190, 35);
}

/**
 * Format currency for display
 * 
 * @param amount - Payment amount
 * @param currency - Currency code
 * @returns Formatted currency string
 */
function formatCurrency(amount: number, currency: string): string {
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }
  
  // Default formatting for other currencies
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Download receipt as PDF file
 * 
 * @param paymentId - Payment UUID
 * @param fileName - Optional custom file name
 */
export async function downloadReceipt(paymentId: string, fileName?: string): Promise<void> {
  try {
    const pdfBlob = await generateReceipt(paymentId);
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `recibo-${paymentId}.pdf`;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error("Failed to download receipt:", error);
    throw error;
  }
}

/**
 * Check if receipt can be generated for a payment
 * 
 * @param paymentId - Payment UUID
 * @returns True if receipt can be generated
 */
export async function canGenerateReceipt(paymentId: string): Promise<boolean> {
  try {
    const payment = await getPaymentDetailsForReceipt(paymentId);
    return payment?.status === 'approved' && 
           !!payment.approved_at && 
           !!payment.approved_by;
  } catch (error) {
    console.error("Failed to check receipt generation:", error);
    return false;
  }
}