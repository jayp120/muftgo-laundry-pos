/**
 * India-first helpers for MuftGo Laundry POS (Pune)
 * Single source of truth for currency, phones, payments.
 */

export const DEFAULT_COUNTRY_CODE = '91';

export const formatINR = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
};

export const formatINRPlain = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('en-IN');
};

export const formatDateIN = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTimeIN = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return `${date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
};

/** Normalize any Indian input to 91XXXXXXXXXX for WhatsApp API */
export function normalizePhoneIN(raw: string, cc = DEFAULT_COUNTRY_CODE): string {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  // already with country code
  if (d.startsWith(cc) && d.length === cc.length + 10) return d;
  // 10-digit Indian mobile starting 6-9
  if (/^[6-9]\d{9}$/.test(d)) return cc + d;
  // 12-digit starting 91 without +
  if (/^91[6-9]\d{9}$/.test(d)) return d;
  // fallback: strip leading 91 zeros confusion
  if (d.length > 10 && d.endsWith(d.slice(-10)) && /^[6-9]/.test(d.slice(-10))) {
    return cc + d.slice(-10);
  }
  return d.startsWith(cc) ? d : cc + d;
}

export function isValidIndianMobile(raw: string): boolean {
  const d = raw.replace(/\D/g, '').replace(/^0+/, '');
  const ten = d.startsWith('91') && d.length === 12 ? d.slice(2) : d.slice(-10);
  return /^[6-9]\d{9}$/.test(ten);
}

export const formatDisplayIN = (raw: string): string => {
  const norm = normalizePhoneIN(raw);
  const ten = norm.slice(-10);
  if (ten.length !== 10) return raw;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
};

export const buildWaMeLink = (to: string, msg: string): string => {
  return `https://wa.me/${normalizePhoneIN(to)}?text=${encodeURIComponent(msg)}`;
};

export const PAYMENT_METHODS_IN = [
  { id: 'cash', label: 'Cash', desc: 'Cash payment' },
  { id: 'upi', label: 'UPI', desc: 'GPay / PhonePe / Paytm UPI' },
  { id: 'card', label: 'Card', desc: 'Debit / Credit card' },
] as const;

export type PaymentMethodIN = 'cash' | 'upi' | 'card' | 'cash_dp' | 'pending';

export function paymentLabel(method?: string): string {
  if (!method) return 'Cash';
  const m = method.toLowerCase();
  if (m === 'upi' || m === 'qris') return 'UPI'; // backward compat with old data
  if (m === 'transfer') return 'Card';
  if (m === 'tunai') return 'Cash';
  if (m === 'cash_dp') return 'Cash (Advance)';
  if (m === 'pending') return 'Pay Later';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

// Escape user input for PostgREST .or(ilike) filter to prevent 400 blank screens
export function escapePostgrestLike(s: string): string {
  return s.replace(/[%(),"]/g, '').replace(/\./g, '').trim().slice(0, 50);
}
