import { describe, it, expect } from 'vitest';
import { WhatsAppClient } from './client';

describe('WhatsAppClient.formatPhoneNumber', () => {
  it('leaves a number already in 91-prefixed format unchanged', () => {
    expect(WhatsAppClient.formatPhoneNumber('919876543210')).toBe('919876543210');
  });

  it('strips a leading + from an international format', () => {
    expect(WhatsAppClient.formatPhoneNumber('+919876543210')).toBe('919876543210');
  });

  it('replaces a leading 0 with the country code', () => {
    expect(WhatsAppClient.formatPhoneNumber('09876543210')).toBe('919876543210');
  });

  it('prepends the country code when neither 0 nor 91 is present', () => {
    expect(WhatsAppClient.formatPhoneNumber('9876543210')).toBe('919876543210');
  });

  it('strips spaces and dashes before normalizing', () => {
    expect(WhatsAppClient.formatPhoneNumber('09876-543-210')).toBe('919876543210');
  });

  it('supports a non-default country code', () => {
    expect(WhatsAppClient.formatPhoneNumber('0234567890', '1')).toBe('1234567890');
  });

  it('does not double-prefix a 0 + country code input (e.g. 091...)', () => {
    expect(WhatsAppClient.formatPhoneNumber('0919876543210')).toBe('919876543210');
  });
});
