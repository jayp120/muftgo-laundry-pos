import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  StartQRRegistrationResponse,
  StartCodeRegistrationResponse,
  RegistrationStatusResponse,
  CheckSenderResponse,
} from './types';

// Web uses same-origin relative path. Native WebView (capacitor://localhost)
// has no backend at its origin, so bake in VITE_APP_ORIGIN like client.ts does.
const APP_ORIGIN =
  (import.meta.env.VITE_APP_ORIGIN as string | undefined) || 'https://muftgo.com';

const ENDPOINT = Capacitor.isNativePlatform()
  ? `${APP_ORIGIN}/api/wa-sender-register`
  : '/api/wa-sender-register';

async function post<T extends { success: boolean }>(body: Record<string, unknown>): Promise<T> {
  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        data: body,
        connectTimeout: 15000,
        readTimeout: 15000,
      });
      if (response.status < 200 || response.status >= 300) {
        const errorText =
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` } as T;
      }
      if (response.data && typeof response.data === 'object') {
        return response.data as T;
      }
      if (typeof response.data === 'string') {
        try {
          return JSON.parse(response.data) as T;
        } catch {
          return { success: false, error: 'Invalid server response' } as T;
        }
      }
      return { success: false, error: 'Invalid server response' } as T;
    }

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data as T;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    } as T;
  }
}

/**
 * Client for api/wa-sender-register.js (the WhatsPoints sender
 * registration proxy). One POST body per action, matching the proxy's
 * dispatch - see that file for why (keeps this off the service worker's
 * cache-first GET handling).
 */
export const WhatsAppSenderClient = {
  startQRRegistration(): Promise<StartQRRegistrationResponse> {
    return post<StartQRRegistrationResponse>({ action: 'qr' });
  },

  startCodeRegistration(phoneNumber: string): Promise<StartCodeRegistrationResponse> {
    return post<StartCodeRegistrationResponse>({ action: 'code', phone_number: phoneNumber });
  },

  getRegistrationStatus(sessionId: string): Promise<RegistrationStatusResponse> {
    return post<RegistrationStatusResponse>({ action: 'status', session_id: sessionId });
  },

  /**
   * Checks whether a phone number is already a registered WhatsPoints
   * sender. The proxy filters server-side - the full sender list (every
   * store's numbers) never reaches this client.
   */
  checkSender(phoneNumber: string): Promise<CheckSenderResponse> {
    return post<CheckSenderResponse>({ action: 'check', phone_number: phoneNumber });
  },
};
