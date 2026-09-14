#!/bin/bash

# MuftGo Laundry POS - PWA Setup Script
echo "🚀 Setting up PWA for MuftGo Laundry POS..."

# Run from repo root (no hardcoded machine path)
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the correct project directory"
    exit 1
fi

echo "✅ PWA setup completed successfully!"
echo ""
echo "📱 How to test your PWA:"
echo "1. Open Chrome/Edge and navigate to http://localhost:4173/"
echo "2. Open DevTools (F12) → Application → Service Workers"
echo "3. Check the manifest in Application → Manifest"
echo "4. On mobile devices, you'll see 'Add to Home Screen' banner"
echo "5. The PWA install button should appear in the header"
echo ""
echo "🔧 PWA Features enabled:"
echo "• ✅ Service Worker for offline support"
echo "• ✅ Web App Manifest"
echo "• ✅ Install prompt"
echo "• ✅ Offline fallback page"
echo "• ✅ Mobile-optimized icons"
echo "• ✅ Background sync ready"
echo "• ✅ Push notifications ready"
echo ""
echo "📦 To deploy as PWA:"
echo "1. Build: npm run build"
echo "2. Deploy to your hosting (Vercel/Netlify)"
echo "3. Users can install directly from browser"
echo ""
echo "🎯 Android Installation:"
echo "• Chrome: Shows install banner automatically"
echo "• Manual: Chrome menu → 'Install app'"
echo "• Your button: Click install button in header"
