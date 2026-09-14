import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Clock, CreditCard, User, ShoppingCart, CheckCircle, X, CheckCircle2, ArrowDown, ChevronDown, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateOrderWithNotifications as useCreateOrder, UnitItem, CreateOrderData } from '@/hooks/useOrdersWithNotifications';
import { toast } from 'sonner';
import { useServices, useSeedDefaultServices } from '@/hooks/useServices';
import { useStore } from '@/contexts/StoreContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueOfflineOrder, OfflineSessionExpiredError, usePendingOrders } from '@/hooks/useOfflineOrderQueue';
import { buildReceiptDataFromLocalOrder, type LocalReceiptData } from '@/lib/printUtils';
import { EnhancedOrderItem, DynamicOrderItemData } from './orderTypes';
import { getJakartaNow, buildOrderItems, validateOrderReadiness, ORDER_ERROR_TOAST_STYLE } from './orderPayload';
import { InlineServiceSelector, Service as CatalogService, DynamicItem } from './InlineServiceSelector';
import { FloatingOrderSummary } from './FloatingOrderSummary';
import { CashPaymentDialog } from './CashPaymentDialog';
import { OrderSuccessDialog } from './OrderSuccessDialog';
import { ThermalPrintDialog } from '@/components/thermal/ThermalPrintDialog';
import { SectionLoading } from '@/components/ui/loading-spinner';

export const EnhancedLaundryPOS = () => {
  const [currentOrder, setCurrentOrder] = useState<EnhancedOrderItem[]>([]);
  const [dynamicItems, setDynamicItems] = useState<DynamicOrderItemData[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);
  // True when the current query was searched and matched nobody - the order
  // submit auto-creates the customer, so this badge is the whole "add" UI.
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [showOrderSuccessDialog, setShowOrderSuccessDialog] = useState(false);
  const [showThermalPrintDialog, setShowThermalPrintDialog] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentMethod: string;
    customerName: string;
    whatsAppSent: boolean;
    pointstsEarned?: number;
    pointstsRedeemed?: number;
    discountAmount?: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [dropOffDate, setDropOffDate] = useState(getJakartaNow);
  // Collapsed until customer info is complete, then auto-expands - no pointst
  // showing the service list before there's a customer to attach it to.
  const [isServiceSectionExpanded, setIsServiceSectionExpanded] = useState(false);
  const [isQueuingOffline, setIsQueuingOffline] = useState(false);
  const [offlineReceiptData, setOfflineReceiptData] = useState<LocalReceiptData | null>(null);

  const navigate = useNavigate();
  const { searchCustomers, getCustomerByPhone, addCustomer, loading: customersLoading } = useCustomers();
  const createOrderMutation = useCreateOrder();
  const { currentStore } = useStore();
  const isOnline = useOnlineStatus();
  const pendingOfflineOrders = usePendingOrders(currentStore?.store_id);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const serviceSectionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  // Monotonic id so slow earlier searches can't overwrite newer results
  // (the "dropdown comes and goes" flicker when typing fast).
  const searchSeqRef = useRef(0);

  // Queues an order locally to sync automatically once connectivity
  // returns. Points redemption is never part of the offline path (see docs
  // on offline order creation): the field is stripped here, not just
  // zeroed, so an offline order can never carry a stale redemption the
  // sync worker would otherwise have to reconcile against a balance it has
  // no live read on.
  const queueOrderOffline = async (orderData: CreateOrderData): Promise<{ id: string; pointsts_earned?: number }> => {
    if (!currentStore?.enable_offline_mode) {
      toast.error('❌ Offline mode is not enabled for this store. Please connect to the internet to create orders.', {
        style: ORDER_ERROR_TOAST_STYLE,
      });
      throw new Error('OFFLINE_MODE_DISABLED');
    }

    setIsQueuingOffline(true);
    try {
      const { pointsts_redeemed, ...offlinePayload } = orderData;
      const localId = await queueOfflineOrder(currentStore.store_id, offlinePayload);

      setOfflineReceiptData(
        buildReceiptDataFromLocalOrder(localId, offlinePayload, {
          name: currentStore.store_name,
          address: currentStore.store_address,
          phone: currentStore.store_phone,
          enable_qr: currentStore.enable_qr,
        })
      );

      toast.success('Order saved offline - will sync automatically when back online', {
        duration: 4000,
      });

      return { id: localId, pointsts_earned: 0 };
    } catch (error) {
      if (error instanceof OfflineSessionExpiredError) {
        toast.error(`❌ ${error.message}`, { style: ORDER_ERROR_TOAST_STYLE });
      } else {
        // Any other failure (e.g. an IndexedDB write/quota error) means the
        // order was neither queued nor created - staff must be told, not
        // just left with a dialog that quietly closes.
        toast.error('❌ Failed to save offline order. Please try again.', {
          style: ORDER_ERROR_TOAST_STYLE,
        });
      }
      throw error;
    } finally {
      setIsQueuingOffline(false);
    }
  };

  // Routes an order through the normal online mutation, or - only when this
  // store has opted in - queues it locally instead. `navigator.onLine` can
  // report true while the device has no real route to the internet, so a
  // failed online attempt still falls back to the offline queue rather
  // than surfacing a lost order.
  const submitOrder = async (orderData: CreateOrderData): Promise<{ id: string; pointsts_earned?: number }> => {
    if (isOnline) {
      try {
        return await createOrderMutation.mutateAsync(orderData);
      } catch (error) {
        if (!currentStore?.enable_offline_mode) {
          throw error;
        }
        return queueOrderOffline(orderData);
      }
    }

    return queueOrderOffline(orderData);
  };

  // Load services from our service management system
  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useServices();
  const seedDefaultServices = useSeedDefaultServices();

  // Helper function to calculate finish date based on service duration
  const calculateFinishDate = (service: any, startDate: Date = dropOffDate) => {
    const finishDate = new Date(startDate);
    
    if (service.durationUnit === 'hours') {
      finishDate.setHours(finishDate.getHours() + service.durationValue);
    } else if (service.durationUnit === 'days') {
      finishDate.setDate(finishDate.getDate() + service.durationValue);
    }
    
    return finishDate;
  };

  // Calculate finish date for dynamic items
  const calculateDynamicItemFinishDate = (item: DynamicOrderItemData, startDate: Date = dropOffDate) => {
    const finishDate = new Date(startDate);
    
    if (item.durationUnit === 'hours') {
      finishDate.setHours(finishDate.getHours() + item.durationValue);
    } else if (item.durationUnit === 'days') {
      finishDate.setDate(finishDate.getDate() + item.durationValue);
    }
    
    return finishDate;
  };

  // Helper function to format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Live lookup of "what's already in the cart" for the service cards' steppers,
  // keyed the same way as the card's own quantity request.
  const quantities = React.useMemo(() => {
    const map: Record<string, number> = {};
    currentOrder.forEach(item => {
      if (item.serviceType === 'unit' || item.serviceType === 'kilo') {
        map[`${item.service.id}-${item.serviceType}`] = item.quantity;
      }
    });
    return map;
  }, [currentOrder]);

  // Get total price including both regular and dynamic items
  const getTotalPrice = () => {
    const regularItemsTotal = currentOrder.reduce((sum, item) => sum + item.totalPrice, 0);
    const dynamicItemsTotal = dynamicItems.reduce((sum, item) => sum + item.totalPrice, 0);
    return regularItemsTotal + dynamicItemsTotal;
  };

  // Get the estimated completion time for the entire order
  const getOrderCompletionTime = () => {
    if (currentOrder.length === 0 && dynamicItems.length === 0) return null;
    
    let longestDate = new Date();

    // Check regular service items
    if (currentOrder.length > 0) {
      const longestService = currentOrder.reduce((longest, item) => {
        const currentFinish = calculateFinishDate(item.service);
        const longestFinish = longest ? calculateFinishDate(longest.service) : new Date();
        return currentFinish > longestFinish ? item : longest;
      }, currentOrder[0]);
      longestDate = calculateFinishDate(longestService.service);
    }

    // Check dynamic items
    if (dynamicItems.length > 0) {
      const longestDynamicDate = dynamicItems.reduce((longest, item) => {
        const currentFinish = calculateDynamicItemFinishDate(item);
        return currentFinish > longest ? currentFinish : longest;
      }, longestDate);
      
      if (longestDynamicDate > longestDate) {
        longestDate = longestDynamicDate;
      }
    }
    
    return longestDate;
  };

  // Search for customers when phone/name changes - searches both fields.
  // This effect is the SOLE writer of searchResults: results are taken from
  // the search call's own return value (not the shared `customers` state),
  // and stale responses are dropped via searchSeqRef. The old design copied
  // from shared state in a second effect while this one cleared it - the two
  // fought and the dropdown flickered ("comes and goes") while typing, and a
  // slow earlier request could overwrite newer results.
  useEffect(() => {
    const mySeq = ++searchSeqRef.current;
    const searchCustomer = async () => {
      // A newer keystroke already superseded this run.
      if (mySeq !== searchSeqRef.current) return;
      const q = (customerPhone || '').trim();
      // Don't search while selecting, or when both fields already complete
      const isFormFilled = q.length >= 3 && customerName.trim().length > 0;

      if (q.length >= 2 && !isSelectingCustomer && !isFormFilled) {
        try {
          const results = await searchCustomers(q);
          if (mySeq !== searchSeqRef.current) return;
          setSearchResults(results ?? []);
          setIsNewCustomer((results ?? []).length === 0);
          setShowResults(true);
        } catch {
          // searchCustomers already handles fallback - never blank the UI
          if (mySeq === searchSeqRef.current) {
            setShowResults(false);
          }
        }
      } else if (!isSelectingCustomer) {
        setSearchResults([]);
        setShowResults(false);
        // Keep the "New" badge when the form just became complete (user
        // finished typing a new customer's details); clear it only when the
        // query itself was shortened/cleared.
        if ((customerPhone || '').trim().length < 2) {
          setIsNewCustomer(false);
        }
      }
    };

    const debounceTimer = setTimeout(searchCustomer, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerPhone, customerName, searchCustomers, isSelectingCustomer]);

  // Auto-expand the service section the moment customer info becomes
  // complete, and collapse it again if the form is cleared. Only reacts to
  // the readiness transition, so the user can still manually toggle it in
  // between without this fighting their choice.
  const isCustomerReady = Boolean(customerName && customerPhone);
  useEffect(() => {
    setIsServiceSectionExpanded(isCustomerReady);
  }, [isCustomerReady]);

  // Handle customer selection from search
  const handleCustomerSelect = (customer: any) => {
    // Invalidate any in-flight search so it can't reopen/replace the dropdown.
    searchSeqRef.current++;
    setIsSelectingCustomer(true);
    setShowResults(false);
    setSearchResults([]);
    setIsNewCustomer(false);
    setCustomerPhone(customer.phone);
    setCustomerName(customer.name);

    setTimeout(() => {
      setIsSelectingCustomer(false);
    }, 500);
  };

  // Fast inline "add new customer": no dialog, no page switch. Just splits
  // the typed text into phone/name, focuses the missing field, and lets the
  // order submit auto-create the customer (ensureCustomerExists). This is the
  // answer to "where to add new customer inline".
  const handleAddNewCustomerFast = () => {
    searchSeqRef.current++;
    const typed = (customerPhone || '').trim();
    const digits = typed.replace(/\D/g, '');
    setShowResults(false);
    setSearchResults([]);
    setIsNewCustomer(true);
    if (digits.length >= 6) {
      // Typed digits - keep as phone, jump to name field.
      setCustomerPhone(digits.slice(-13));
      requestAnimationFrame(() => nameInputRef.current?.focus());
      toast.info(`New customer - enter name for ${digits.slice(-10)}`);
    } else {
      // Typed a name - keep as name, jump to mobile field.
      if (typed) setCustomerName(typed);
      setCustomerPhone('');
      requestAnimationFrame(() => phoneInputRef.current?.focus());
      toast.info('New customer - enter 10-digit mobile number');
    }
  };

  // Clear customer form - also clears the cart, since items added so far were
  // being built up for the customer that's now being cleared.
  const clearCustomerForm = () => {
    searchSeqRef.current++;
    setCustomerPhone('');
    setCustomerName('');
    setSearchResults([]);
    setShowResults(false);
    setIsNewCustomer(false);
    setDropOffDate(getJakartaNow());
    setCurrentOrder([]);
    setDynamicItems([]);
    setDiscountAmount(0);
    setPointsRedeemed(0);
  };

  // Handle phone input blur - only hide when focus truly leaves the whole
  // search area (input + dropdown). The old unconditional timeout fired
  // before tap/click on a result on touch devices, making the list vanish
  // as the finger landed ("come and go").
  const handlePhoneInputBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (next && dropdownRef.current?.contains(next)) return;
    // Small delay so a tap on a result (which fires blur first on touch
    // devices) still lands on the row's onMouseDown handler.
    setTimeout(() => {
      setShowResults(false);
    }, 250);
  };

  // Confirm an add-to-cart with a short toast - the cart panel itself is
  // collapsed by default, so a silent state update is easy to miss.
  const notifyItemAdded = (itemName: string) => {
    toast.success(`${itemName} added to order`, {
      duration: 1600,
      className: 'border border-pos-success/30 bg-pos-success/10 text-foreground',
    });
  };

  // Set a service line to an absolute quantity, straight on the real cart -
  // the service card's stepper already computed the target value, including
  // add (0 -> positive) and remove (-> 0). No staging cart in between, and no
  // toast here: the live number on the card is its own feedback.
  const setServiceQuantity = (rawService: CatalogService, type: 'unit' | 'kilo', quantity: number) => {
    if (quantity <= 0) {
      removeServiceFromOrder(rawService.id, type);
      return;
    }

    const price = type === 'unit' ? rawService.price : (rawService.kiloPrice || 0);
    const service = {
      id: rawService.id,
      name: rawService.name,
      price,
      duration: rawService.duration,
      durationValue: rawService.durationValue,
      durationUnit: rawService.durationUnit,
      category: rawService.category,
      supportsKilo: rawService.supportsKilo,
      kiloPrice: rawService.kiloPrice,
    };

    setCurrentOrder(prev => {
      const existingItem = prev.find(item =>
        item.service.id === service.id &&
        item.serviceType === type
      );

      if (existingItem) {
        return prev.map(item =>
          item.service.id === service.id && item.serviceType === type
            ? {
                ...item,
                quantity,
                totalPrice: quantity * service.price,
                weight: type === 'kilo' ? quantity : item.weight
              }
            : item
        );
      } else {
        return [...prev, {
          service,
          quantity,
          serviceType: type,
          weight: type === 'kilo' ? quantity : undefined,
          totalPrice: quantity * service.price
        }];
      }
    });
  };

  // Add a composed custom item straight to the real cart
  const addCustomItemToOrder = (dynamicItem: DynamicItem) => {
    const newDynamicItem: DynamicOrderItemData = {
      id: dynamicItem.id,
      itemName: dynamicItem.itemName,
      duration: `${dynamicItem.durationValue} ${dynamicItem.durationUnit}`,
      durationValue: dynamicItem.durationValue,
      durationUnit: dynamicItem.durationUnit,
      price: dynamicItem.price,
      quantity: dynamicItem.quantity,
      totalPrice: dynamicItem.price * dynamicItem.quantity,
      unitType: dynamicItem.unitType,
    };

    setDynamicItems(prev => [...prev, newDynamicItem]);
    notifyItemAdded(dynamicItem.itemName);
  };

  // Remove item from order
  const removeFromOrder = (index: number) => {
    setCurrentOrder(prev => prev.filter((_, i) => i !== index));
  };

  // Remove dynamic item
  const removeDynamicItem = (index: number) => {
    setDynamicItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update quantity for service item
  const updateQuantity = (serviceId: string, quantity: number, serviceType: 'unit' | 'kilo' | 'combined') => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.service.id === serviceId && item.serviceType === serviceType) {
        const updatedItem = { ...item, quantity };
        updatedItem.totalPrice = item.service.price * quantity;
        return updatedItem;
      }
      return item;
    }));
  };

  // Remove service item from order
  const removeServiceFromOrder = (serviceId: string, serviceType: 'unit' | 'kilo' | 'combined') => {
    setCurrentOrder(prev => prev.filter(item => 
      !(item.service.id === serviceId && item.serviceType === serviceType)
    ));
  };

  // Auto-create customer if new (production-grade: never lose a new customer)
  const ensureCustomerExists = async (name: string, phone: string) => {
    try {
      const digits = (phone || '').replace(/\D/g, '').slice(-10);
      if (!digits || digits.length !== 10) return;
      const existing = await getCustomerByPhone(phone).catch(() => null)
        || await getCustomerByPhone(digits).catch(() => null);
      if (!existing) {
        await addCustomer({ name: name.trim(), phone: digits } as any).catch(() => null);
      }
    } catch {
      // non-blocking - order must still succeed even if customer insert fails
    }
  };

  // Process payment
  const processPayment = async (paymentMethod: string = 'cash') => {
    const validationError = validateOrderReadiness({ currentOrder, dynamicItems, customerName, customerPhone });
    if (validationError) {
      toast.error(`❌ ${validationError}`, { style: ORDER_ERROR_TOAST_STYLE });
      return;
    }

    // Show cash payment dialog for cash payments, otherwise process directly
    if (paymentMethod === 'cash') {
      setShowCashPaymentDialog(true);
    } else {
      // For other payment methods, process directly without cash dialog
      await processNonCashPayment(paymentMethod);
    }
  };

  const processCashPayment = async (cashReceived: number, isDownPayment?: boolean) => {
    try {
      const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
      const cleanName = (customerName || '').trim();
      const subtotal = getTotalPrice();
      const totalAmount = subtotal - discountAmount;
      const completionDate = getOrderCompletionTime();
      const { items, allItemsAreProducts } = buildOrderItems({
        currentOrder,
        dynamicItems,
        dropOffDate,
        calculateFinishDate,
        calculateDynamicItemFinishDate,
      });

      // Determine payment status based on whether it's a down payment
      const paymentStatus = isDownPayment ? 'down_payment' : 'completed';
      const paymentAmount = isDownPayment ? cashReceived : totalAmount;

      const orderData = {
        customer_name: cleanName,
        customer_phone: cleanPhone,
        items,
        subtotal,
        tax_amount: 0,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        pointsts_redeemed: pointstsRedeemed,
        execution_status: allItemsAreProducts ? 'completed' : 'in_queue',
        payment_status: paymentStatus,
        payment_method: 'cash',
        payment_amount: paymentAmount,
        cash_received: cashReceived, // Add the cash received amount
        order_date: dropOffDate.toISOString(),
        estimated_completion: completionDate?.toISOString(),
      };

      await ensureCustomerExists(cleanName, cleanPhone);
      const createdOrder = await submitOrder(orderData);

      // Close cash payment dialog
      setShowCashPaymentDialog(false);
      
      // Show order success dialog
      showOrderSuccess(createdOrder, totalAmount, paymentStatus === 'down_payment' ? 'cash_dp' : 'cash');
    } catch (error) {
      // Error is already handled in the hook
      setShowCashPaymentDialog(false);
    }
  };

  const processNonCashPayment = async (paymentMethod: string) => {
    try {
      const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
      const cleanName = (customerName || '').trim();
      // Backward compat: map old Indonesian methods to India
      const mappedMethod = paymentMethod === 'upi' ? 'upi' : paymentMethod === 'transfer' ? 'card' : paymentMethod;
      const subtotal = getTotalPrice();
      const totalAmount = subtotal - discountAmount;
      const completionDate = getOrderCompletionTime();
      const { items, allItemsAreProducts } = buildOrderItems({
        currentOrder,
        dynamicItems,
        dropOffDate,
        calculateFinishDate,
        calculateDynamicItemFinishDate,
      });

      const orderData = {
        customer_name: cleanName,
        customer_phone: cleanPhone,
        items,
        subtotal,
        tax_amount: 0,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        pointsts_redeemed: pointstsRedeemed,
        execution_status: allItemsAreProducts ? 'completed' : 'in_queue',
        payment_status: 'completed',
        payment_method: mappedMethod,
        payment_amount: totalAmount,
        order_date: dropOffDate.toISOString(),
        estimated_completion: completionDate?.toISOString(),
      };

      await ensureCustomerExists(cleanName, cleanPhone);
      const createdOrder = await submitOrder(orderData);

      // Show order success dialog
      showOrderSuccess(createdOrder, totalAmount, mappedMethod);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  // Create draft order
  const createDraftOrder = async () => {
    const validationError = validateOrderReadiness({ currentOrder, dynamicItems, customerName, customerPhone });
    if (validationError) {
      toast.error(`❌ ${validationError}`, { style: ORDER_ERROR_TOAST_STYLE });
      return;
    }

    try {
      const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
      const cleanName = (customerName || '').trim();
      const subtotal = getTotalPrice();
      const totalAmount = subtotal - discountAmount;
      const completionDate = getOrderCompletionTime();
      const { items, allItemsAreProducts } = buildOrderItems({
        currentOrder,
        dynamicItems,
        dropOffDate,
        calculateFinishDate,
        calculateDynamicItemFinishDate,
      });

      const orderData = {
        customer_name: cleanName,
        customer_phone: cleanPhone,
        items,
        subtotal,
        tax_amount: 0,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        pointsts_redeemed: pointstsRedeemed,
        execution_status: allItemsAreProducts ? 'completed' : 'in_queue',
        payment_status: 'pending',
        order_date: dropOffDate.toISOString(),
        estimated_completion: completionDate?.toISOString(),
      };

      await ensureCustomerExists(cleanName, cleanPhone);
      const createdOrder = await submitOrder(orderData);

      // Show order success dialog for draft order (same as paid orders)
      showOrderSuccess(createdOrder, totalAmount, 'pending');
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  // Helper function to store order info and show success dialog
  const showOrderSuccess = (createdOrder: any, totalAmount: number, paymentMethod: string) => {
    // Store order info for success dialog (include phone for free wa.me fallback)
    const snapshotPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    const snapshotName = (customerName || '').trim();
    setLastCreatedOrder({
      id: createdOrder.id,
      orderNumber: createdOrder.id,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      customerName: snapshotName,
      customerPhone: snapshotPhone,
      whatsAppSent: true, // WhatsApp notification is sent asynchronously
      pointstsEarned: createdOrder.points_earned || 0,
      pointstsRedeemed: pointstsRedeemed > 0 ? pointstsRedeemed : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
    } as any);

    // Show toast notification for pointsts earned if applicable
    if (createdOrder.points_earned && createdOrder.points_earned > 0) {
      toast.success(`🎉 Customer earned +${createdOrder.points_earned} points!`, {
        style: {
          minWidth: '320px',
          maxWidth: '500px',
          width: '90vw',
          padding: '16px',
          fontSize: '16px',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
          backgroundColor: '#fffbeb',
          color: '#92400e',
        },
        duration: 5000,
      });
    }

    // Clear the current order and discount
    setCurrentOrder([]);
    setDynamicItems([]);
    setDiscountAmount(0);
    setPointsRedeemed(0);

    // Show success dialog
    setShowOrderSuccessDialog(true);
  };

  // Handle print receipt from success dialog
  const handlePrintReceipt = () => {
    if (lastCreatedOrder) {
      setShowThermalPrintDialog(true);
    }
  };

  // Handle new transaction from success dialog
  const handleNewTransaction = () => {
    // Close success dialog
    setShowOrderSuccessDialog(false);
    
    // Clear customer information for new transaction
    setCustomerName('');
    setCustomerPhone('');
    
    // Reset last created order
    setLastCreatedOrder(null);
    setOfflineReceiptData(null);

    // Reset drop off date to current time
    setDropOffDate(getJakartaNow());
  };

  // Handle dialog close - clear customer info
  const handleDialogClose = () => {
    setShowOrderSuccessDialog(false);
    // Clear customer info when closing dialog
    setCustomerName('');
    setCustomerPhone('');
    setLastCreatedOrder(null);
    setOfflineReceiptData(null);
  };

  if (servicesLoading) {
    return <SectionLoading text="Loading services..." />;
  }

  if (servicesError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-destructive">Failed to load services</h3>
              <p className="text-sm text-destructive/80">
                Please refresh the page or contact support.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingSyncCount = pendingOfflineOrders.filter(
    (o) => o.status === 'queued' || o.status === 'syncing' || o.status === 'error_retryable'
  ).length;
  const failedSyncCount = pendingOfflineOrders.filter((o) => o.status === 'error_permanent').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Offline / Sync Status Banner */}
      {(!isOnline || pendingSyncCount > 0 || failedSyncCount > 0) && (
        <Card className={failedSyncCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-pos-warning/40 bg-pos-warning/10'}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-2 text-sm">
              <WifiOff className={`mt-0.5 h-4 w-4 flex-shrink-0 ${failedSyncCount > 0 ? 'text-destructive' : 'text-pos-warning'}`} />
              <div className="space-y-1">
                {!isOnline && (
                  <p className={failedSyncCount > 0 ? 'text-destructive' : 'text-pos-warning'}>
                    {currentStore?.enable_offline_mode
                      ? 'You are offline - new orders are saved on this device and will sync automatically once you are back online.'
                      : 'You are offline - offline mode is not enabled for this store, so new orders cannot be created until you are back online.'}
                  </p>
                )}
                {pendingSyncCount > 0 && (
                  <p className="text-muted-foreground">{pendingSyncCount} order(s) waiting to sync</p>
                )}
                {failedSyncCount > 0 && (
                  <p className="font-medium text-destructive">{failedSyncCount} order(s) failed to sync - please review them in Order History</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Management Notice */}
      {servicesData && servicesData.length === 0 && (
        <Card className="border-pos-warning/40 bg-pos-warning/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-pos-warning">No services configured yet</h3>
                <p className="text-sm text-pos-warning/80">
                  Add services to start taking orders. Load sample services to get started quickly.
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Button
                  onClick={() => seedDefaultServices.mutate()}
                  disabled={seedDefaultServices.isPending}
                  className="bg-pos-warning text-white hover:bg-pos-warning/90"
                >
                  {seedDefaultServices.isPending ? 'Loading...' : 'Load Sample Services'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/services')}
                  className="border-pos-warning/40 text-pos-warning hover:bg-pos-warning/10"
                >
                  Manage Services
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Information */}
      <Card className="shadow-medium animate-fade-in">
        <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-4">
          <CardTitle className="flex items-center gap-1.5 text-base sm:gap-2 sm:text-lg">
            <User className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
            Customer Information
            {isNewCustomer && (
              <Badge variant="outline" className="ml-1 border-green-600/40 text-green-700">
                New - saved with order
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Search Customer
                </label>
                <div className="flex items-center gap-1">
                  {!(customerPhone && customerName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddNewCustomerFast}
                      className="h-6 px-2 text-xs text-primary hover:text-primary"
                      title="Add a new customer inline - saved automatically with the order"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  )}
                  {customerPhone && customerName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCustomerForm}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                {customerPhone && customerName && (
                  <CheckCircle className="h-4 w-4 absolute right-3 top-3 text-pos-success" />
                )}
                <Input
                  placeholder="Type mobile number or name to search"
                  value={customerPhone}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setCustomerPhone(newValue);

                    if (customerName.trim().length > 0 && newValue !== customerPhone) {
                      setCustomerName('');
                    }
                  }}
                  onBlur={handlePhoneInputBlur}
                  onFocus={() => {
                    const q = (customerPhone || '').trim();
                    const isFormFilled = q.length >= 3 && customerName.trim().length > 0;
                    if (!isSelectingCustomer && q.length >= 2 && !isFormFilled && (searchResults.length > 0 || q.length >= 2)) {
                      setShowResults(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowResults(false);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchResults.length === 1) {
                        handleCustomerSelect(searchResults[0]);
                      } else if (searchResults.length === 0 && (customerPhone || '').trim().length >= 2) {
                        handleAddNewCustomerFast();
                      }
                    } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
                      // Move focus into the list so keyboard users can Tab/Enter a row.
                      const first = dropdownRef.current?.querySelector<HTMLElement>('[data-customer-row]');
                      first?.focus();
                    }
                  }}
                  className="pl-10 pr-10"
                />
                {showResults && (
                  <div ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {customersLoading && (
                      <div className="p-3 text-sm text-muted-foreground min-h-[52px] flex items-center">Searching...</div>
                    )}
                    {!customersLoading && searchResults.map((customer) => (
                      <div
                        key={customer.id}
                        data-customer-row
                        tabIndex={0}
                        className="p-3 hover:bg-secondary cursor-pointer border-b last:border-b-0 focus:bg-secondary focus:outline-none"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCustomerSelect(customer)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCustomerSelect(customer);
                          }
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">+91 {customer.phone?.slice(-10)}</div>
                      </div>
                    ))}
                    {!customersLoading && searchResults.length === 0 && (customerPhone || '').trim().length >= 2 && (
                      <div
                        className="p-3 hover:bg-secondary cursor-pointer flex items-center gap-2 text-primary font-medium focus:bg-secondary focus:outline-none"
                        tabIndex={0}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleAddNewCustomerFast}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCustomerFast();
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add as new customer: “{(customerPhone || '').trim()}”
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Search by mobile or name, Enter to pick. No match? Click "Add as new customer" - it saves automatically with the order.</p>
            </div>
            <div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground sm:mb-2 sm:text-sm">
                    Mobile Number *
                  </label>
                  <Input
                    placeholder="10-digit mobile, e.g. 98765 43210"
                    inputMode="numeric"
                    ref={phoneInputRef}
                    value={customerPhone && /[a-zA-Z]/.test(customerPhone) ? '' : customerPhone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d+ ]/g, '').slice(0, 13);
                      setCustomerPhone(v);
                      if (customerName.trim().length > 0 && v !== customerPhone) {
                        // keep name if user is correcting phone for new customer
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground sm:mb-2 sm:text-sm">
                    Customer Name *
                  </label>
                  <Input
                    placeholder="Enter full name, e.g. Jay Pathade"
                    ref={nameInputRef}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground sm:mb-2 sm:text-sm">
                Receive Date & Time
              </label>
              <Input
                type="datetime-local"
                value={(() => {
                  // Format the date for datetime-local input (should be in local timezone)
                  const year = dropOffDate.getFullYear();
                  const month = String(dropOffDate.getMonth() + 1).padStart(2, '0');
                  const day = String(dropOffDate.getDate()).padStart(2, '0');
                  const hours = String(dropOffDate.getHours()).padStart(2, '0');
                  const minutes = String(dropOffDate.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })()}
                onChange={(e) => {
                  // Parse the datetime-local value as local Pune time
                  const inputValue = e.target.value;
                  if (inputValue) {
                    const localDate = new Date(inputValue);
                    // Treat this as local time
                    setDropOffDate(localDate);
                  }
                }}
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                This affects the estimated completion time for all services.
              </p>
            </div>
          </div>

          {customerPhone && customerName && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-pos-success/30 bg-pos-success/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-pos-success sm:text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Customer ready
              </div>
              <Button
                type="button"
                variant="pos"
                size="sm"
                onClick={() => serviceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="gap-1.5"
              >
                Select Services
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service Section */}
      <Card ref={serviceSectionRef} className="shadow-medium animate-scale-in">
        <Collapsible open={isServiceSectionExpanded} onOpenChange={setIsServiceSectionExpanded}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 p-3 text-left sm:p-6"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold sm:gap-2 sm:text-base">
                <Plus className="h-4 w-4 flex-shrink-0" />
                Add Services & Items
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isServiceSectionExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <InlineServiceSelector
                quantities={quantities}
                onQuantityChange={setServiceQuantity}
                onAddCustomItem={addCustomItemToOrder}
                disabled={!customerName || !customerPhone}
                dropOffDate={dropOffDate}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* FloatingOrderSummary instead of fixed Current Order card */}
      <FloatingOrderSummary
        currentOrder={currentOrder.map(item => ({
          service: item.service,
          quantity: item.quantity,
          serviceType: item.serviceType,
          weight: item.weight,
          totalPrice: item.totalPrice,
        }))}
        dynamicItems={dynamicItems}
        getTotalPrice={getTotalPrice}
        getOrderCompletionTime={getOrderCompletionTime}
        formatDate={formatDate}
        dropOffDate={dropOffDate}
        onProcessPayment={processPayment}
        onCreateDraft={createDraftOrder}
        onOpenServicePopup={() => serviceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        isProcessing={createOrderMutation.isPending || isQueuingOffline}
        customerName={customerName}
        customerPhone={customerPhone}
        calculateFinishDate={calculateFinishDate}
        calculateDynamicItemFinishDate={calculateDynamicItemFinishDate}
        updateQuantity={updateQuantity}
        removeFromOrder={removeServiceFromOrder}
        removeDynamicItem={removeDynamicItem}
        discountAmount={discountAmount}
        pointstsRedeemed={pointsRedeemed}
        onDiscountChange={setDiscountAmount}
        onPointsRedeemedChange={setPointsRedeemed}
      />

      {/* Cash Payment Dialog */}
      <CashPaymentDialog
        isOpen={showCashPaymentDialog}
        onClose={() => setShowCashPaymentDialog(false)}
        totalAmount={getTotalPrice() - discountAmount}
        onSubmit={processCashPayment}
      />

      {/* Order Success Dialog */}
      {lastCreatedOrder && (
        <OrderSuccessDialog
          isOpen={showOrderSuccessDialog}
          onClose={handleDialogClose}
          orderId={lastCreatedOrder.id}
          orderNumber={lastCreatedOrder.orderNumber}
          totalAmount={lastCreatedOrder.totalAmount}
          paymentMethod={lastCreatedOrder.paymentMethod}
          customerName={lastCreatedOrder.customerName}
          customerPhone={(lastCreatedOrder as any).customerPhone || customerPhone}
          whatsAppSent={lastCreatedOrder.whatsAppSent}
          pointstsEarned={lastCreatedOrder.pointsEarned}
          pointstsRedeemed={lastCreatedOrder.pointsRedeemed}
          discountAmount={lastCreatedOrder.discountAmount}
          onPrintReceipt={handlePrintReceipt}
          onNewTransaction={handleNewTransaction}
        />
      )}

      {/* Thermal Print Dialog */}
      {lastCreatedOrder && (
        <ThermalPrintDialog
          isOpen={showThermalPrintDialog}
          onClose={() => setShowThermalPrintDialog(false)}
          orderId={offlineReceiptData ? null : lastCreatedOrder.id}
          customerName={lastCreatedOrder.customerName}
          localReceiptData={offlineReceiptData}
        />
      )}
    </div>
  );
};
