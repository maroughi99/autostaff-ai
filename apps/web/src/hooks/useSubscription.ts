'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { hasFeatureAccess, getAIConversationLimit, SubscriptionPlan } from '@/lib/subscription-limits';
import { API_URL } from '@/lib/utils';

export function useSubscription() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Admin emails with full access
  const adminEmails = ['tonymaroughi@gmail.com', 'sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'gtaconcretemasonryinc@gmail.com', 'jonmormont.414817@gmail.com'];
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    adminEmails.includes(user.primaryEmailAddress.emailAddress.toLowerCase());

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

  // Admin users always have active subscription with ultimate plan
  const hasActiveSubscription = isAdmin || (
    subscription?.subscriptionStatus === 'active' || 
    subscription?.subscriptionStatus === 'trial'
  );

  const plan = isAdmin ? 'ultimate' : (hasActiveSubscription ? subscription?.subscriptionPlan : null);

  return {
    subscription,
    loading,
    hasActiveSubscription,
    plan: plan as SubscriptionPlan | null,
    hasFeature: (feature: string) => isAdmin ? true : hasFeatureAccess(plan, feature),
    aiConversationLimit: isAdmin ? null : getAIConversationLimit(plan),
  };
}
