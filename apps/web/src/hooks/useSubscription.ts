'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { hasFeatureAccess, getAIConversationLimit, SubscriptionPlan } from '@/lib/subscription-limits';
import { API_URL } from '@/lib/utils';

export function useSubscription() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const hasActiveSubscription = subscription?.stripeSubscriptionId && 
    subscription?.subscriptionStatus !== 'cancelled';

  const plan = hasActiveSubscription ? subscription?.subscriptionPlan : null;

  return {
    subscription,
    loading,
    hasActiveSubscription,
    plan: plan as SubscriptionPlan | null,
    hasFeature: (feature: string) => hasFeatureAccess(plan, feature),
    aiConversationLimit: getAIConversationLimit(plan),
  };
}
