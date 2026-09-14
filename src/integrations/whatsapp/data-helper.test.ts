import { describe, it, expect } from 'vitest';
import { WhatsAppDataHelper } from './data-helper';
import type { StoreInfo } from './types';

const baseStoreInfo: StoreInfo = {
  name: 'Test Store',
  address: 'Test Address',
  phone: '919876543210',
};

describe('WhatsAppDataHelper.getWhatsAppSender', () => {
  it('returns the sender id when the feature is enabled and a sender is set', () => {
    const result = WhatsAppDataHelper.getWhatsAppSender({
      ...baseStoreInfo,
      wa_use_store_number: true,
      wa_sender_id: '919111111111',
    });
    expect(result).toBe('919111111111');
  });

  it('returns undefined when the feature is enabled but no sender is registered', () => {
    const result = WhatsAppDataHelper.getWhatsAppSender({
      ...baseStoreInfo,
      wa_use_store_number: true,
      wa_sender_id: null,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when the feature is disabled, even if a sender is set', () => {
    const result = WhatsAppDataHelper.getWhatsAppSender({
      ...baseStoreInfo,
      wa_use_store_number: false,
      wa_sender_id: '919111111111',
    });
    expect(result).toBeUndefined();
  });

  it('never falls back to stores.phone - phone is display-only', () => {
    const result = WhatsAppDataHelper.getWhatsAppSender({
      ...baseStoreInfo,
      phone: '919999999999',
      wa_use_store_number: true,
      wa_sender_id: undefined,
    });
    expect(result).toBeUndefined();
  });
});
