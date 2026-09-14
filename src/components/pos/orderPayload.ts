import { CreateOrderData } from '@/hooks/useOrdersWithNotifications';
import { EnhancedOrderItem, DynamicOrderItemData } from './orderTypes';

const PRODUCT_CATEGORIES = ['detergent', 'perfume', 'softener', 'other_goods'];

// Pune is IST UTC+5:30 and has no DST, so a fixed offset is safe.
// Kept the old name getJakartaNow as an alias to avoid breaking imports.
export const getJakartaNow = (): Date => {
  return getPuneNow();
};

export const getPuneNow = (): Date => {
  const now = new Date();
  // If the device is already in IST, just return now. Otherwise convert from UTC.
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60000);
};

interface BuildOrderItemsParams {
  currentOrder: EnhancedOrderItem[];
  dynamicItems: DynamicOrderItemData[];
  dropOffDate: Date;
  calculateFinishDate: (service: EnhancedOrderItem['service'], startDate?: Date) => Date;
  calculateDynamicItemFinishDate: (item: DynamicOrderItemData, startDate?: Date) => Date;
}

export const buildOrderItems = ({
  currentOrder,
  dynamicItems,
  dropOffDate,
  calculateFinishDate,
  calculateDynamicItemFinishDate,
}: BuildOrderItemsParams): { items: CreateOrderData['items']; allItemsAreProducts: boolean } => {
  const regularItems: CreateOrderData['items'] = currentOrder.map(item => ({
    service_name: item.service.name,
    service_price: item.service.price,
    quantity: item.quantity,
    estimated_completion: calculateFinishDate(item.service, dropOffDate).toISOString(),
    service_type: item.serviceType,
    weight_kg: item.weight,
    unit_items: item.unitItems,
    category: item.service.category,
    item_type: PRODUCT_CATEGORIES.includes(item.service.category) ? 'product' : 'service',
  }));

  const dynamicOrderItems: CreateOrderData['items'] = dynamicItems.map(item => ({
    service_name: item.itemName,
    service_price: item.price,
    quantity: item.quantity,
    estimated_completion: calculateDynamicItemFinishDate(item, dropOffDate).toISOString(),
    service_type: item.unitType,
    weight_kg: item.unitType === 'kilo' ? item.quantity : undefined,
    unit_items: undefined,
    category: 'other_goods',
    item_type: 'service',
  }));

  const items = [...regularItems, ...dynamicOrderItems];
  const allItemsAreProducts = items.every(item => item.item_type === 'product');

  return { items, allItemsAreProducts };
};

interface ValidateOrderReadinessParams {
  currentOrder: EnhancedOrderItem[];
  dynamicItems: DynamicOrderItemData[];
  customerName: string;
  customerPhone: string;
}

// Returns the English error message to toast, or null if the order is ready to submit.
export const validateOrderReadiness = ({
  currentOrder,
  dynamicItems,
  customerName,
  customerPhone,
}: ValidateOrderReadinessParams): string | null => {
  if (currentOrder.length === 0 && dynamicItems.length === 0) {
    return 'No items in the order - please add a service first';
  }
  if (!customerName || !customerPhone) {
    return 'Please complete customer info (name + 10-digit mobile)';
  }
  const digits = (customerPhone || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return 'Please enter a valid 10-digit Indian mobile number starting with 6-9';
  }
  return null;
};

export const ORDER_ERROR_TOAST_STYLE = {
  minWidth: '320px',
  maxWidth: '500px',
  width: '90vw',
  padding: '16px',
  fontSize: '16px',
  borderRadius: '12px',
  border: '2px solid #ef4444',
};
