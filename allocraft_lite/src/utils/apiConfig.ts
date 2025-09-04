/**
 * API Configuration Utility
 * Provides dynamic port detection and flexible API base URL configuration
 */

// Default port range for backend development
const DEFAULT_PORTS = [8000, 8001, 8002, 8003, 8004];

// Get API base URL from environment or detect dynamically
export const getApiBaseUrl = (): string => {
  // First, check environment variable
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    console.log('Using API base URL from environment:', envUrl);
    return envUrl;
  }

  // If no environment variable, try to detect from current setup
  // This is useful during development when ports might change
  const detectedUrl = detectApiBaseUrl();
  console.log('Detected API base URL:', detectedUrl);
  return detectedUrl;
};

// Detect API base URL by checking common development ports
const detectApiBaseUrl = (): string => {
  // For production or when VITE_API_BASE_URL is set, use that
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  // For development, default to 8000 (current backend port)
  return 'http://127.0.0.1:8000';
};

// Function to test if a port is available/responding
export const testApiPort = async (port: number): Promise<boolean> => {
    try {
        // Try the health endpoint first
        const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
            method: 'GET',
            signal: AbortSignal.timeout(1500) // 1.5 second timeout for speed
        });
        if (response.ok) return true;
    } catch {
        // Ignore and try next endpoint
    }
    
    try {
        // Try alternative health endpoint
        const response = await fetch(`http://127.0.0.1:${port}/docs`, {
            method: 'GET',
            signal: AbortSignal.timeout(1500)
        });
        if (response.ok) return true;
    } catch {
        // Ignore and try next endpoint
    }
    
    try {
        // Try basic API endpoint
        const response = await fetch(`http://127.0.0.1:${port}/portfolio/positions`, {
            method: 'GET',
            signal: AbortSignal.timeout(1500)
        });
        // Even if we get 401/403, the server is running
        return response.status !== 0 && response.status < 500;
    } catch {
        return false;
    }
};

// Auto-detect working backend port from common development ports  
export const autoDetectBackendPort = async (): Promise<string> => {
  console.log('🔍 Auto-detecting backend port across 8000, 8001, 8002...');

  // Test ports in parallel for speed
  const portPromises = DEFAULT_PORTS.map(async (port) => {
    const isWorking = await testApiPort(port);
    return { port, isWorking };
  });

  try {
    const results = await Promise.all(portPromises);
    
    for (const { port, isWorking } of results) {
      if (isWorking) {
        console.log(`✅ Found working backend on port ${port}`);
        return `http://127.0.0.1:${port}`;
      }
    }
  } catch (error) {
    console.warn('⚠️ Error during port detection:', error);
  }

  console.warn('⚠️ No working backend detected on ports 8000-8004, falling back to 8000');
  console.warn('💡 Make sure your backend is running on one of these ports: 8000, 8001, 8002');
  return 'http://127.0.0.1:8000'; // Default fallback
};

// Cached API base URL to avoid repeated detection
let cachedApiBaseUrl: string | null = null;

// Get cached or detect API base URL
export const getCachedApiBaseUrl = async (): Promise<string> => {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  // Check environment first
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    cachedApiBaseUrl = envUrl;
    return envUrl;
  }

  // Auto-detect and cache
  try {
    const detectedUrl = await autoDetectBackendPort();
    cachedApiBaseUrl = detectedUrl;
    return detectedUrl;
  } catch (error) {
    console.error('❌ Failed to detect backend port:', error);
    cachedApiBaseUrl = 'http://127.0.0.1:8000'; // Final fallback
    return cachedApiBaseUrl;
  }
};

// Clear cache and retry detection (useful when backend restarts)
export const clearApiUrlCache = (): void => {
  cachedApiBaseUrl = null;
  console.log('🔄 API URL cache cleared - next request will re-detect backend port');
};

export default {
  getApiBaseUrl,
  testApiPort,
  autoDetectBackendPort,
  getCachedApiBaseUrl,
  clearApiUrlCache
};
