/**
 * API Mode Switcher Component
 * Allows switching between direct Schwab API and backend-proxied API
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { backendSchwabApi } from '@/services/backendSchwabApi';

type ApiMode = 'direct' | 'backend';

export default function ApiModeSwitcher() {
  const [currentMode, setCurrentMode] = useState<ApiMode>('direct');
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const switchToBackend = async () => {
    try {
      // Test backend health first
      const health = await backendSchwabApi.checkHealth();
      setHealthStatus(health);
      setCurrentMode('backend');
      
      console.log('🔄 Switched to Backend API Mode');
      console.log('Backend Health:', health);
    } catch (error) {
      console.error('Backend health check failed:', error);
      alert('Backend API not available. Please ensure your backend is running.');
    }
  };

  const switchToDirect = () => {
    setCurrentMode('direct');
    setHealthStatus(null);
    console.log('🔄 Switched to Direct API Mode');
  };

  const testBackendConnection = async () => {
    try {
      const health = await backendSchwabApi.checkHealth();
      setHealthStatus(health);
      alert(`Backend connection successful!\n\nStatus: ${health.status}\nSchwab Config: ${JSON.stringify(health.schwab_config, null, 2)}`);
    } catch (error) {
      alert(`Backend connection failed:\n\n${error}`);
    }
  };

  return (
    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h3 className="font-bold text-lg mb-3 text-blue-800">🔄 API Mode Switcher</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Direct API Mode */}
        <div className={`p-3 rounded-lg border-2 ${currentMode === 'direct' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-gray-50'}`}>
          <h4 className="font-semibold text-sm mb-2">
            {currentMode === 'direct' ? '✅' : '⚪'} Direct Schwab API
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Frontend calls Schwab API directly
          </p>
          <Button 
            onClick={switchToDirect}
            disabled={currentMode === 'direct'}
            className="w-full text-xs"
            variant={currentMode === 'direct' ? 'default' : 'outline'}
          >
            {currentMode === 'direct' ? 'Current Mode' : 'Switch to Direct'}
          </Button>
        </div>

        {/* Backend API Mode */}
        <div className={`p-3 rounded-lg border-2 ${currentMode === 'backend' ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-gray-50'}`}>
          <h4 className="font-semibold text-sm mb-2">
            {currentMode === 'backend' ? '✅' : '⚪'} Backend-Proxied API
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Frontend → Your Render Backend → Schwab API
          </p>
          <Button 
            onClick={switchToBackend}
            disabled={currentMode === 'backend'}
            className="w-full text-xs"
            variant={currentMode === 'backend' ? 'default' : 'outline'}
          >
            {currentMode === 'backend' ? 'Current Mode' : 'Switch to Backend'}
          </Button>
        </div>
      </div>

      {/* Current Mode Info */}
      <div className="p-3 bg-white rounded border">
        <h5 className="font-medium text-sm mb-2">Current Configuration:</h5>
        <div className="text-xs space-y-1">
          <div><strong>Mode:</strong> {currentMode === 'direct' ? 'Direct Schwab API' : 'Backend-Proxied API'}</div>
          <div><strong>OAuth URL:</strong> {currentMode === 'direct' ? 'https://api.schwabapi.com/v1/oauth/authorize' : 'Your Backend → Schwab'}</div>
          <div><strong>Tokens:</strong> {currentMode === 'direct' ? 'Stored in browser' : 'Managed by backend'}</div>
          <div><strong>CORS:</strong> {currentMode === 'direct' ? 'May have issues' : 'Handled by backend'}</div>
        </div>
      </div>

      {/* Backend Health Status */}
      {currentMode === 'backend' && (
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <div className="flex justify-between items-center mb-2">
            <h5 className="font-medium text-sm text-green-800">Backend Status:</h5>
            <Button onClick={testBackendConnection} className="text-xs py-1 px-2">
              Test Connection
            </Button>
          </div>
          {healthStatus && (
            <div className="text-xs text-green-700">
              <div><strong>Status:</strong> {healthStatus.status}</div>
              <div><strong>Client ID:</strong> {healthStatus.schwab_config?.client_id_configured ? '✅ Configured' : '❌ Missing'}</div>
              <div><strong>Client Secret:</strong> {healthStatus.schwab_config?.client_secret_configured ? '✅ Configured' : '❌ Missing'}</div>
              <div><strong>Redirect URI:</strong> {healthStatus.schwab_config?.redirect_uri}</div>
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      <div className="mt-3 text-xs text-gray-600">
        <p><strong>Backend API Benefits:</strong></p>
        <ul className="ml-4 mt-1 space-y-1">
          <li>• No CORS issues</li>
          <li>• Secure credential handling</li>
          <li>• Server-side token management</li>
          <li>• Production-ready architecture</li>
        </ul>
      </div>
    </div>
  );
}
