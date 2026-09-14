import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { WhatsAppConfig, WhatsAppMessage, WhatsAppResponse } from './types';

// On native platforms, an absolute cross-origin fetch() from the WebView's
// `https://localhost` origin to the deployed API domain is a real browser CORS
// request - and "Failed to fetch" is the generic error a WebView throws for it
// with no further detail, regardless of whether the server's CORS headers are
// actually correct. Native HTTP requests aren't subject to same-origin/CORS at
// all, so routing through Capacitor's native bridge sidesteps the whole class
// of WebView-network quirks. Falls back to a JSON-parsed body the same way the
// web fetch path does, since the WhatsApp API doesn't always set a JSON
// Content-Type on its response.
const parseNativeBody = (data: unknown): WhatsAppResponse => {
  if (data && typeof data === 'object') {
    return data as WhatsAppResponse;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { success: true, message: 'Message sent successfully', id: 'unknown' };
    }
  }
  return { success: true, message: 'Message sent successfully', id: 'unknown' };
};

// baseUrl is a same-origin relative path ('/api/whatsapp-send') on the web
// deployment, but an absolute URL ('https://.../api/whatsapp-send') on native
// builds, which bake in VITE_APP_ORIGIN (see whatsapp-config.ts) since the
// packaged app's WebView has no same-origin backend to resolve a relative
// path against. Resolving against a dummy base handles both forms uniformly
// (the base is ignored when baseUrl is already absolute) and normalizes dot
// segments. Compares the pathname exactly (not a prefix) so it doesn't
// false-match '/api/whatsapp-sender', '/api/whatsapp-send-message', a
// sub-path, or the local dev proxy's distinct '/api/whatsapp' base URL.
const isVercelFunctionUrl = (baseUrl: string): boolean => {
  let pathname: string;
  try {
    pathname = new URL(baseUrl, 'http://localhost/').pathname;
  } catch {
    return false;
  }
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized === '/api/whatsapp-send';
};

/**
 * WhatsApp API Client
 * Handles communication with the WhatsApp messaging service
 */
export class WhatsAppClient {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = {
      timeout: 10000, // Default 10 seconds timeout
      ...config,
    };
  }

  /**
   * Send a WhatsApp message
   * @param message The message to send
   * @returns Promise with the response
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Validate input
      if (!message.to || !message.message) {
        throw new Error('Both "to" and "message" fields are required');
      }

      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(message.to)) {
        throw new Error('Invalid phone number format. Use 10-digit Indian mobile, e.g. 919876543210');
      }

      // Validate from field if provided
      if (message.from && !this.isValidPhoneNumber(message.from)) {
        throw new Error('Invalid sender phone number format. Use 10-digit Indian mobile, e.g. 919876543210');
      }

      // Determine if we're using local proxy, Vercel serverless function, or direct API
      const isUsingLocalProxy = this.config.baseUrl.includes('localhost') && this.config.baseUrl.includes('/api/whatsapp');
      const isUsingVercelFunction = isVercelFunctionUrl(this.config.baseUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add authorization header if not using proxy or Vercel function (they handle auth)
      if (!isUsingLocalProxy && !isUsingVercelFunction) {
        headers['Authorization'] = `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
      }

      // Determine the correct endpoint
      let endpoint = `${this.config.baseUrl}/send-message`;
      if (isUsingVercelFunction) {
        endpoint = this.config.baseUrl; // Vercel function URL is complete
      }

      // Create request exactly like Postman example
      const requestBody: { to: string; message: string; from?: string } = {
        to: message.to,
        message: message.message,
      };

      // Include from field if provided (multi-sender support)
      if (message.from) {
        requestBody.from = message.from;
      }

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.post({
          url: endpoint,
          headers,
          data: requestBody,
          connectTimeout: this.config.timeout,
          readTimeout: this.config.timeout,
        });

        if (response.status < 200 || response.status >= 300) {
          const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return parseNativeBody(response.data);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();

      // Try to parse as JSON, if it fails, return a generic success response
      let result: WhatsAppResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not JSON, assume success based on HTTP status
        result = {
          success: true,
          message: 'Message sent successfully',
          id: 'unknown',
        };
      }

      return result;
    } catch (error) {
      console.error('WhatsApp API Error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: 'Request timed out',
            error: 'TIMEOUT',
          };
        }
        
        return {
          success: false,
          message: 'Failed to send message',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Unknown error occurred',
        error: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Test the connection to WhatsApp API
   * @returns Promise indicating if the connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessage: WhatsAppMessage = {
        to: '919876543210', // Test number that won't actually receive a message
        message: 'Connection test - this message should not be sent',
      };

      // Determine if we're using local proxy, Vercel serverless function, or direct API
      const isUsingLocalProxy = this.config.baseUrl.includes('localhost') && this.config.baseUrl.includes('/api/whatsapp');
      const isUsingVercelFunction = isVercelFunctionUrl(this.config.baseUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add authorization header if not using proxy or Vercel function
      if (!isUsingLocalProxy && !isUsingVercelFunction) {
        headers['Authorization'] = `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
      }

      // Determine the correct endpoint
      let endpoint = `${this.config.baseUrl}/send-message`;
      if (isUsingVercelFunction) {
        endpoint = this.config.baseUrl; // Vercel function URL is complete
      }
      // Fix: local dev proxy uses /api/whatsapp base, not /api/whatsapp/api/send-message
      if (this.config.baseUrl.includes('/api/whatsapp') && !isUsingVercelFunction) {
        endpoint = `${this.config.baseUrl.replace(/\/$/, '')}/send-message`;
      }

      const testBody = JSON.stringify({ ...testMessage, message: '' }); // Empty message to test auth

      // Don't actually send the test message, just test the API endpoint.
      // 401 = upstream auth failed, 500 = server misconfigured (see api/whatsapp-send.js
      // which checks env before body). Any other status (e.g. 400 for the empty
      // message) means the endpoint is reachable and configured.
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.post({
          url: endpoint,
          headers,
          data: { ...testMessage, message: '' },
          connectTimeout: 5000,
          readTimeout: 5000,
        });

        return response.status !== 401 && response.status !== 500;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: testBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.status !== 401 && response.status !== 500;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate phone number format - India-first (10-digit mobile starting 6-9,
   * optionally with +91 / 91 prefix). Rejects obviously invalid numbers early
   * so mis-typed customer numbers fail fast instead of failing at the API.
   * @param phoneNumber The phone number to validate
   * @returns true if valid, false otherwise
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    const ten = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
    return /^[6-9]\d{9}$/.test(ten);
  }

  /**
   * Format phone number to use "91" prefix without "+" sign (India default).
   * Strips leading zeros first so "09198..." doesn't become "9191...".
   * @param phoneNumber The phone number to format
   * @param defaultCountryCode Default country code if not provided (e.g., '91' for India)
   * @returns Formatted phone number with "91" prefix only (e.g., "919876543210")
   */
  static formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '91'): string {
    // Remove all non-digit characters (including "+") and strip leading zeros
    const cleaned = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleaned) return '';
    
    // If already starts with country code
    if (cleaned.startsWith(defaultCountryCode)) {
      return cleaned;
    }
    
    // If starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      return `${defaultCountryCode}${cleaned.substring(1)}`;
    }
    
    // If doesn't start with country code, add default country code
    return `${defaultCountryCode}${cleaned}`;
  }
}
