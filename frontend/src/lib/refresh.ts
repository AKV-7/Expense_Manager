/**
 * Trigger a global data refresh across all components
 * This will dispatch a custom event that components can listen to
 */
export function triggerGlobalRefresh() {
  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('data-refresh'));
    
    // Also trigger storage event for cross-tab sync
    localStorage.setItem('last-refresh', Date.now().toString());
  }
}

/**
 * Hook to listen for global refresh events
 * @param callback Function to call when refresh is triggered
 */
export function useGlobalRefresh(callback: () => void) {
  if (typeof window === 'undefined') return;

  const handleRefresh = () => {
    callback();
  };

  // Listen for custom event
  window.addEventListener('data-refresh', handleRefresh);
  
  // Listen for storage event (cross-tab sync)
  window.addEventListener('storage', (e) => {
    if (e.key === 'last-refresh') {
      callback();
    }
  });

  return () => {
    window.removeEventListener('data-refresh', handleRefresh);
    window.removeEventListener('storage', handleRefresh);
  };
}
