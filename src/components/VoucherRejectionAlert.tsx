/**
 * VoucherRejectionAlert Component
 * 
 * Displays payment voucher rejection reason and allows customer to upload a new voucher.
 * Used for both standalone purchases and subscriptions.
 * 
 * Requirements: 25.8, 25.9
 * Task: 25.6
 * 
 * Features:
 * - Display rejection reason from admin
 * - Show re-upload interface
 * - Clear rejection reason when new voucher is uploaded
 * - Visual feedback for rejected status
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { PaymentVoucherUpload } from '@/components/PaymentVoucherUpload';

export interface VoucherRejectionAlertProps {
  /** Rejection reason provided by admin */
  rejectionReason: string;
  /** Callback when new voucher is uploaded */
  onVoucherUpload: (url: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Optional user ID for organizing files */
  userId?: string;
  /** Optional prefix for file path */
  pathPrefix?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Type of voucher being re-uploaded */
  voucherType?: 'deposit' | 'balance' | 'subscription';
}

/**
 * VoucherRejectionAlert Component
 */
export const VoucherRejectionAlert: React.FC<VoucherRejectionAlertProps> = ({
  rejectionReason,
  onVoucherUpload,
  onUploadError,
  userId,
  pathPrefix = 'vouchers',
  disabled = false,
  voucherType = 'deposit',
}) => {
  const getVoucherLabel = () => {
    switch (voucherType) {
      case 'deposit':
        return 'Novo Comprovante de Depósito';
      case 'balance':
        return 'Novo Comprovante de Saldo';
      case 'subscription':
        return 'Novo Comprovante de Pagamento';
      default:
        return 'Novo Comprovante';
    }
  };

  return (
    <div className="space-y-4">
      {/* Rejection Alert */}
      <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="font-semibold">Comprovante Rejeitado</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-2">
            Seu comprovante de pagamento foi rejeitado pelo administrador.
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-md p-3 border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
              Motivo da rejeição:
            </p>
            <p className="text-sm text-red-800 dark:text-red-200">
              {rejectionReason}
            </p>
          </div>
          <p className="text-sm mt-3 text-red-900 dark:text-red-100">
            Por favor, faça o upload de um novo comprovante válido abaixo.
          </p>
        </AlertDescription>
      </Alert>

      {/* Re-upload Interface */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Enviar Novo Comprovante
        </h3>
        <PaymentVoucherUpload
          onUploadSuccess={onVoucherUpload}
          onUploadError={onUploadError}
          userId={userId}
          pathPrefix={pathPrefix}
          disabled={disabled}
          label={getVoucherLabel()}
          showPreview={true}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Certifique-se de que o comprovante está legível e contém todas as informações necessárias
          (valor, data, beneficiário).
        </p>
      </div>
    </div>
  );
};

export default VoucherRejectionAlert;
