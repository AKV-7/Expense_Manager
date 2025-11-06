'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      
      // Fetch user info with the new token
      api.get('/auth/me')
        .then((response) => {
          if (response.data.success) {
            localStorage.setItem('user', JSON.stringify(response.data.data));
            router.push('/dashboard');
          } else {
            router.push('/login?error=user_fetch_failed');
          }
        })
        .catch((error) => {
          console.error('Failed to fetch user:', error);
          router.push('/login?error=user_fetch_failed');
        });
    } else {
      router.push('/login?error=oauth_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
