import { Capacitor } from '@capacitor/core';
import { MessageTemplate, OrderCreatedData, OrderCompletedData, OrderReadyForPickupData, PaymentConfirmationData } from './types';
import { POINTS_TO_CURRENCY_RATE } from '@/components/orders/PayLaterPaymentDialog';

/**
 * Configuration for receipt URLs
 */
const getReceiptBaseUrl = (): string => {
  // Use environment variable if available, otherwise detect from current location
  if (import.meta.env.VITE_RECEIPT_BASE_URL) {
    return import.meta.env.VITE_RECEIPT_BASE_URL;
  }

  // VITE_APP_ORIGIN is already baked into native builds for the WhatsApp API
  // base URL (see whatsapp-config.ts) - reuse it here too.
  if (import.meta.env.VITE_APP_ORIGIN) {
    return import.meta.env.VITE_APP_ORIGIN;
  }

  // On native platforms the WebView's own origin is a synthetic local
  // address (`https://localhost` on Android, `capacitor://localhost` on
  // iOS), never the real deployed domain, so it must never be used here -
  // fall straight through to the hardcoded production fallback instead.
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return window.location.origin;
  }

  // Fallback for native builds without env vars, SSR, or build time
  return 'https://muftgo.com';
};

/**
 * Get payment status in English (India)
 */
const getPaymentStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'Unpaid',
    'completed': 'Paid',
    'down_payment': 'Advance Paid',
    'refunded': 'Refunded'
  };
  return statusMap[status] || status;
};

// Kept for backward compatibility with any existing imports.
const getPaymentStatusIndonesian = getPaymentStatus;

/**
 * Warm, personalized closing lines shared by every notification template
 * (order completed, payment confirmation, ...). One is picked at random
 * per message so repeat customers don't see the exact same line every time.
 */
const WARM_CLOSINGS = [
  'Thank you for your trust! Have a wonderful day! 🙏😊',
  'Thanks for choosing us. Wishing you a great day! ✨',
  'Thank you for being a valued customer. See you again! 🙏',
  'Thanks for using our service. Wishing you success always! 🌟',
  'Hope your day goes smoothly. Looking forward to serving you again! 😊',
];

const getRandomWarmClosing = (): string =>
  WARM_CLOSINGS[Math.floor(Math.random() * WARM_CLOSINGS.length)];

/**
 * WhatsApp Message Templates
 * Contains pre-defined message templates for different scenarios
 */
export const messageTemplates: MessageTemplate = {
  /**
   * Template for order creation notification
   */
  orderCreated: (data: OrderCreatedData): string => {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const estimatedDate = data.estimatedCompletion || 'Will be confirmed';

    // Build services list from order items
    const servicesList = data.orderItems.length > 0 
      ? data.orderItems.map(item => {
          let serviceInfo = `Service : ${item.service_name}`;
          if (item.service_type === 'kilo' && item.weight_kg) {
            serviceInfo += `\nWeight (kg) = ${item.weight_kg}`;
          }
          if (item.service_type === 'unit' && item.quantity) {
            serviceInfo += `\nQuantity = ${item.quantity}`;
          }
          serviceInfo += `\nPrice = ₹${item.service_price.toLocaleString('en-IN')}`;
          return serviceInfo;
        }).join('\n\n')
      : 'Service : Regular';

    // Build points redeemed message if points were used for discount
    const pointsRedeemedMessage = data.pointsRedeemed && data.pointsRedeemed > 0
      ? `\n🎁 Points Redeemed : ${data.pointsRedeemed} pts (-₹${(data.discountAmount || data.pointsRedeemed * POINTS_TO_CURRENCY_RATE).toLocaleString('en-IN')})`
      : '';

    // Build points earned message if points were earned
    const pointsEarnedMessage = data.pointsEarned && data.pointsEarned > 0 && data.paymentStatus === 'completed'
      ? `\n🎉 Congratulations! You earned ${data.pointsEarned} laundry points! 🎉\n(1 point per kg/unit)`
      : '';

    // Combine points messages
    const pointsMessage = (pointsRedeemedMessage || pointsEarnedMessage)
      ? `${pointsRedeemedMessage}${pointsEarnedMessage}\n====================`
      : '';

    // Build discount section for the pricing block
    const discountSection = data.pointsRedeemed && data.pointsRedeemed > 0
      ? `\nPoints Discount = -₹${(data.discountAmount || data.pointsRedeemed * POINTS_TO_CURRENCY_RATE).toLocaleString('en-IN')}\nTotal = ₹${data.totalAmount.toLocaleString('en-IN')}`
      : '';

    return `${data.storeInfo.name}
${data.storeInfo.address}
Mobile ${data.storeInfo.phone}
====================
Date : ${currentDate} - ${currentTime}
Name : ${data.customerName}
===================

${servicesList}

Subtotal = ₹${data.subtotal.toLocaleString('en-IN')}${discountSection}

====================
Estimated Completion : 
${estimatedDate}
====================
Status : ${getPaymentStatus(data.paymentStatus)}
${pointsMessage}

Thank you for using our service! 🙏
====================
Click below to view digital receipt
${getReceiptBaseUrl()}/receipt/${data.orderId}`;
  },

  /**
   * Template for order completion notification
   */
  orderCompleted: (data: OrderCompletedData): string => {
    const completedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const completedTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build services list from order items
    const servicesList = data.orderItems.length > 0 
      ? data.orderItems.map(item => {
          let serviceInfo = `Service : ${item.service_name}`;
          if (item.service_type === 'kilo' && item.weight_kg) {
            serviceInfo += `\nWeight (kg) = ${item.weight_kg}`;
          }
          return serviceInfo;
        }).join('\n\n')
      : 'Service : Regular';

    return `🎉 *LAUNDRY READY* 🎉

Hi ${data.customerName} 👋

${data.storeInfo.name}
${data.storeInfo.address}
Mobile ${data.storeInfo.phone}
====================
Completed On : ${completedDate} - ${completedTime}
Receipt No : ${data.orderId.slice(-8).toUpperCase()}
Name : ${data.customerName}
===================

${servicesList}
Total Paid = ₹${data.totalAmount.toLocaleString('en-IN')}

====================
Status : READY ✅
Completed at : ${data.completedAt}
Ready for pickup : YES
====================

Your laundry is ready, fresh and packed! 🧺✨
Please visit the store with this receipt.

${getRandomWarmClosing()}

====================
Click below to view digital receipt
${getReceiptBaseUrl()}/receipt/${data.orderId}`;
  },

  /**
   * Template for order ready for pickup notification
   */
  orderReadyForPickup: (data: OrderReadyForPickupData): string => {
    const readyDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const readyTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build services list from order items
    const servicesList = data.orderItems.length > 0 
      ? data.orderItems.map(item => {
          let serviceInfo = `Service : ${item.service_name}`;
          if (item.service_type === 'kilo' && item.weight_kg) {
            serviceInfo += `\nWeight (kg) = ${item.weight_kg}`;
          }
          return serviceInfo;
        }).join('\n\n')
      : 'Service : Regular';

    return `📦 *LAUNDRY READY FOR PICKUP* 📦

Hi ${data.customerName},
Your clothes are ready. Please collect from ${data.storeInfo.name}

====================
Receipt No : ${data.orderId.slice(-8).toUpperCase()}

Total : ₹${data.totalAmount.toLocaleString('en-IN')}
Payment Status: ${getPaymentStatus(data.paymentStatus)}

Thank you for using our service! 🙏
====================
Click below to view digital receipt
${getReceiptBaseUrl()}/receipt/${data.orderId}`;
  },

  /**
   * Template for payment confirmation notification (pay later payments)
   */
  paymentConfirmation: (data: PaymentConfirmationData): string => {
    // Build points earned message if points were earned
    const pointsEarnedMessage = data.pointsEarned && data.pointsEarned > 0
      ? `\n🎉 Congratulations! You earned ${data.pointsEarned} laundry points! 🎉`
      : '';

    return `✅ *PAYMENT CONFIRMED* ✅

Hi ${data.customerName} 👋

Your payment is confirmed. Thank you! 💚
Payment Status: ${getPaymentStatus(data.paymentStatus)}${pointsEarnedMessage}

${getRandomWarmClosing()}

====================
Click below to view digital receipt
${getReceiptBaseUrl()}/receipt/${data.orderId}`;
  },
};

/**
 * Custom message builder for special cases
 */
export class MessageBuilder {
  /**
   * Create a custom order notification message
   */
  static customOrderMessage(
    customerName: string,
    orderId: string,
    customMessage: string
  ): string {
    return `📋 *Order Update ${orderId}*

Hello ${customerName}!

${customMessage}

Thank you for using our service! 🙏

_Auto message from MuftGo Laundry POS_`;
  }

  /**
   * Create a reminder message
   */
  static reminderMessage(
    customerName: string,
    orderId: string,
    daysOverdue: number
  ): string {
    return `⏰ *Laundry Pickup Reminder*

Hello ${customerName}!

Your laundry order *${orderId}* has been ready for ${daysOverdue} days.

Please collect it soon. Thank you! 🙏

_Auto message from MuftGo Laundry POS_`;
  }

  /**
   * Create a promotional message
   */
  static promotionalMessage(
    customerName: string,
    promoDetails: string
  ): string {
    return `🎁 *Special Offer For You!*

Hello ${customerName}! ✨

${promoDetails}

Don't miss it! 🚀

_Message from MuftGo Laundry POS_`;
  }
}
