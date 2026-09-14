import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  Zap,
  Receipt,
  MessageSquare,
  BarChart3,
  Store,
  Gift,
  Megaphone,
  Smartphone,
  Globe,
  Wifi,
  Download,
  ArrowRight,
} from 'lucide-react';
import { PWAInstallButton } from '@/components/ui/PWAInstallButton';
import { WhatsAppFloatingButton } from '@/components/ui/WhatsAppFloatingButton';
import './LandingPage.css';

const FONT_LINK_ID = 'tk-landing-fonts';

/** MuftGo-owned Android build - published on every tagged release. */
import { APK_DOWNLOAD_URL, GITHUB_RELEASES_URL } from '@/lib/app-links';
const ANDROID_APK_URL = APK_DOWNLOAD_URL;

const AndroidIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.61 15.15C16.15 15.15 15.77 14.78 15.77 14.32S16.15 13.5 16.61 13.5H16.61C17.07 13.5 17.45 13.86 17.45 14.32C17.45 14.78 17.07 15.15 16.61 15.15M7.41 15.15C6.95 15.15 6.57 14.78 6.57 14.32C6.57 13.86 6.95 13.5 7.41 13.5H7.41C7.87 13.5 8.24 13.86 8.24 14.32C8.24 14.78 7.87 15.15 7.41 15.15M16.91 10.14L18.58 7.26C18.67 7.09 18.61 6.88 18.45 6.79C18.28 6.69 18.07 6.75 18 6.92L16.29 9.83C14.95 9.22 13.5 8.9 12 8.91C10.47 8.91 9 9.24 7.73 9.82L6.04 6.91C5.95 6.74 5.74 6.68 5.57 6.78C5.4 6.87 5.35 7.08 5.44 7.25L7.1 10.13C4.25 11.69 2.29 14.58 2 18H22C21.72 14.59 19.77 11.7 16.91 10.14H16.91Z" />
  </svg>
);

const useLandingFonts = () => {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const features = [
  {
    serial: '0231',
    icon: Zap,
    title: 'Super-Fast Billing',
    description: 'Weigh, select service, print - morning rush never piles up at the counter.',
  },
  {
    serial: '0454',
    icon: Receipt,
    title: 'Auto Receipts & e-Receipts',
    description: 'Every order gets a clean bill with weight, items and UPI total. Share on WhatsApp in 1 tap.',
  },
  {
    serial: '0512',
    icon: MessageSquare,
    title: 'Real-time WhatsApp Alerts',
    description: 'Customer knows exactly when laundry is ready. No more “is it done?” phone calls.',
  },
  {
    serial: '0687',
    icon: BarChart3,
    title: 'Daily Revenue Dashboard',
    description: 'Collections, UPI vs Cash, peak hours - all on one screen for the owner.',
  },
  {
    serial: '0733',
    icon: Store,
    title: 'Multi-Store & Multi-Staff',
    description: 'Open 2nd, 3rd, 4th outlet in Pune - one system, not one notebook per shop.',
  },
  {
    serial: '0810',
    icon: Gift,
    title: 'Loyalty Points',
    description: 'Points auto-credit on paid orders. The reason customers return to your shop.',
  },
  {
    serial: '0902',
    icon: Megaphone,
    title: 'Promo Broadcast',
    description: 'Send Diwali / monsoon offers to all customers on WhatsApp in one click.',
  },
];

const benefits = [
  'Multi-store management',
  'Real-time order tracking',
  'Automatic price calculation (per-kg / per-piece)',
  'UPI / Cash / Card billing in ₹',
  'WhatsApp customer notifications + free 1-tap send',
  'Expense & revenue reports',
  'Staff management',
  'Offline mode with auto-sync',
];

const comparisonRows: {
  feature: string;
  smart: 'yes';
  other: 'yes' | 'no' | 'partial';
  note?: string;
}[] = [
  { feature: 'Built for laundry (per-kg / per-piece)', smart: 'yes', other: 'no', note: 'General POS' },
  { feature: 'Fast laundry entry + combo items', smart: 'yes', other: 'no' },
  { feature: 'Receipt + e-receipt with UPI total', smart: 'yes', other: 'partial', note: 'Basic' },
  { feature: 'Laundry loyalty points', smart: 'yes', other: 'no' },
  { feature: 'Automatic WhatsApp alerts', smart: 'yes', other: 'no' },
  { feature: 'Promo broadcast to customers', smart: 'yes', other: 'partial', note: 'Manual' },
  { feature: 'Multi-outlet laundry tracking', smart: 'yes', other: 'partial' },
  { feature: 'Wash status queue (in-queue → ready)', smart: 'yes', other: 'no' },
  { feature: 'Made for India (₹, UPI, +91)', smart: 'yes', other: 'no' },
  { feature: 'Owner-friendly price: ₹1000/mo', smart: 'yes', other: 'partial', note: 'Costlier' },
];

const faqs: { question: string; answer: string }[] = [
  {
    question: 'Is there a free demo for my Pune shop?',
    answer:
      'Yes. 1-month free demo, no credit card. We set up your store, services (Wash ₹80/kg etc.) and UPI QR in 5 minutes. Your data stays yours.',
  },
  {
    question: 'Does it work without internet?',
    answer:
      'Yes. Offline mode queues orders on the device and syncs automatically when back online. Perfect for shops with unstable signal.',
  },
  {
    question: 'Per-kg, per-piece and combo?',
    answer:
      'Yes. Per-kg from weight, per-piece per item (shoes, blankets), combo combines weight + count in one order. Points: 1 per kg/unit.',
  },
  {
    question: 'Multiple branches?',
    answer:
      'Yes. Multi-store + multi-staff in one login for owners. Staff sees only their store, owner sees all.',
  },
  {
    question: 'Will customers get WhatsApp updates?',
    answer:
      'Yes. Order created, ready-for-pickup and payment confirmations. Plus a free one-tap “Send via WhatsApp” button that needs zero setup - uses your own WhatsApp.',
  },
  {
    question: 'How is this different from general billing apps?',
    answer:
      'General apps are built for kirana/restaurants. MuftGo is built for laundry workflow: weigh, auto price per kg/unit, track wash status, WhatsApp alerts - features general POS does not have.',
  },
  {
    question: 'Loyalty points?',
    answer:
      'Yes. Smart Points auto-credit on paid orders when you enable it in Store Settings. Redeem for discounts (1 point = ₹1).',
  },
  {
    question: 'Do I need to install from Play Store?',
    answer:
      'No. Runs in browser and installs as an app (PWA) from home screen on Android, iPhone, Windows, Mac. Or download the Android APK below for direct install.',
  },
  {
    question: 'What after demo? Price?',
    answer:
      '₹1000 per month per store after demo - hosting, backup, WhatsApp templates, new features and support included. Yearly ₹10,000 (2 months free).',
  },
];

const Mark: React.FC<{ value: 'yes' | 'no' | 'partial'; note?: string }> = ({ value, note }) => {
  if (value === 'yes') return <span className="tk-check">✓</span>;
  if (value === 'no')
    return (
      <span className="tk-cross">
        ✕{note ? <span className="block text-[0.65rem] font-normal normal-case tk-mono text-[var(--tk-graphite-soft)]">{note}</span> : null}
      </span>
    );
  return (
    <span className="tk-partial">
      ~{note ? <span className="block text-[0.65rem] font-normal normal-case tk-mono text-[var(--tk-graphite-soft)]">{note}</span> : null}
    </span>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  useLandingFonts();
  usePageMeta({
    title: 'MuftGo Laundry POS - Laundry Billing Software for Pune, India',
    description:
      'Modern POS for Indian laundry shops: orders, UPI billing in ₹, WhatsApp alerts, loyalty & reports. A product by MuftGo (muftgo.com). 1-month free demo, then ₹1000/mo.',
    path: '/',
  });

  return (
    <div className="tk-page min-h-screen pb-24 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--tk-line)] bg-[rgba(245,240,228,0.95)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-2 sm:gap-3">
              <div className="w-9 h-9 flex-shrink-0 border-2 border-[var(--tk-ink)] rounded-sm flex items-center justify-center tk-mono font-bold text-[var(--tk-ink)] text-sm">
                MG
              </div>
              <div className="min-w-0">
                <span className="block text-base sm:text-lg font-bold text-[var(--tk-graphite)] truncate">
                  MuftGo Laundry POS
                </span>
                <p className="text-[0.7rem] tk-mono tracking-wide text-[var(--tk-graphite-soft)] hidden sm:block">
                  A PRODUCT BY <a href="https://muftgo.com" className="underline">MUFTGO.COM</a> · PUNE, INDIA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <PWAInstallButton className="!bg-transparent !border-[var(--tk-line)] !text-[var(--tk-ink)] hover:!bg-[var(--tk-paper-soft)]" />
              <button
                onClick={() => navigate('/install')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--tk-line)] rounded-sm text-[var(--tk-ink-soft)] hover:bg-[var(--tk-paper-soft)] transition-colors"
              >
                <Download className="h-4 w-4" />
                Install Guide
              </button>
              <a
                href={ANDROID_APK_URL}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm border border-[var(--tk-line)] text-[var(--tk-ink-soft)] hover:bg-[var(--tk-paper-soft)] transition-colors"
              >
                <AndroidIcon className="h-4 w-4" />
                Android APK
              </a>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-4 sm:px-5 py-2 text-sm sm:text-base font-semibold rounded-sm bg-[var(--tk-ink)] text-[var(--tk-paper)] hover:bg-[var(--tk-graphite)] transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="tk-hero-ticket rounded-sm overflow-hidden">
            <div className="tk-hero-barcode" />
            <div className="flex items-center justify-between px-6 sm:px-10 py-3 border-b border-dashed border-[var(--tk-line)] tk-mono text-xs sm:text-sm text-[var(--tk-graphite-soft)] tracking-widest uppercase">
              <span>Laundry Bill — MuftGo POS</span>
              <span>No. 00142 · Pune</span>
            </div>

            <div className="px-6 sm:px-10 py-10 sm:py-14">
              <span className="tk-eyebrow mb-6">For per-kg & per-piece laundry in India</span>

              <h1 className="text-[2.1rem] leading-[1.12] sm:text-5xl sm:leading-[1.1] lg:text-6xl font-bold text-[var(--tk-graphite)] mb-6 max-w-3xl">
                Billing that runs as fast as your morning rush.
              </h1>
              <p className="text-lg sm:text-xl text-[var(--tk-ink-soft)] mb-3 max-w-2xl">
                MuftGo Laundry POS tracks weight, price in ₹, and wash status from counter to pickup
                - built only for laundry, not a generic kirana billing app.
              </p>
              <p className="text-base sm:text-lg text-[var(--tk-graphite-soft)] mb-8 max-w-2xl">
                No paper slips that get lost. No manual calculator maths. UPI + WhatsApp built-in.
              </p>

              <div className="flex flex-wrap gap-x-8 gap-y-3 mb-9 tk-mono text-sm">
                <div>
                  <div className="text-[var(--tk-graphite-soft)] text-xs tracking-widest uppercase">Weight</div>
                  <div className="font-bold text-[var(--tk-graphite)] text-lg">2.4 KG</div>
                </div>
                <div>
                  <div className="text-[var(--tk-graphite-soft)] text-xs tracking-widest uppercase">Total</div>
                  <div className="font-bold text-[var(--tk-graphite)] text-lg">₹240</div>
                </div>
                <div>
                  <div className="text-[var(--tk-graphite-soft)] text-xs tracking-widest uppercase">Pay</div>
                  <div className="font-bold text-[var(--tk-graphite)] text-lg">UPI · Cash · Card</div>
                </div>
                <div className="flex items-end">
                  <span className="tk-stamp">Ready for Pickup</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => navigate('/login?tab=signup')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-bold rounded-sm bg-[var(--tk-ink)] text-[var(--tk-paper)] hover:bg-[var(--tk-graphite)] transition-colors"
                >
                  Start 1-Month Free Demo
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-semibold rounded-sm border border-[var(--tk-ink)] text-[var(--tk-ink)] hover:bg-[rgba(35,50,74,0.05)] transition-colors"
                >
                  See How It Works
                </a>
              </div>
              <p className="mt-4 text-sm text-[var(--tk-graphite-soft)]">
                Made for Pune shops · ₹1000/mo after demo · By <a href="https://muftgo.com" className="underline font-semibold">muftgo.com</a>
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-sm sm:text-base text-[var(--tk-graphite-soft)] tk-mono">
            FREE DEMO · NO CREDIT CARD · LIVE IN 5 MINUTES
          </p>
        </div>
      </section>

      <div className="tk-perforation" />

      {/* Trust strip */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center tk-mono text-sm">
          <div className="tk-stub rounded-sm !p-4"><div className="font-bold text-lg">₹</div><div>INR billing en-IN</div></div>
          <div className="tk-stub rounded-sm !p-4"><div className="font-bold text-lg">UPI</div><div>GPay / PhonePe / Paytm</div></div>
          <div className="tk-stub rounded-sm !p-4"><div className="font-bold text-lg">+91</div><div>WhatsApp alerts</div></div>
          <div className="tk-stub rounded-sm !p-4"><div className="font-bold text-lg">Pune</div><div>Made for India</div></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="tk-eyebrow mb-5">Everything a laundry counter needs</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--tk-graphite)] mb-4">
              One app from weighing to pickup
            </h2>
            <p className="text-lg text-[var(--tk-ink-soft)] max-w-2xl mx-auto">
              Search customer by mobile, add services, bill on UPI, send WhatsApp - all in under a minute.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.serial} className="tk-stub rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <f.icon className="h-7 w-7 text-[var(--tk-carbon)]" />
                  <span className="tk-mono text-xs text-[var(--tk-graphite-soft)]">{f.serial}</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--tk-graphite)] mb-2">{f.title}</h3>
                <p className="text-[var(--tk-ink-soft)]">{f.description}</p>
              </div>
            ))}
            <div className="tk-stub rounded-sm !border-dashed">
              <Smartphone className="h-7 w-7 mb-3 text-[var(--tk-carbon)]" />
              <h3 className="text-lg font-bold mb-2">Works as Mobile App + APK</h3>
              <p className="mb-4">Install from browser (PWA) or download the Android APK. Offline-ready.</p>
              <div className="flex flex-col gap-2">
                <PWAInstallButton />
                <a href={ANDROID_APK_URL} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold border rounded-sm hover:bg-[rgba(35,50,74,0.05)]">
                  <AndroidIcon className="h-4 w-4" /> Download APK (muftgo.com)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="tk-eyebrow mb-5">Why MuftGo, not general billing?</span>
            <h2 className="text-3xl md:text-4xl font-bold">Built for laundry, not kirana shops</h2>
          </div>
          <div className="tk-boarding rounded-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="tk-mono text-xs uppercase tracking-widest">
                  <th className="text-left p-4">Feature</th>
                  <th className="p-4">MuftGo</th>
                  <th className="p-4">Others</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((r) => (
                  <tr key={r.feature} className="border-t border-[var(--tk-line)]">
                    <td className="p-4 font-medium">{r.feature}</td>
                    <td className="p-4 text-center"><Mark value="yes" /></td>
                    <td className="p-4 text-center"><Mark value={r.other} note={r.note} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="tk-stub rounded-sm !p-8">
            <span className="tk-eyebrow mb-4">1-Month Free Demo</span>
            <div className="text-4xl font-bold mb-2">₹0</div>
            <p className="mb-6">Full system for your Pune shop. We set up store, services & UPI QR. No card.</p>
            <ul className="space-y-2 mb-6 text-sm">
              <li>✓ Orders + UPI billing + receipts</li>
              <li>✓ WhatsApp alerts + free 1-tap send</li>
              <li>✓ Customer search + loyalty points</li>
              <li>✓ Reports + offline mode</li>
            </ul>
            <button onClick={() => navigate('/login?tab=signup')} className="w-full py-3 font-bold rounded-sm bg-[var(--tk-ink)] text-[var(--tk-paper)]">Claim Free Demo</button>
          </div>
          <div className="tk-boarding rounded-sm !p-8">
            <span className="tk-eyebrow mb-4">After Demo</span>
            <div className="text-4xl font-bold mb-2">₹1000<span className="text-lg font-normal">/mo</span></div>
            <p className="mb-6">Per store. Hosting, backup, WhatsApp templates, updates & support included. Yearly ₹10,000.</p>
            <ul className="space-y-2 mb-6 text-sm">
              <li>✓ Everything in demo, continued</li>
              <li>✓ Priority WhatsApp + printer support</li>
              <li>✓ Data export anytime (Excel)</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <a href="https://muftgo.com" className="block text-center w-full py-3 font-bold rounded-sm border border-[var(--tk-ink)]">Talk to MuftGo → muftgo.com</a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="tk-eyebrow mb-6">Complete Solution</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--tk-graphite)] mb-5">
                Why Pune owners choose MuftGo?
              </h2>
              <p className="text-lg text-[var(--tk-ink-soft)] mb-8">
                Made for Indian laundry with ₹ pricing, UPI, +91 WhatsApp and features that matter daily.
                A product by <a href="https://muftgo.com" className="underline font-semibold">MuftGo</a>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <span className="tk-mono text-[var(--tk-paid)] font-bold">✓</span>
                    <span className="text-[var(--tk-graphite)]">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tk-boarding rounded-sm p-8 sm:p-10">
              <Smartphone className="h-10 w-10 mb-4 text-[var(--tk-carbon)]" />
              <h3 className="text-2xl font-bold mb-2">Install as Mobile App</h3>
              <p className="opacity-80 mb-6">
                Full mobile experience with offline support and instant access from home screen.
              </p>
              <div className="space-y-3 tk-mono text-sm">
                <div className="flex items-center gap-3">
                  <Wifi className="h-4 w-4 flex-shrink-0" />
                  <span>Works offline when needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 flex-shrink-0" />
                  <span>Super-fast performance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span>Access from anywhere</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <a href={ANDROID_APK_URL} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-sm bg-[var(--tk-ink)] text-[var(--tk-paper)]">
                  <AndroidIcon className="h-4 w-4" /> Download Android APK
                </a>
                <span className="text-xs opacity-70 text-center">Signed release · updates in-place · via GitHub Releases</span>
                <a href={GITHUB_RELEASES_URL} className="text-xs opacity-70 text-center underline">All versions & release notes</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="tk-perforation" />

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="tk-eyebrow mb-5">FAQs</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--tk-graphite)] mb-4">
              What Pune owners usually ask
            </h2>
            <p className="text-lg text-[var(--tk-ink-soft)] max-w-2xl mx-auto">
              Short answers before you move from paper slips.
            </p>
          </div>

          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.question} className="tk-stub rounded-sm">
                <h3 className="text-lg font-bold text-[var(--tk-graphite)] mb-2">{faq.question}</h3>
                <p className="text-[var(--tk-ink-soft)]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center bg-[#fffdf8] border border-[var(--tk-line)] rounded-sm p-8 sm:p-14">
          <span className="tk-eyebrow mb-6">For New Shop Owners</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--tk-graphite)] mb-6 leading-tight">
            Ready to modernise your laundry?
          </h2>
          <p className="text-lg text-[var(--tk-ink-soft)] mb-10 max-w-2xl mx-auto">
            Join Pune laundries using MuftGo Laundry POS to save time and keep customers happy.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            <div className="tk-stub rounded-sm !p-5">
              <div className="tk-stub__num">A</div>
              <p className="font-bold text-[var(--tk-graphite)] mb-1">Start free</p>
              <p className="text-sm text-[var(--tk-graphite-soft)]">No credit card needed</p>
            </div>
            <div className="tk-stub rounded-sm !p-5">
              <div className="tk-stub__num">B</div>
              <p className="font-bold text-[var(--tk-graphite)] mb-1">5-min setup</p>
              <p className="text-sm text-[var(--tk-graphite-soft)]">Feel the difference today</p>
            </div>
            <div className="tk-stub rounded-sm !p-5">
              <div className="tk-stub__num">C</div>
              <p className="font-bold text-[var(--tk-graphite)] mb-1">₹1000/mo after</p>
              <p className="text-sm text-[var(--tk-graphite-soft)]">No long contract</p>
            </div>
          </div>

          <div className="tk-tear pt-8">
            <button
              onClick={() => navigate('/login?tab=signup')}
              className="inline-flex items-center gap-2 px-8 sm:px-10 py-4 text-lg font-bold rounded-sm bg-[var(--tk-ink)] text-[var(--tk-paper)] hover:bg-[var(--tk-graphite)] transition-colors"
            >
              Get Free Demo Now
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-5 text-sm tk-mono uppercase tracking-wide text-[var(--tk-graphite-soft)]">
              No setup fee · No contract · Start now
            </p>
          </div>
        </div>
      </section>

      {/* Footer - MuftGo property */}
      <footer className="tk-ink-band py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 border-2 border-[var(--tk-paper)] rounded-sm flex items-center justify-center tk-mono font-bold text-sm">
                  MG
                </div>
                <span className="text-lg font-bold">MuftGo Laundry POS</span>
              </div>
              <p className="opacity-75 mb-2 max-w-md">
                Modern billing built for Indian laundry. Simplify operations, grow your shop.
              </p>
              <p className="opacity-75 mb-6 max-w-md text-sm">
                A product by <a href="https://muftgo.com" className="underline font-bold opacity-100">MuftGo · https://muftgo.com</a> · Pune, Maharashtra, India
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <PWAInstallButton
                  variant="outline"
                  className="!bg-transparent !border-white/25 !text-[var(--tk-paper)] hover:!bg-white/10"
                />
                <button
                  onClick={() => navigate('/install')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-white/25 rounded-sm hover:bg-white/10 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Install Guide
                </button>
                <a
                  href={ANDROID_APK_URL}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-white/25 rounded-sm hover:bg-white/10 transition-colors"
                >
                  <AndroidIcon className="h-4 w-4" />
                  Download APK
                </a>
              </div>
              <div className="opacity-80 text-sm">
                <p className="mb-1">
                  <strong className="opacity-100">Contact:</strong>{' '}
                  <a
                    href="mailto:support@muftgo.com"
                    className="underline decoration-white/30 hover:decoration-white"
                  >
                    support@muftgo.com
                  </a>{' '}· <a href="https://muftgo.com" className="underline">muftgo.com</a>
                </p>
                <p>For questions, technical support or live demo in Pune</p>
              </div>
            </div>

            <div>
              <h3 className="tk-mono text-xs uppercase tracking-widest mb-4 opacity-70">Features</h3>
              <ul className="space-y-2 opacity-80 text-sm">
                <li>Order Management</li>
                <li>Customer Database</li>
                <li>UPI Payment</li>
                <li>Reports & Analytics</li>
                <li>Multi-store Support</li>
              </ul>
            </div>

            <div>
              <h3 className="tk-mono text-xs uppercase tracking-widest mb-4 opacity-70">Support</h3>
              <ul className="space-y-2 opacity-80 text-sm">
                <li>Documentation</li>
                <li>Video Tutorials</li>
                <li>Customer Support</li>
                <li>Feature Requests</li>
                <li>System Status</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/15 mt-10 pt-8 text-center opacity-70 text-sm">
            <p>© 2026 MuftGo Laundry POS. A product by <a href="https://muftgo.com" className="underline">MuftGo · https://muftgo.com</a> · Made for laundry shops in Pune, India.</p>
            <p className="mt-2">
              Contact:{' '}
              <a href="mailto:support@muftgo.com" className="underline decoration-white/30 hover:decoration-white">
                support@muftgo.com
              </a>
            </p>
          </div>
        </div>
      </footer>
      <WhatsAppFloatingButton />
    </div>
  );
};
