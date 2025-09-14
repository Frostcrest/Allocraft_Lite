/**
 * Production HTTPS Schwab Integration Tester
 * Use this component to verify your production deployment
 */

import { useState, useEffect } from 'react';
import { validateSchwabCredentials } from '@/utils/schwabValidator';

interface TestResults {
  environment: {
    apiBase: string;
    clientId: string;
    redirectUri: string;
    isReady: boolean;
    issues: string[];
  } | null;
  backend: {
    status: string;
    generalHealth?: any;
    schwabHealth?: any;
    error?: string;
  } | null;
  schwabConfig: any;
  oauth: {
    status: string;
    authUrl?: string;
    containsHTTPS?: boolean;
    error?: string;
  } | null;
}

export default function ProductionSchwabTester() {
  const [testResults, setTestResults] = useState<TestResults>({
    environment: null,
    backend: null,
    schwabConfig: null,
    oauth: null
  });

  const [isLoading, setIsLoading] = useState(false);

  // Environment check
  useEffect(() => {
    const { config, isReady, issues } = validateSchwabCredentials();

    setTestResults(prev => ({
      ...prev,
      environment: {
        apiBase: (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
        clientId: config.clientId ? 'Configured' : 'Missing',
        redirectUri: config.redirectUri,
        isReady,
        issues
      }
    }));
  }, []);

  const runBackendHealthCheck = async () => {
    setIsLoading(true);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

      // Test general health
      const healthResponse = await fetch(`${apiBase}/healthz`);
      const healthData = await healthResponse.json();

      // Test Schwab-specific health
      const schwabResponse = await fetch(`${apiBase}/schwab/health`);
      const schwabData = await schwabResponse.json();

      setTestResults(prev => ({
        ...prev,
        backend: {
          status: 'healthy',
          generalHealth: healthData,
          schwabHealth: schwabData
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        backend: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
    setIsLoading(false);
  };

  const testOAuthURL = async () => {
    setIsLoading(true);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

      const response = await fetch(`${apiBase}/schwab/auth-url`);
      const data = await response.json();

      setTestResults(prev => ({
        ...prev,
        oauth: {
          status: 'success',
          authUrl: data.auth_url,
          containsHTTPS: data.auth_url?.includes('https://allocraft.app/auth/callback') ||
            data.auth_url?.includes('https://allocraft-backend.onrender.com/schwab/callback')
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        oauth: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
    setIsLoading(false);
  };

  const initiateOAuthFlow = () => {
    if (testResults.oauth?.authUrl) {
      console.log('🚀 Initiating OAuth flow to:', testResults.oauth.authUrl);
      window.location.href = testResults.oauth.authUrl;
    }
  };

  const copyTestScript = () => {
    const script = `
// Production HTTPS Schwab Integration Test
console.log("🔍 Production Deployment Test");
console.log("================================");

const config = {
  apiBase: import.meta.env?.VITE_API_BASE_URL,
  clientId: import.meta.env?.VITE_SCHWAB_CLIENT_ID,
  redirectUri: import.meta.env?.VITE_SCHWAB_REDIRECT_URI
};

console.log("✅ Environment Variables:");
console.log("  API Base:", config.apiBase);
console.log("  Client ID:", config.clientId ? "Set" : "Missing");
console.log("  Redirect URI:", config.redirectUri);

fetch(\`\${config.apiBase}/schwab/health\`)
  .then(res => res.json())
  .then(data => console.log("✅ Backend Health:", data))
  .catch(err => console.log("❌ Backend Health Failed:", err));
`;

    navigator.clipboard.writeText(script);
    alert('Test script copied to clipboard! Paste in browser console.');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          🚀 Production HTTPS Schwab Integration Tester
        </h2>
        <p className="text-blue-700">
          Use this tool to verify your production deployment at <strong>https://allocraft.app</strong>
        </p>
      </div>

      {/* Environment Variables Test */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">📋 Environment Variables</h3>
        {testResults.environment ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={testResults.environment.isReady ? 'text-green-600' : 'text-red-600'}>
                {testResults.environment.isReady ? '✅' : '❌'}
              </span>
              <span>Configuration Status: {testResults.environment.isReady ? 'Ready' : 'Issues Found'}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>API Base: <code className="bg-gray-100 px-1 rounded">{testResults.environment.apiBase}</code></div>
              <div>Client ID: <span className="text-blue-600">{testResults.environment.clientId}</span></div>
              <div>Redirect URI: <code className="bg-gray-100 px-1 rounded">{testResults.environment.redirectUri}</code></div>
            </div>
            {testResults.environment.issues?.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700 font-medium">Issues:</p>
                <ul className="text-red-600 text-sm list-disc list-inside">
                  {testResults.environment.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Loading environment check...</div>
        )}
      </div>

      {/* Backend Health Test */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🏥 Backend Health Check</h3>
          <button
            onClick={runBackendHealthCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Run Health Check'}
          </button>
        </div>

        {testResults.backend && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={testResults.backend.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                {testResults.backend.status === 'healthy' ? '✅' : '❌'}
              </span>
              <span>Backend Status: {testResults.backend.status}</span>
            </div>

            {testResults.backend.status === 'healthy' && (
              <div className="text-sm space-y-2">
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <p className="font-medium text-green-800">General Health:</p>
                  <pre className="text-green-700 text-xs mt-1">{JSON.stringify(testResults.backend.generalHealth, null, 2)}</pre>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-medium text-blue-800">Schwab Configuration:</p>
                  <pre className="text-blue-700 text-xs mt-1">{JSON.stringify(testResults.backend.schwabHealth, null, 2)}</pre>
                </div>
              </div>
            )}

            {testResults.backend.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">Error: {testResults.backend.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OAuth URL Test */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🔐 OAuth URL Generation</h3>
          <button
            onClick={testOAuthURL}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test OAuth URL'}
          </button>
        </div>

        {testResults.oauth && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={testResults.oauth.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                {testResults.oauth.status === 'success' ? '✅' : '❌'}
              </span>
              <span>OAuth URL Generation: {testResults.oauth.status}</span>
            </div>

            {testResults.oauth.authUrl && (
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 border rounded">
                  <p className="text-sm font-medium text-gray-700">Generated OAuth URL:</p>
                  <code className="text-xs text-blue-600 break-all">{testResults.oauth.authUrl}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className={testResults.oauth.containsHTTPS ? 'text-green-600' : 'text-orange-600'}>
                    {testResults.oauth.containsHTTPS ? '✅' : '⚠️'}
                  </span>
                  <span className="text-sm">
                    HTTPS Redirect: {testResults.oauth.containsHTTPS ? 'Configured' : 'Check redirect URI'}
                  </span>
                </div>
                <button
                  onClick={initiateOAuthFlow}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  🚀 Start OAuth Flow
                </button>
              </div>
            )}

            {testResults.oauth.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">Error: {testResults.oauth.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🛠️ Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyTestScript}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            📋 Copy Console Test Script
          </button>
          <a
            href="https://developer.schwab.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            🔧 Schwab Developer Portal
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800"
          >
            📊 Vercel Dashboard
          </a>
          <a
            href="https://dashboard.render.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            🖥️ Render Dashboard
          </a>
        </div>
      </div>

      {/* Current URL Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">📍 Current Environment</h3>
        <div className="text-sm text-yellow-700">
          <div>Current URL: <code className="bg-yellow-100 px-1 rounded">{window.location.origin}</code></div>
          <div className="mt-1">
            {window.location.origin.includes('https://allocraft.app') ? (
              <span className="text-green-600">✅ Production HTTPS Environment</span>
            ) : window.location.origin.includes('localhost') ? (
              <span className="text-blue-600">🔧 Development Environment</span>
            ) : (
              <span className="text-orange-600">⚠️ Unknown Environment</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
