import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Activity, AlertCircle, CheckCircle } from 'lucide-react';

const APISwitcher: React.FC = () => {
  const [isPolygonEnabled, setIsPolygonEnabled] = useState(true);
  const [apiStatus, setApiStatus] = useState({
    polygon: 'active',
    alternative: 'inactive'
  });

  // Check API status on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // This would be a real API health check in production
        const response = await fetch('/api/health');
        if (response.ok) {
          setApiStatus(prev => ({
            ...prev,
            polygon: 'active'
          }));
        } else {
          setApiStatus(prev => ({
            ...prev,
            polygon: 'error'
          }));
        }
      } catch (error) {
        console.error('API health check failed:', error);
        setApiStatus(prev => ({
          ...prev,
          polygon: 'error'
        }));
      }
    };

    checkApiStatus();
  }, []);

  const handleToggle = (enabled: boolean) => {
    setIsPolygonEnabled(enabled);
    
    // Emit event for other components to listen to
    window.dispatchEvent(new CustomEvent('apiSourceChange', {
      detail: { source: enabled ? 'polygon' : 'alternative' }
    }));

    // Update status
    setApiStatus({
      polygon: enabled ? 'active' : 'inactive',
      alternative: enabled ? 'inactive' : 'active'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle className="text-lg">API Configuration</CardTitle>
        </div>
        <CardDescription>
          Choose your market data source for real-time pricing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primary Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="polygon-toggle" className="text-base font-medium">
              Polygon.io API
            </Label>
            <p className="text-sm text-gray-500">
              Professional market data (recommended)
            </p>
          </div>
          <Switch
            id="polygon-toggle"
            checked={isPolygonEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Status Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              {getStatusIcon(apiStatus.polygon)}
              <span className="text-sm font-medium">Polygon.io</span>
            </div>
            <Badge className={getStatusColor(apiStatus.polygon)}>
              {apiStatus.polygon}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              {getStatusIcon(apiStatus.alternative)}
              <span className="text-sm font-medium">Alternative Source</span>
            </div>
            <Badge className={getStatusColor(apiStatus.alternative)}>
              {apiStatus.alternative}
            </Badge>
          </div>
        </div>

        {/* Info Text */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p>
            <strong>Polygon.io:</strong> Real-time market data with high accuracy and reliability.
            <br />
            <strong>Alternative:</strong> Backup data source when primary is unavailable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default APISwitcher;
