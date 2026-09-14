#!/bin/bash
set -e

echo "🚀 Starting Production Deployment..."

# Build check
echo "📦 Testing build locally..."
npm run build

# Deploy to production
echo "🌐 Deploying to Vercel production..."
vercel --prod

# Get deployment URL
echo "✅ Deployment completed!"
echo "🔗 Your app is live at: https://muftgo-laundry.vercel.app"

# Optional: Run post-deployment tests
echo "🧪 Running post-deployment health checks..."
curl -f https://muftgo-laundry.vercel.app/health || echo "⚠️  Health check failed"

echo "🎉 Production deployment successful!"