'use client';

import dynamic from 'next/dynamic';

// Import Toaster dynamically with no SSR to avoid hydration issues with browser extensions
const Toaster = dynamic(() => import('@/components/toaster').then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});

export function ToasterWrapper() {
  return <Toaster />;
}
