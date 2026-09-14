import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { WhatsAppDataHelper } from '@/integrations/whatsapp/data-helper';
import { OrderCreatedData, OrderCompletedData, OrderReadyForPickupData, PaymentConfirmationData } from '@/integrations/whatsapp/types';
import type { CreateOrderData, UnitItem } from './useOrdersOptimized';
import { POINTS_TO_CURRENCY_RATE } from '@/components/orders/PayLaterPaymentDialog';
import { computePointsEarned } from '@/lib/pointsCalculation';

// Re-export types for convenience
export type { CreateOrderData, UnitItem };

const ORDERS_QUERY_KEY = ['orders'];

export const useCreateOrderWithNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { notifyOrderCreated } = useWhatsApp();
  const { currentStore } = useStore();
  
  // Ref to track if a mutation is in progress to prevent duplicate submissions
  const isCreatingRef = useRef(false);

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      // Prevent duplicate concurrent order creation
      if (isCreatingRef.current) {
        throw new Error('Order creation already in progress');
      }
      isCreatingRef.current = true;
      
      try {
        // First, insert the order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            subtotal: orderData.subtotal,
            tax_amount: orderData.tax_amount,
          total_amount: orderData.total_amount,
          discount_amount: orderData.discount_amount || 0,
          pointsts_redeemed: orderData.points_redeemed || 0,
          execution_status: orderData.execution_status || 'in_queue',
          payment_status: orderData.payment_status || 'pending',
          payment_method: orderData.payment_method,
          payment_amount: orderData.payment_amount,
          cash_received: orderData.cash_received,
          payment_notes: orderData.payment_notes,
          order_date: orderData.order_date || new Date().toISOString(),
          estimated_completion: orderData.estimated_completion,
          store_id: currentStore?.store_id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Then insert order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        service_name: item.service_name,
        service_price: item.service_price,
        quantity: Math.ceil(item.quantity),
        line_total: item.service_price * item.quantity,
        service_type: item.service_type,
        weight_kg: item.weight_kg,
        unit_items: item.service_type === 'kilo' ? 0 : item.unit_items,
        estimated_completion: item.estimated_completion,
        category: item.category,
        item_type: item.item_type || 'service',
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Deduct pointsts if customer redeemed pointsts for discount
      if (orderData.points_redeemed && orderData.points_redeemed > 0 && currentStore?.enable_points) {
        const { data: existingPoints, error: pointstsError } = await supabase
          .from('points')
          .select('point_id, current_points')
          .eq('customer_phone', orderData.customer_phone)
          .eq('store_id', currentStore?.store_id)
          .single();

        if (pointsError || !existingPoints) {
          throw new Error('Customer pointsts not found');
        }

        if (existingPoints.current_points < orderData.points_redeemed) {
          throw new Error('Insufficient pointsts');
        }

        // Deduct pointsts
        await supabase
          .from('points')
          .update({
            current_points: existingPoints.current_points - orderData.points_redeemed,
            updated_at: new Date().toISOString(),
          })
          .eq('point_id', existingPoints.point_id);

        // Create pointst transaction record for redemption
        await supabase
          .from('point_transactions')
          .insert({
            pointst_id: existingPoints.point_id,
            order_id: order.id,
            pointsts_changed: -orderData.points_redeemed,
            transaction_type: 'redemption',
            transaction_date: new Date().toISOString(),
            notes: `Points redeemed for order ${order.id.slice(0, 8)} (₹${orderData.discount_amount} discount)`,
          });
      }

      // Calculate and award pointsts if payment is successful AND store has pointsts enabled
      let pointstsEarned = 0;
      if (orderData.payment_status === 'completed' && currentStore?.enable_points) {
        // Calculate pointsts from the orderItems that were actually inserted
        pointstsEarned = computePointsEarned(orderItems);

        if (pointsEarned > 0) {
          // Atomic RPC: does the guard + pointsts upsert + ledger insert as a
          // single transaction, closing the race the old read-then-write
          // sequence had (two concurrent completions for the same new
          // customer could double-insert a pointsts row).
          const { data: awardResult, error: awardError } = await supabase.rpc('award_points_for_synced_order', {
            p_order_id: order.id,
            p_store_id: currentStore?.store_id,
            p_customer_phone: orderData.customer_phone,
            p_points_earned: pointstsEarned,
          });

          if (awardError) {
            // The order itself is already saved - only the pointsts award
            // failed. Reset to 0 so the success dialog and WhatsApp message
            // never claim pointsts that were never actually credited.
            console.error('Error awarding pointsts:', awardError);
            pointstsEarned = 0;
            toast({
              title: 'Points Failed',
              description: 'Order saved, but customer pointsts could not be added.',
              variant: 'destructive',
            });
          } else if (Array.isArray(awardResult) && awardResult[0]?.awarded === false) {
            // Guard did not match (already awarded for this order id) -
            // nothing new was credited this call.
            pointstsEarned = 0;
          }
        }
      }

      // Send WhatsApp notification (non-blocking)
      // We don't await this to avoid blocking the order creation
      (async () => {
        try {
          // Use store context data directly instead of querying by ID
          const storeInfo = WhatsAppDataHelper.getStoreInfoFromContext(currentStore);
          const orderItems = WhatsAppDataHelper.formatOrderItems(orderData.items);
          
          
          const notificationData: OrderCreatedData = {
            orderId: order.id,
            customerName: orderData.customer_name,
            totalAmount: orderData.total_amount,
            subtotal: orderData.subtotal,
            estimatedCompletion: WhatsAppDataHelper.formatEstimatedCompletion(orderData.estimated_completion),
            paymentStatus: orderData.payment_status || 'pending',
            orderItems,
            storeInfo,
            pointstsEarned: pointstsEarned > 0 ? pointstsEarned : undefined,
            pointstsRedeemed: orderData.points_redeemed && orderData.points_redeemed > 0 ? orderData.points_redeemed : undefined,
            discountAmount: orderData.discount_amount && orderData.discount_amount > 0 ? orderData.discount_amount : undefined,
          };

          await notifyOrderCreated(orderData.customer_phone, notificationData);
        } catch (error) {
          // Log WhatsApp notification errors but don't fail the order. Still
          // surface it to the user - this runs detached from the mutation so
          // notifyOrderCreated's own toasts on send failure never fire, and on
          // native builds there's no console access to see the console.warn.
          console.warn('WhatsApp notification failed:', error);
          toast({
            title: 'WhatsApp Failed',
            description: error instanceof Error ? error.message : 'Could not prepare WhatsApp notification - use Send via WhatsApp (Free) button',
            variant: 'destructive',
          });
        }
      })();

      // Return order with pointsts earned information
      return {
        ...order,
        pointsts_earned: pointstsEarned,
      };
      } finally {
        // Reset the flag after mutation completes (success or failure)
        isCreatingRef.current = false;
      }
    },
    onSuccess: () => {
      // Invalidate all order queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Order processed successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOrderStatusWithNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { notifyOrderReadyForPickup, notifyPaymentConfirmation } = useWhatsApp();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async ({
      orderId,
      executionStatus,
      paymentStatus,
      paymentMethod,
      paymentAmount,
      paymentNotes,
      executionNotes,
      cashReceived,
      pointstsRedeemed,
      discountAmount,
    }: {
      orderId: string;
      executionStatus?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      paymentAmount?: number;
      paymentNotes?: string;
      executionNotes?: string;
      cashReceived?: number;
      pointstsRedeemed?: number;
      discountAmount?: number;
    }) => {
      // Fetch current order data for WhatsApp notification
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            service_name,
            service_price,
            quantity,
            line_total,
            service_type,
            weight_kg,
            unit_items
          )
        `)
        .eq('id', orderId)
        .single();

      // Explicitly check if orderData exists, throw if not found
      if (!orderData) {
        throw new Error('Order not found');
      }

      // Validate pointsts availability BEFORE updating order (if pointsts redemption is requested)
      let customerPointsData: { pointst_id: number; current_points: number } | null = null;
      if (pointsRedeemed && pointstsRedeemed > 0 && currentStore?.enable_points) {
        const { data: existingPoints, error: pointstsError } = await supabase
          .from('points')
          .select('point_id, current_points')
          .eq('customer_phone', orderData.customer_phone)
          .eq('store_id', currentStore?.store_id)
          .single();

        if (pointsError) {
          console.error('Error fetching customer pointsts:', pointstsError);
          throw new Error(`Failed to lookup customer pointsts: ${pointsError.message}`);
        }
        
        if (!existingPoints) {
          throw new Error('Customer does not have a pointsts record');
        }

        if (existingPoints.current_points < pointstsRedeemed) {
          throw new Error(`Insufficient pointsts: customer has ${existingPoints.current_points} but tried to redeem ${pointsRedeemed}`);
        }

        // Store for later use after order update succeeds
        customerPointsData = existingPoints;
      }

      // Calculate and award pointsts if payment is being changed to "completed" AND store has pointsts enabled
      let pointstsEarned = 0;
      const wasPaymentPending = orderData.payment_status === 'pending';
      const isPaymentCompleted = paymentStatus === 'completed';

      if (wasPaymentPending && isPaymentCompleted && currentStore?.enable_points && orderData) {
        // Calculate pointsts from the order items
        orderData.order_items?.forEach((item: any) => {
          if (item.service_type === 'kilo' && item.weight_kg) {
            // 1 pointst per kg (rounded)
            pointstsEarned += Math.round(item.weight_kg);
          } else if (item.service_type === 'unit') {
            // 1 pointst per unit
            pointstsEarned += item.quantity;
          } else if (item.service_type === 'combined') {
            // For combined, count both weight and units
            if (item.weight_kg) {
              pointstsEarned += Math.round(item.weight_kg);
            }
            pointstsEarned += item.quantity;
          }
        });

        if (pointsEarned > 0) {
          // Update pointsts table
          const { data: existingPoints } = await supabase
            .from('points')
            .select('point_id, accumulated_points, current_points')
            .eq('customer_phone', orderData.customer_phone)
            .eq('store_id', currentStore?.store_id)
            .single();

          let pointstId: number;

          if (existingPoints) {
            // Add to existing pointsts
            await supabase
              .from('points')
              .update({
                accumulated_points: existingPoints.accumulated_points + pointstsEarned,
                current_points: existingPoints.current_points + pointstsEarned,
                updated_at: new Date().toISOString(),
              })
              .eq('point_id', existingPoints.point_id);

            pointstId = existingPoints.point_id;
          } else {
            // Create new customer pointsts record
            const { data: newPoint } = await supabase
              .from('points')
              .insert({
                customer_phone: orderData.customer_phone,
                accumulated_points: pointstsEarned,
                current_points: pointstsEarned,
                store_id: currentStore?.store_id,
              })
              .select('point_id')
              .single();

            pointstId = newPoint?.point_id;
          }

          // Create pointst transaction record for earning pointsts
          if (pointId) {
            await supabase
              .from('point_transactions')
              .insert({
                pointst_id: pointstId,
                order_id: orderId,
                pointsts_changed: pointstsEarned,
                transaction_type: 'earning',
                transaction_date: new Date().toISOString(),
                notes: `Points earned from order ${orderId.slice(0, 8)}`,
              });
          }
        }
      }

      // Update the order status
      const updateData: any = {};
      if (executionStatus !== undefined) updateData.execution_status = executionStatus;
      if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
      if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
      if (paymentAmount !== undefined) updateData.payment_amount = paymentAmount;
      if (paymentNotes !== undefined) updateData.payment_notes = paymentNotes;
      if (executionNotes !== undefined) updateData.execution_notes = executionNotes;
      if (cashReceived !== undefined) updateData.cash_received = cashReceived;
      if (discountAmount !== undefined && discountAmount > 0) {
        // Add the new discount to any existing discount
        const existingDiscount = orderData.discount_amount || 0;
        const totalDiscount = existingDiscount + discountAmount;
        updateData.discount_amount = totalDiscount;
        // Update total_amount to reflect the total discount
        // Note: subtotal should always exist in the order data
        if (!orderData.subtotal) {
          throw new Error('Order subtotal is missing - cannot calculate discount');
        }
        updateData.total_amount = orderData.subtotal - totalDiscount;
      }
      if (pointsRedeemed !== undefined && pointstsRedeemed > 0) {
        // Add the new pointsts redeemed to any existing pointsts redeemed
        // Note: pointstsRedeemed is for tracking only; the monetary value
        // is already included in discountAmount (points × 100 Rupiah)
        const existingPointsRedeemed = orderData.points_redeemed || 0;
        const totalPointsRedeemed = existingPointsRedeemed + pointstsRedeemed;
        updateData.points_redeemed = totalPointsRedeemed;
      }
      if (pointsEarned > 0) updateData.points_earned = pointstsEarned;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Deduct pointsts AFTER order update succeeds (to prevent pointsts loss if order update fails)
      if (customerPointsData && pointstsRedeemed && pointstsRedeemed > 0) {
        // Deduct pointsts
        const { error: pointstsUpdateError } = await supabase
          .from('points')
          .update({
            current_points: customerPointsData.current_points - pointstsRedeemed,
            updated_at: new Date().toISOString(),
          })
          .eq('point_id', customerPointsData.point_id);

        if (pointsUpdateError) {
          console.error('Error deducting pointsts:', pointstsUpdateError);
          // Note: Order is already updated at this pointst, so we log but don't throw
          // Consider implementing a compensation mechanism if this becomes a problem
        }

        // Create pointst transaction record for redemption
        const { error: transactionError } = await supabase
          .from('point_transactions')
          .insert({
            pointst_id: customerPointsData.point_id,
            order_id: orderId,
            pointsts_changed: -pointsRedeemed,
            transaction_type: 'redemption',
            transaction_date: new Date().toISOString(),
            notes: `Points redeemed for order ${orderId.slice(0, 8)} (₹${discountAmount || pointstsRedeemed * POINTS_TO_CURRENCY_RATE} discount)`,
          });

        if (transactionError) {
          console.error('Error creating pointst transaction:', transactionError);
          // Note: Points already deducted, so we log but don't throw
        }
      }

      // Send WhatsApp notification when payment is completed with pointsts earned or when pointsts were redeemed
      if (wasPaymentPending && isPaymentCompleted && orderData) {
        (async () => {
          try {
            // Use store context data directly instead of querying by ID
            const storeInfo = WhatsAppDataHelper.getStoreInfoFromContext(currentStore);

            const notificationData: PaymentConfirmationData = {
              orderId: orderId,
              customerName: orderData.customer_name,
              paymentStatus: 'completed',
              storeInfo,
              pointstsEarned: pointstsEarned > 0 ? pointstsEarned : undefined,
            };

            await notifyPaymentConfirmation(orderData.customer_phone, notificationData);
          } catch (error) {
            // Log WhatsApp notification errors but don't fail the status update.
            // Still surface it - this runs detached from the mutation so
            // notifyPaymentConfirmation's own failure toast never fires, and on
            // native builds there's no console access to see the console.warn.
            console.warn('WhatsApp notification failed:', error);
            toast({
              title: 'WhatsApp Failed',
              description: error instanceof Error ? error.message : 'Could not prepare WhatsApp notification - use Send via WhatsApp (Free) button',
              variant: 'destructive',
            });
          }
        })();
      }

      // Send WhatsApp notification for ready for pickup orders
      if (executionStatus === 'ready_for_pickup' && orderData) {
        (async () => {
          try {
            // Use store context data directly instead of querying by ID
            const storeInfo = WhatsAppDataHelper.getStoreInfoFromContext(currentStore);
            const orderItems = WhatsAppDataHelper.formatOrderItems(orderData.order_items || []);


            const notificationData: OrderReadyForPickupData = {
              orderId: orderId,
              customerName: orderData.customer_name,
              totalAmount: orderData.total_amount,
              readyAt: WhatsAppDataHelper.formatCompletionDate(new Date().toISOString()),
              orderItems,
              storeInfo,
              paymentStatus: paymentStatus || orderData.payment_status,
            };

            await notifyOrderReadyForPickup(orderData.customer_phone, notificationData);
          } catch (error) {
            // Log WhatsApp notification errors but don't fail the status update.
            // Still surface it - this runs detached from the mutation so
            // notifyOrderReadyForPickup's own failure toast never fires, and on
            // native builds there's no console access to see the console.warn.
            console.warn('WhatsApp notification failed:', error);
            toast({
              title: 'WhatsApp Failed',
              description: error instanceof Error ? error.message : 'Could not prepare WhatsApp notification - use Send via WhatsApp (Free) button',
              variant: 'destructive',
            });
          }
        })();
      }

      return { orderId, executionStatus, pointstsEarned };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });
};
