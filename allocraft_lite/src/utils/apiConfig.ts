/**
 * API Configuration Utility
 * Provides dynamic port detection and flexible API base URL configuration
 */

// Default port range for backend development
const DEFAULT_PORTS = [8001, 8000, 8002, 8003, 8004];

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
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }

  // For development, default to 8001 (current backend port)
  return 'http://127.0.0.1:8001';
};

// Function to test if a port is available/responding
export const testApiPort = async (port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    // Try alternative health endpoint
    try {
      const response = await fetch(`http://127.0.0.1:${port}/docs`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Auto-detect working backend port from common development ports
export const autoDetectBackendPort = async (): Promise<string> => {
  console.log('Auto-detecting backend port...');
  
  for (const port of DEFAULT_PORTS) {
    console.log(`Testing port ${port}...`);
    const isWorking = await testApiPort(port);
    if (isWorking) {
      console.log(`✅ Found working backend on port ${port}`);
      return `http://127.0.0.1:${port}`;
    }
  }
  
  console.warn('⚠️ No working backend detected, falling back to default');
  return 'http://127.0.0.1:8001'; // Default fallback
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
    return cachedApiBaseUrl;
  }

  // Auto-detect and cache
  const detectedUrl = await autoDetectBackendPort();
  cachedApiBaseUrl = detectedUrl;
  return detectedUrl;
};

// Clear cache (useful for testing or when backend restarts)
export const clearApiUrlCache = (): void => {
  cachedApiBaseUrl = null;
};

export default {
  getApiBaseUrl,
  testApiPort,
  autoDetectBackendPort,
  getCachedApiBaseUrl,
  clearApiUrlCache
};
