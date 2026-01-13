import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Stripe configuration error');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

export function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  
  // Security: Never use localhost in production
  if (process.env.NODE_ENV === 'production' && !url) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }
  
  return url || 'http://localhost:3000';
}
