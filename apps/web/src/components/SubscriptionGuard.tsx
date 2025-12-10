'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_URL } from '@/lib/utils';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isLoaded || !user) {
        setIsChecking(false);
        return;
      }

      // Always allow access to subscription page
      if (pathname === '/dashboard/subscription') {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me?userId=${user.id}`);
        if (!response.ok) {
          router.push('/dashboard/subscription');
          return;
        }

        const userData = await response.json();
        
        // Check if user has an active subscription
        const hasActiveSubscription = 
          userData.stripeSubscriptionId && 
          userData.subscriptionStatus !== 'cancelled';

        if (!hasActiveSubscription) {
          router.push('/dashboard/subscription?message=subscription_required');
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
        router.push('/dashboard/subscription');
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [user, isLoaded, router, pathname]);

  if (!isLoaded || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
