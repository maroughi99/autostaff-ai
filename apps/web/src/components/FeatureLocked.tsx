'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureLockedProps {
  feature: string;
  requiredPlan: string;
  description?: string;
}

export function FeatureLocked({ feature, requiredPlan, description }: FeatureLockedProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Feature Locked</CardTitle>
            <CardDescription>
              {description || `This feature requires the ${requiredPlan} plan`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upgrade to <strong>{requiredPlan}</strong> to unlock this feature and get access to:
          </p>
          <ul className="text-sm text-gray-600 space-y-2 ml-4">
            <li>• {feature}</li>
            {requiredPlan === 'Pro' && (
              <>
                <li>• 200 AI conversations per month</li>
                <li>• Lead scoring & analytics</li>
                <li>• Custom AI training</li>
              </>
            )}
            {requiredPlan === 'Ultimate' && (
              <>
                <li>• Unlimited AI conversations</li>
                <li>• White-label options</li>
                <li>• API access</li>
                <li>• Priority support</li>
              </>
            )}
          </ul>
          <Link href="/pricing">
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              Upgrade to {requiredPlan}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
