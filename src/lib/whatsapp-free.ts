import { Capacitor } from '@capacitor/core';
import { messageTemplates, MessageBuilder } from '@/integrations/whatsapp/templates';
import { WhatsAppDataHelper } from '@/integrations/whatsapp/data-helper';
import type { StoreInfo } from '@/integrations/whatsapp/types';
import { buildWaMeLink, normalizePhoneIN, isValidIndianMobile } from './india';

/**
 * Free wa.me helpers — zero setup, zero server, zero cost.
 * Opens the staff phone's own WhatsApp with a prefilled bill/status text.
 * Works on web + Capacitor APK (system browser → WhatsApp app).
 *
 * Every helper reuses the SAME messageTemplates + store signature as the
 * paid auto-send path, so Free and Auto messages look identical.
 */

export const getFreeReceiptBaseUrl = (): string => {
  if (import.meta.env.VITE_RECEIPT_BASE_URL) return import.meta.env.VITE_RECEIPT_BASE_URL as string;
  if (import.meta.env.VITE_APP_ORIGIN) return import.meta.env.VITE_APP_ORIGIN as string;
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return window.location.origin;
  }
  return 'https://muftgo.com';
};

export const getFreeStoreInfo = (currentStore: any): StoreInfo =>
  WhatsAppDataHelper.getStoreInfoFromContext(currentStore);

export const isFreeWaAvailable = (phone?: string | null): boolean => {
  if (!phone) return false;
  return isValidIndianMobile(phone);
};

/** Open a wa.me link safely on web + native. Returns false if phone invalid. */
export const openFreeWaLink = (to: string, message: string): boolean => {
  const normalized = normalizePhoneIN(to || '');
  if (!normalized || !isValidIndianMobile(to || '')) return false;
  const href = buildWaMeLink(to, message);
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    window.location.href = href;
    return true;
  }
};

export const freeWaHref = (to: string, message: string): string | null => {
  if (!to || !message) return null;
  if (!isValidIndianMobile(to)) return null;
  return buildWaMeLink(to, message);
};

// ---- internal: normalize any order row (list / details / offline payload) ----
const toOrderItems = (order: any) =>
  WhatsAppDataHelper.formatOrderItems(
    order?.order_items || order?.items || order?.payload?.items || []
  );

const pick = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== '');

export const freeOrderCreatedMessage = (order: any, storeInfo: StoreInfo): string => {
  const payload = order?.payload || order;
  return messageTemplates.orderCreated({
    orderId: pick(payload?.id, order?.id, '') as string,
    customerName: pick(payload?.customer_name, order?.customer_name, 'Customer') as string,
    totalAmount: Number(pick(payload?.total_amount, order?.total_amount, 0)),
    subtotal: Number(
      pick(payload?.subtotal, order?.subtotal, payload?.total_amount, order?.total_amount, 0)
    ),
    estimatedCompletion: WhatsAppDataHelper.formatEstimatedCompletion(
      pick(payload?.estimated_completion, order?.estimated_completion, undefined)
    ),
    paymentStatus: pick(payload?.payment_status, order?.payment_status, 'pending') as string,
    orderItems: toOrderItems(order),
    storeInfo,
    pointsEarned: pick(payload?.points_earned, order?.points_earned, undefined),
    pointsRedeemed: pick(payload?.points_redeemed, order?.points_redeemed, undefined),
    discountAmount: pick(payload?.discount_amount, order?.discount_amount, undefined),
  });
};

export const freeReadyMessage = (order: any, storeInfo: StoreInfo): string => {
  const payload = order?.payload || order;
  return messageTemplates.orderReadyForPickup({
    orderId: pick(payload?.id, order?.id, '') as string,
    customerName: pick(payload?.customer_name, order?.customer_name, 'Customer') as string,
    totalAmount: Number(pick(payload?.total_amount, order?.total_amount, 0)),
    readyAt: WhatsAppDataHelper.formatCompletionDate(new Date().toISOString()),
    orderItems: toOrderItems(order),
    storeInfo,
    paymentStatus: pick(payload?.payment_status, order?.payment_status, 'pending') as string,
  });
};

export const freeCompletedMessage = (order: any, storeInfo: StoreInfo): string => {
  const payload = order?.payload || order;
  return messageTemplates.orderCompleted({
    orderId: pick(payload?.id, order?.id, '') as string,
    customerName: pick(payload?.customer_name, order?.customer_name, 'Customer') as string,
    totalAmount: Number(pick(payload?.total_amount, order?.total_amount, 0)),
    completedAt: WhatsAppDataHelper.formatCompletionDate(new Date().toISOString()),
    orderItems: toOrderItems(order),
    storeInfo,
  });
};

export const freePaymentMessage = (
  order: any,
  storeInfo: StoreInfo,
  pointsEarned?: number
): string => {
  const payload = order?.payload || order;
  return messageTemplates.paymentConfirmation({
    orderId: pick(payload?.id, order?.id, '') as string,
    customerName: pick(payload?.customer_name, order?.customer_name, 'Customer') as string,
    paymentStatus: 'completed',
    pointsEarned,
    storeInfo,
  });
};

/** "Washing started" update — no paid equivalent, uses generic template. */
export const freeWashingMessage = (order: any, storeInfo: StoreInfo): string => {
  const payload = order?.payload || order;
  const orderId: string = pick(payload?.id, order?.id, '');
  const name: string = pick(payload?.customer_name, order?.customer_name, 'Customer');
  return MessageBuilder.customOrderMessage(
    name,
    orderId.slice(-8).toUpperCase() || orderId,
    `Good news! Your laundry is now being washed at ${storeInfo.name}. We will message you the moment it is ready for pickup. View receipt: ${getFreeReceiptBaseUrl()}/receipt/${orderId}`
  );
};

export const freeReminderMessage = (
  customerName: string,
  orderId: string,
  daysOverdue: number
): string => MessageBuilder.reminderMessage(customerName, orderId, daysOverdue);

export const freePromoMessage = (customerName: string, promo: string): string =>
  MessageBuilder.promotionalMessage(customerName, promo);

export const freeGreetingMessage = (customerName: string, storeInfo: StoreInfo): string =>
  `Hello ${customerName}! 👋\n\nThis is ${storeInfo.name}.\n${storeInfo.address}\nMobile ${storeInfo.phone}\n\nThank you for being our customer! 🙏`;

/** Smart pick: ready → ready text, completed → done text, else bill text. */
export const freeSmartOrderMessage = (order: any, storeInfo: StoreInfo): string => {
  const status = order?.payload?.execution_status || order?.execution_status;
  if (status === 'ready_for_pickup') return freeReadyMessage(order, storeInfo);
  if (status === 'completed') return freeCompletedMessage(order, storeInfo);
  return freeOrderCreatedMessage(order, storeInfo);
};

export const freeSmartOrderHref = (
  order: any,
  storeInfo: StoreInfo
): string | null => {
  const payload = order?.payload || order;
  const phone = pick(payload?.customer_phone, order?.customer_phone, '');
  if (!phone) return null;
  return freeWaHref(phone, freeSmartOrderMessage(order, storeInfo));
};
