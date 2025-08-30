import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { schwabApi } from '@/services/schwabApi';

interface SchwabIntegrationProps {
  onConnectionSuccess?: () => void;
}

const SchwabIntegration: React.FC<SchwabIntegrationProps> = ({ onConnectionSuccess }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Check if already connected
  React.useEffect(() => {
    const token = localStorage.getItem('schwab_access_token');
    if (token) {
      setConnectionStatus('connected');
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

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
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('schwab_access_token');
    localStorage.removeItem('schwab_refresh_token');
    localStorage.removeItem('schwab_accounts');
    localStorage.removeItem('schwab_oauth_callback');
    setConnectionStatus('disconnected');
    console.log('🔄 Schwab account disconnected');
  };

  // Listen for OAuth completion
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'schwab_access_token' && e.newValue) {
        console.log('✅ Schwab OAuth completed successfully');
        setConnectionStatus('connected');
        setIsConnecting(false);

        // Trigger callback if provided
        if (onConnectionSuccess) {
          onConnectionSuccess();
        }

        // Emit custom event
        window.dispatchEvent(new CustomEvent('schwab-connected'));

        // Clear callback flag
        localStorage.removeItem('schwab_oauth_callback');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onConnectionSuccess]);

  if (connectionStatus === 'connected') {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div>
          <h3 className="font-semibold text-green-800">✅ Schwab Account Connected</h3>
          <p className="text-sm text-green-600">Your positions are being imported automatically.</p>
        </div>
        <Button variant="outline" onClick={handleDisconnect} size="sm">
          Disconnect
        </Button>
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
