'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, TrendingUp, ArrowRight } from 'lucide-react';

export default function SubscriptionPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  
  // Check if redirected due to missing subscription
  const showSubscriptionMessage = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('message') === 'subscription_required';

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchInvoices();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      if (!user?.id) return;
      // Fetch user data from database
      const response = await fetch(`http://localhost:3001/auth/me?userId=${user.id}`);
      const userData = await response.json();
      console.log('Subscription data:', userData);
      setSubscription(userData);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      if (!user?.id) return;
      // First get the database user ID
      const userResponse = await fetch(`http://localhost:3001/auth/me?userId=${user.id}`);
      const userData = await userResponse.json();
      
      if (!userData.id) return;

      // Fetch billing history
      const response = await fetch(`http://localhost:3001/stripe/billing-history/${userData.id}`);
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSyncSubscription = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User not logged in');
      }
      // First get the database user ID
      const userResponse = await fetch(`http://localhost:3001/auth/me?userId=${user.id}`);
      const userData = await userResponse.json();

      if (!userData.id) {
        throw new Error('User not found');
      }

      // Sync subscription from Stripe
      const response = await fetch(`http://localhost:3001/stripe/sync-subscription/${userData.id}`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Subscription synced successfully!');
        fetchSubscription(); // Refresh the subscription data
      }
    } catch (error) {
      console.error('Failed to sync subscription:', error);
      alert('Failed to sync subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User not logged in');
      }
      
      // First get the database user ID
      const userResponse = await fetch(`http://localhost:3001/auth/me?userId=${user.id}`);
      const userData = await userResponse.json();

      if (!userData.id) {
        throw new Error('User not found');
      }

      const response = await fetch('http://localhost:3001/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
          returnUrl: `${window.location.origin}/dashboard/subscription`,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' }> = {
      trial: { label: 'Free Trial', variant: 'default' as const },
      trialing: { label: 'Free Trial', variant: 'default' as const },
      active: { label: 'Active', variant: 'default' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
      past_due: { label: 'Past Due', variant: 'destructive' as const },
    };

    const config = statusConfig[status] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanName = (plan: string) => {
    const plans: Record<string, string> = {
      starter: 'Starter',
      pro: 'Pro',
      ultimate: 'Ultimate',
    };
    return plans[plan] || plan;
  };

  if (loadingSubscription) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        {/* Subscription Required Message */}
        {showSubscriptionMessage && (
          <div className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800">
                <strong>⚠️ Subscription Required:</strong> You need an active subscription to access dashboard features. Please choose a plan below.
              </p>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-2">Subscription</h1>
        <p className="text-gray-600 mb-8">
          Manage your subscription and billing information
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Current Plan</CardTitle>
                {subscription && subscription.stripeSubscriptionId && getStatusBadge(subscription.subscriptionStatus)}
              </div>
              <CardDescription>
                {subscription?.aiConversationsLimit !== null && subscription?.aiConversationsLimit !== undefined
                  ? `${subscription.aiConversationsUsed || 0}/${subscription.aiConversationsLimit} AI conversations used this month`
                  : `${subscription?.aiConversationsUsed || 0} AI conversations used (Unlimited)`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription && subscription.stripeSubscriptionId ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">
                      {getPlanName(subscription.subscriptionPlan)}
                    </p>
                    {(subscription.subscriptionStatus === 'trial' || subscription.subscriptionStatus === 'trialing') && subscription.trialEndsAt && (
                      <p className="text-sm text-gray-600 mt-2">
                        Trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}
                      </p>
                    )}
                    {(subscription.subscriptionStatus === 'trial' || subscription.subscriptionStatus === 'trialing') && !subscription.trialEndsAt && subscription.stripeCurrentPeriodEnd && (
                      <p className="text-sm text-gray-600 mt-2">
                        Trial ends on {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {subscription.stripeCurrentPeriodEnd && subscription.subscriptionStatus === 'active' && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Renews on {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">No active subscription</p>
                  <Button
                    onClick={() => (window.location.href = '/pricing')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Start Free Trial
                  </Button>
                </div>
              )}
            </CardContent>
            {subscription && subscription.stripeSubscriptionId && (
              <CardFooter>
                <Button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {loading ? 'Loading...' : 'Manage Billing'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Upgrade Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-xl">Upgrade Your Plan</CardTitle>
              <CardDescription>Get more features and capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Unlimited AI conversations</span>
                </li>
                <li className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Advanced automation</span>
                </li>
                <li className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Custom AI training</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => (window.location.href = '/pricing')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                View Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="py-8 text-center text-gray-600">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-gray-600 py-8 text-center">
                No billing history yet. Your first invoice will appear here after your trial ends.
              </p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">
                          {invoice.number || 'Invoice'}
                        </p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(invoice.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold">
                        ${invoice.amount.toFixed(2)} {invoice.currency}
                      </p>
                      {invoice.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.pdfUrl, '_blank')}
                        >
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
