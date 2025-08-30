import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { schwabApi } from '@/services/schwabApi';

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
      const token = localStorage.getItem('schwab_access_token');
      if (!token) {
        setConnectionStatus('disconnected');
        return;
      }

      // Test if token is still valid by making a simple API call
      console.log('🔍 Checking token validity...');

      // Try to fetch accounts to validate token
      const isValid = await testTokenValidity(token);

      if (isValid) {
        console.log('✅ Token is valid, user is connected');
        setConnectionStatus('connected');
        setError('');
      } else {
        console.log('❌ Token is invalid, clearing...');
        clearSchwabData();
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const testTokenValidity = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.schwabapi.com/trader/v1/accounts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  const clearSchwabData = () => {
    localStorage.removeItem('schwab_access_token');
    localStorage.removeItem('schwab_refresh_token');
    localStorage.removeItem('schwab_accounts');
    localStorage.removeItem('schwab_oauth_callback');
    localStorage.removeItem('schwab_token_expires');
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setError('');

      console.log('🔄 Initiating Schwab OAuth...');

      // Generate OAuth URL and redirect
      const authUrl = schwabApi.getAuthUrl();
      console.log('🔗 Redirecting to:', authUrl);

      // Store callback to trigger after OAuth completes
      localStorage.setItem('schwab_oauth_callback', 'refresh_positions');

      // Redirect to Schwab OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('❌ OAuth initiation failed:', error);
      setError('Failed to initiate OAuth connection');
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = () => {
    clearSchwabData();
    setConnectionStatus('disconnected');
    setError('');
    console.log('🔄 Schwab account disconnected');

    // Refresh the page to clear any cached data
    window.location.reload();
  };

  // Listen for OAuth completion and storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'schwab_access_token') {
        if (e.newValue) {
          console.log('✅ Schwab OAuth completed successfully');
          setConnectionStatus('connected');
          setIsConnecting(false);
          setError('');

          // Store token expiration (typically 30 minutes for Schwab)
          const expirationTime = Date.now() + (30 * 60 * 1000); // 30 minutes
          localStorage.setItem('schwab_token_expires', expirationTime.toString());

          // Trigger callback if provided
          if (onConnectionSuccess) {
            setTimeout(() => {
              onConnectionSuccess();
            }, 1000); // Small delay to ensure token is fully processed
          }

          // Emit custom event
          window.dispatchEvent(new CustomEvent('schwab-connected'));

          // Clear callback flag
          localStorage.removeItem('schwab_oauth_callback');
        } else {
          // Token was removed
          setConnectionStatus('disconnected');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onConnectionSuccess]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const checkTokenExpiration = () => {
        const expirationTime = localStorage.getItem('schwab_token_expires');
        if (expirationTime && Date.now() > parseInt(expirationTime) - (5 * 60 * 1000)) { // 5 minutes before expiration
          console.log('🔄 Token expiring soon, need to refresh...');
          // For now, just disconnect. In production, you'd implement refresh token logic
          handleDisconnect();
        }
      };

      const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-800">❌ Connection Error</h3>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError('');
            checkConnectionStatus();
          }}
          size="sm"
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (connectionStatus === 'connected') {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div>
          <h3 className="font-semibold text-green-800">✅ Schwab Account Connected</h3>
          <p className="text-sm text-green-600">Your positions are being imported automatically.</p>
          <p className="text-xs text-green-500 mt-1">
            Connected at {new Date(localStorage.getItem('schwab_token_expires') ?
              parseInt(localStorage.getItem('schwab_token_expires')!) - (30 * 60 * 1000) :
              Date.now()).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onConnectionSuccess?.()}
            size="sm"
          >
            Refresh Positions
          </Button>
          <Button variant="outline" onClick={handleDisconnect} size="sm">
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="space-y-2">
        <ExternalLink className="h-12 w-12 mx-auto text-blue-600" />
        <h3 className="text-lg font-semibold">Connect Your Schwab Account</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Link your Charles Schwab account to automatically import your positions and keep your portfolio in sync.
        </p>
      </div>

      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isConnecting ? 'Connecting...' : 'Connect Schwab Account'}
      </Button>

      {connectionStatus === 'connecting' && (
        <p className="text-sm text-blue-600">
          🔄 Redirecting to Schwab for authentication...
        </p>
      )}
    </div>
  );
};

export default SchwabIntegration;