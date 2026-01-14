import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Normalize API calls to the configured backend when running in the browser.
// This ensures all calls to /api/* go to the backend specified by VITE_API_URL
// (set in Netlify environment variables) instead of being routed to the static host.
if (typeof window !== 'undefined') {
  // Prefer build-time VITE_API_URL. If it's missing (e.g., Netlify env not set for some reason),
  // provide a safe runtime fallback for our deployed site so API calls don't hit the static host.
  const envBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  let backendBase = envBase;

  if (!backendBase) {
    // Fallback for the public Netlify site if env wasn't provided during build
    const host = window.location.hostname;
    if (host === 'jobintell.netlify.app') {
      backendBase = 'https://jobintel-backend.onrender.com';
      console.warn('[runtime] VITE_API_URL not set — falling back to', backendBase);
    }
  }

  if (backendBase) {
    const origFetch = window.fetch.bind(window);
    // @ts-ignore - augment global fetch
    window.fetch = (input: RequestInfo, init?: RequestInit) => {
      try {
        if (typeof input === 'string' && input.startsWith('/api/')) {
          input = backendBase + input;
        }
      } catch (e) {
        // ignore
      }
      return origFetch(input, init);
    };

    // Patch EventSource to use absolute backend base for relative API stream paths
    // @ts-ignore
    const OrigEventSource = window.EventSource;
    // @ts-ignore
    window.EventSource = function(url: string, ...args: any[]) {
      let u = url;
      try {
        if (typeof u === 'string' && u.startsWith('/api/')) {
          u = backendBase + u;
        }
      } catch (e) {
        // ignore
      }
      // @ts-ignore
      return new OrigEventSource(u, ...args);
    } as any;
  }
}

createRoot(document.getElementById("root")!).render(<App />);
