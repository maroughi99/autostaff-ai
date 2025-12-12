'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';
import { API_URL } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 99,
    priceId: 'price_1SapXvGndNudz61YnAU6kLOn',
    description: 'Perfect for solo contractors and small teams',
    features: [
      '50 AI conversations per month',
      'Email integration & automation',
      'Calendar management',
      'Lead tracking',
      'Invoice & quote generation',
      'Payment processing',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: 199,
    priceId: 'price_1SapfOGndNudz61Yq2d7vGdX',
    description: 'For growing businesses',
    features: [
      '200 AI conversations per month',
      'Email integration & automation',
      'Advanced calendar management',
      'Lead tracking & scoring',
      'Invoice, quote & contract generation',
      'Payment processing',
      'Priority email support',
      'Custom AI training',
      'Team collaboration',
    ],
    popular: true,
  },
  {
    name: 'Ultimate',
    price: 399,
    priceId: 'price_1SapgGGndNudz61YR2ky1Psy',
    description: 'For established companies',
    features: [
      'Unlimited AI conversations',
      'Email integration & automation',
      'Full calendar automation',
      'Advanced lead management & analytics',
      'Invoice, quote & contract generation',
      'Payment processing',
      'Priority support + Dedicated account manager',
      'Custom AI training',
      'White-label options',
      'API access',
      'Multi-location support',
    ],
  },
];

export default function PricingPage() {
  const { user, isSignedIn } = useUser();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  
  // Check if redirected due to missing subscription
  const showSubscriptionMessage = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('message') === 'subscription_required';

  const handleSubscribe = async (priceId: string) => {
    if (!isSignedIn) {
      // Redirect to sign up
      window.location.href = '/sign-up';
      return;
    }

    setLoading(priceId);

    try {
      // First, get the database user ID from Clerk ID
      const userResponse = await fetch(`${API_URL}/auth/me?userId=${user.id}`);

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      
      if (userData.error || !userData.id) {
        throw new Error(userData.error || 'User not found');
      }

      // Now create checkout session with database user ID
      const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id, // Use database ID, not Clerk ID
          priceId: priceId,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=cancelled`,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Subscription Required Message */}
        {showSubscriptionMessage && (
          <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <p className="text-sm md:text-base text-blue-800 text-center">
                <strong>Subscription Required:</strong> Please subscribe to access dashboard features.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 px-4">
            Start with a 7-day free trial. Credit card required but not charged until trial ends.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                billingInterval === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                billingInterval === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1 md:ml-2 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
          {plans.map((plan) => {
            const monthlyPrice = plan.price;
            const yearlyPrice = Math.round(plan.price * 12 * 0.8); // 20% discount on annual
            const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
            
            return (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? 'border-blue-500 border-2 shadow-xl md:scale-105'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-500 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pt-6 md:pt-8 px-4 md:px-6">
                  <CardTitle className="text-xl md:text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="mt-2 text-sm md:text-base">{plan.description}</CardDescription>
                  
                  <div className="mt-4 md:mt-6">
                    <span className="text-4xl md:text-5xl font-bold text-gray-900">${displayPrice}</span>
                    <span className="text-sm md:text-base text-gray-600 ml-2">
                      /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                    {billingInterval === 'yearly' && (
                      <div className="text-xs md:text-sm text-green-600 font-semibold mt-2">
                        Save ${Math.round(plan.price * 12 * 0.2)}/year
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-4 md:px-6">
                  <ul className="space-y-2 md:space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm md:text-base text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="px-4 md:px-6">
                  <Button
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={loading === plan.priceId}
                    className={`w-full text-sm md:text-base ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    {loading === plan.priceId ? 'Loading...' : 'Start Free Trial'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-12 md:mt-16 px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2">How does the free trial work?</h3>
              <p className="text-sm md:text-base text-gray-600">
                You get full access to all features of your chosen plan for 7 days. Credit card required to start trial, but you won't be charged until the trial period ends.
                You'll only be charged after the trial ends if you decide to continue.
              </p>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-sm md:text-base text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll
                prorate the difference.
              </p>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm md:text-base text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment
                processor, Stripe.
              </p>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm md:text-base text-gray-600">
                Absolutely. You can cancel your subscription at any time from your account settings. You'll continue
                to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
