// Feature limits for each subscription tier
export const SUBSCRIPTION_LIMITS = {
  starter: {
    aiConversationsPerMonth: 50,
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'invoice_generation',
      'quote_generation',
      'payment_processing',
    ],
  },
  pro: {
    aiConversationsPerMonth: 200,
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'lead_scoring',
      'invoice_generation',
      'quote_generation',
      'contract_generation',
      'payment_processing',
      'custom_ai_training',
      'team_collaboration',
    ],
  },
  ultimate: {
    aiConversationsPerMonth: -1, // Unlimited
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'lead_scoring',
      'invoice_generation',
      'quote_generation',
      'contract_generation',
      'payment_processing',
      'custom_ai_training',
      'team_collaboration',
      'white_label',
      'api_access',
      'multi_location',
      'priority_support',
    ],
  },
};

export type SubscriptionPlan = 'starter' | 'pro' | 'ultimate';
export type Feature = string;

export function hasFeatureAccess(plan: SubscriptionPlan | null, feature: Feature): boolean {
  if (!plan) return false;
  const limits = SUBSCRIPTION_LIMITS[plan];
  return limits?.features.includes(feature) ?? false;
}

export function getAIConversationLimit(plan: SubscriptionPlan | null): number {
  if (!plan) return 0;
  return SUBSCRIPTION_LIMITS[plan]?.aiConversationsPerMonth ?? 0;
}

export function getPlanName(plan: string | null): string {
  const names: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    ultimate: 'Ultimate',
  };
  return plan ? names[plan] || plan : 'No Plan';
}
