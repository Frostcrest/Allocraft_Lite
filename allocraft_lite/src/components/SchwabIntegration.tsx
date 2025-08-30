import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { backendSchwabApi } from '../services/backendSchwabApi';

interface SchwabIntegrationProps {
  onConnectionSuccess?: () => void;
}

const SchwabIntegration: React.FC<SchwabIntegrationProps> = ({ onConnectionSuccess }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string>('');

  // Check if already connected on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('🔍 Checking Schwab connection status...');
      const status = await backendSchwabApi.getStatus();

      if (status.connected) {
        console.log('✅ User is connected to Schwab');
        setConnectionStatus('connected');
        setError('');

        // Trigger callback if provided
        if (onConnectionSuccess) {
          setTimeout(() => {
            onConnectionSuccess();
          }, 1000);
        }
      } else {
        console.log('❌ User is not connected to Schwab');
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setError('');

      console.log('🔄 Initiating Schwab OAuth...');

      // Use backend service to initiate OAuth
      await backendSchwabApi.initiateOAuth();

    } catch (error) {
      console.error('❌ OAuth initiation failed:', error);
      setError('Failed to initiate OAuth connection');
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    try {
      await backendSchwabApi.disconnect();
      setConnectionStatus('disconnected');
      setError('');
      console.log('🔄 Schwab account disconnected');

      // Refresh the page to clear any cached data
      window.location.reload();
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
      setError('Failed to disconnect Schwab account');
    }
  };

  // Listen for OAuth completion - backend will redirect to callback page
  useEffect(() => {
    const handleOAuthCallback = () => {
      // Check if we're returning from OAuth
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        console.log('✅ Schwab OAuth completed successfully');
        checkConnectionStatus(); // Recheck status after OAuth

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('error')) {
        const error = urlParams.get('error');
        console.error('❌ OAuth error:', error);
        setError(`OAuth failed: ${error}`);
        setIsConnecting(false);
        setConnectionStatus('disconnected');

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleOAuthCallback();
  }, []);

  // Auto-refresh connection status periodically
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(checkConnectionStatus, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Connect Your Schwab Account</h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${connectionStatus === 'connected'
            ? 'bg-green-100 text-green-700'
            : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
          {connectionStatus === 'connected' && '✅ Schwab Account Connected'}
          {connectionStatus === 'connecting' && '🔄 Connecting...'}
          {connectionStatus === 'disconnected' && '❌ Not Connected'}
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Link your Schwab account to automatically import your positions and keep them up to date.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        {connectionStatus === 'disconnected' && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2"
          >
            <ExternalLink size={16} />
            {isConnecting ? 'Connecting...' : 'Connect to Schwab'}
          </Button>
        )}

        {connectionStatus === 'connected' && (
          <div className="flex gap-2">
            <Button
              onClick={() => checkConnectionStatus()}
              variant="outline"
              size="sm"
            >
              Refresh Status
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {connectionStatus === 'connected' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            ✅ Your Schwab account is successfully connected. You can now refresh your positions to import your portfolio.
          </p>
        </div>
      )}
    </div>
  );
};

export default SchwabIntegration;