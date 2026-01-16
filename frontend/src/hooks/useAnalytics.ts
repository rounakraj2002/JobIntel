import { useCallback } from 'react';

export function useAnalytics() {
  const trackClick = useCallback(async (eventType: string, eventData?: any) => {
    try {
      // Get session ID from cookies
      const sessionId = document.cookie
        .split('; ')
        .find(row => row.startsWith('sessionId='))
        ?.split('=')[1];

      if (!sessionId) {
        console.debug('[Analytics] No session ID found');
        return;
      }

      // Send click event to backend
      await fetch('/api/analytics/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          eventType,
          eventData,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('[Analytics] Failed to track event:', error);
    }
  }, []);

  return { trackClick };
}
