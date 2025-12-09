'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export function UserSync() {
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) {
      fetch('http://localhost:3001/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
        }),
      }).catch(err => console.error('Failed to sync user:', err));
    }
  }, [user]);

  return null;
}
