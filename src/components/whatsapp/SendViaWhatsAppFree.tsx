import React, { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import {
  freeCompletedMessage,
  freeOrderCreatedMessage,
  freePaymentMessage,
  freeReadyMessage,
  freeSmartOrderMessage,
  freeWaHref,
  freeWashingMessage,
  getFreeStoreInfo,
  isFreeWaAvailable,
} from '@/lib/whatsapp-free';

export type FreeWaOrderKind =
  | 'smart'
  | 'created'
  | 'washing'
  | 'ready'
  | 'completed'
  | 'payment';

const KIND_LABEL: Record<FreeWaOrderKind, string> = {
  smart: 'Send via WhatsApp (Free)',
  created: 'Send Bill (Free)',
  washing: 'Washing Update (Free)',
  ready: 'Ready Msg (Free)',
  completed: 'Picked-up Msg (Free)',
  payment: 'Payment Msg (Free)',
};

interface BaseProps {
  label?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'outline' | 'default' | 'ghost';
  className?: string;
  fullWidth?: boolean;
}

/** Generic free button: pass phone + prebuilt message (broadcast, customer, custom). */
export const SendViaWhatsAppFree: React.FC<
  BaseProps & { to?: string | null; message?: string | null }
> = ({ to, message, label, size = 'sm', variant = 'outline', className, fullWidth }) => {
  const href = useMemo(
    () => (to && message ? freeWaHref(to, message) : null),
    [to, message]
  );
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={fullWidth ? 'block w-full' : 'block'}
      aria-label={label || 'Send via WhatsApp (Free)'}
    >
      <Button
        type="button"
        variant={variant}
        size={size}
        className={`border-green-600 text-green-700 hover:bg-green-50 ${fullWidth ? 'w-full' : ''} ${className || ''}`}
      >
        <MessageCircle className="h-3 w-3 mr-1" />
        <span>{label || 'Send via WhatsApp (Free)'}</span>
      </Button>
    </a>
  );
};

/**
 * Smart order button — picks the right text for the order stage:
 * ready_for_pickup → Ready, completed → Picked-up, else Bill.
 * Covers UC-1 (created incl. cash/UPI/pending/down-payment), UC-3, UC-4,
 * offline queued orders (pass order={{ payload }}), and overdue reminders.
 */
export const OrderFreeWaButton: React.FC<
  BaseProps & {
    order: any;
    kind?: FreeWaOrderKind;
    pointsEarned?: number;
  }
> = ({ order, kind = 'smart', pointsEarned, label, size = 'sm', variant = 'outline', className, fullWidth }) => {
  const { currentStore } = useStore();
  const storeInfo = useMemo(() => getFreeStoreInfo(currentStore), [currentStore]);

  const { to, message } = useMemo(() => {
    const payload = order?.payload || order || {};
    const toPhone: string =
      payload?.customer_phone || order?.customer_phone || '';
    let msg = '';
    switch (kind) {
      case 'created':
        msg = freeOrderCreatedMessage(order, storeInfo);
        break;
      case 'washing':
        msg = freeWashingMessage(order, storeInfo);
        break;
      case 'ready':
        msg = freeReadyMessage(order, storeInfo);
        break;
      case 'completed':
        msg = freeCompletedMessage(order, storeInfo);
        break;
      case 'payment':
        msg = freePaymentMessage(
          order,
          storeInfo,
          pointsEarned ?? payload?.points_earned ?? order?.points_earned
        );
        break;
      case 'smart':
      default:
        msg = freeSmartOrderMessage(order, storeInfo);
        break;
    }
    return { to: toPhone, message: msg };
  }, [order, kind, pointsEarned, storeInfo]);

  if (!isFreeWaAvailable(to)) return null;
  return (
    <SendViaWhatsAppFree
      to={to}
      message={message}
      label={label || KIND_LABEL[kind]}
      size={size}
      variant={variant}
      className={className}
      fullWidth={fullWidth}
    />
  );
};
