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
    let timeoutId: NodeJS.Timeout;
    
    const checkSubscription = async () => {
      if (!isLoaded) {
        return;
      }

      if (!user) {
        setIsChecking(false);
        setHasAccess(true); // Allow access if not logged in (Clerk will handle auth)
        return;
      }

      // Always allow access to subscription page
      if (pathname === '/dashboard/subscription') {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Admin bypass - grant full access
      const adminEmails = ['sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com'];
      const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
      if (userEmail && adminEmails.includes(userEmail)) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('Subscription check timed out, allowing access');
        setHasAccess(true);
        setIsChecking(false);
      }, 5000); // 5 second timeout

      try {
        const response = await fetch(`${API_URL}/auth/me?userId=${user.id}`, {
          signal: AbortSignal.timeout(4000), // 4 second fetch timeout
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          router.push('/dashboard/subscription');
          return;
        }

        const userData = await response.json();
        
        // Check if user has an active subscription or trial
        const hasActiveSubscription = 
          userData.stripeSubscriptionId && 
          (userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trial');

        if (!hasActiveSubscription) {
          router.push('/dashboard/subscription?message=subscription_required');
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to check subscription:', error);
        // On error, allow access to avoid blocking users
        setHasAccess(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, isLoaded, router, pathname]);

  if (!isLoaded || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess && user) {
    return null;
  }

  return <>{children}</>;
}
