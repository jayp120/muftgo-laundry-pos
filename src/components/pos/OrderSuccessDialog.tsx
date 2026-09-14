import React from 'react';
import { CheckCircle, Printer, Star, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { POINTS_TO_CURRENCY_RATE } from '@/components/orders/PayLaterPaymentDialog';
import { buildWaMeLink } from '@/lib/india';

interface OrderSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  customerName: string;
  customerPhone?: string;
  whatsAppSent: boolean;
  pointstsEarned?: number;
  pointstsRedeemed?: number;
  discountAmount?: number;
  onPrintReceipt: () => void;
  onNewTransaction: () => void;
}

export const OrderSuccessDialog: React.FC<OrderSuccessDialogProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  paymentMethod,
  customerName,
  customerPhone,
  whatsAppSent,
  pointstsEarned,
  pointstsRedeemed,
  discountAmount,
  onPrintReceipt,
  onNewTransaction,
}) => {
  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      'cash': 'CASH',
      'cash_dp': 'CASH (ADVANCE)',
      'upi': 'UPI',
      'qris': 'UPI',
      'transfer': 'CARD',
      'card': 'CARD',
      'debit': 'DEBIT',
      'credit': 'CREDIT',
      'pending': 'PAY LATER',
    };
    return methodMap[method.toLowerCase()] || method.toUpperCase();
  };

  const getReceiptBaseUrl = (): string => {
    if (import.meta.env.VITE_RECEIPT_BASE_URL) return import.meta.env.VITE_RECEIPT_BASE_URL;
    if (import.meta.env.VITE_APP_ORIGIN) return import.meta.env.VITE_APP_ORIGIN;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Never use the native WebView's synthetic origin in a shared link.
      if (!origin.startsWith('capacitor://') && !origin.includes('localhost')) return origin;
    }
    return 'https://muftgo.com';
  };

  const waLink = customerPhone
    ? buildWaMeLink(
        customerPhone,
        `Hi ${customerName}! Your laundry order ${orderNumber} of ₹${totalAmount.toLocaleString('en-IN')} is confirmed. View receipt: ${getReceiptBaseUrl()}/receipt/${orderId}`
      )
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-full bg-pos-success flex items-center justify-center">
              <CheckCircle className="h-20 w-20 text-white stroke-[3]" />
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {formatPaymentMethod(paymentMethod)}
            </h2>
          </div>

          {/* Order Information */}
          <div className="space-y-4">
            {/* Invoice Number */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
              <p className="text-2xl font-bold text-gray-900 break-all">
                {orderNumber}
              </p>
            </div>

            {/* Total Amount */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Price</p>
              <p className="text-3xl font-bold text-gray-900">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* WhatsApp Confirmation */}
          {whatsAppSent && (
            <div className="mt-6 bg-pos-success/10 border border-pos-success/30 rounded-lg p-4">
              <div className="flex items-center justify-center text-pos-success">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">
                  Receipt sent to customer via WhatsApp
                </span>
              </div>
            </div>
          )}

          {/* Always-available free WhatsApp fallback - works with zero setup */}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="block mt-3">
              <Button variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50">
                <MessageCircle className="h-5 w-5 mr-2" />
                Send via WhatsApp (Free)
              </Button>
            </a>
          )}

          {/* Points Redeemed */}
          {pointsRedeemed && pointstsRedeemed > 0 && (
            <div className="mt-6 bg-pos-highlight/20 border-2 border-pos-highlight/50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
                  <Star className="h-5 w-5 text-white fill-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-primary font-medium">Points Redeemed</p>
                  <p className="text-2xl font-bold text-primary">-{pointsRedeemed} Points</p>
                </div>
              </div>
              <p className="text-xs text-primary/80 text-center mt-2">
                🎁 Discount ₹{(discountAmount || pointstsRedeemed * POINTS_TO_CURRENCY_RATE).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          {/* Points Earned */}
          {pointsEarned && pointstsEarned > 0 && (
            <div className="mt-6 bg-accent/10 border-2 border-accent/40 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full">
                  <Star className="h-5 w-5 text-accent-foreground fill-accent-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-accent-foreground font-medium">Customer earned</p>
                  <p className="text-2xl font-bold text-accent-foreground">+{pointsEarned} Points</p>
                </div>
              </div>
              <p className="text-xs text-accent-foreground/80 text-center mt-2">
                🎉 Points can be used for discount on next visit
              </p>
            </div>
          )}
        </DialogHeader>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {/* Print Receipt Button */}
          <Button
            onClick={onPrintReceipt}
            variant="pos"
            className="w-full py-6 text-lg font-semibold"
            size="lg"
          >
            <Printer className="h-5 w-5 mr-2" />
            Print Invoice
          </Button>

          {/* New Transaction Button */}
          <Button
            onClick={onNewTransaction}
            variant="outline"
            className="w-full py-6 text-lg font-semibold border-2"
            size="lg"
          >
            New Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
