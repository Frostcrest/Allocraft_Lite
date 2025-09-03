import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCcw, ChevronDown, Clock, Settings } from 'lucide-react';
import { unifiedApi } from '@/services/unifiedApi';

interface EnhancedRefreshButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
  showDropdown?: boolean;
}

const EnhancedRefreshButton: React.FC<EnhancedRefreshButtonProps> = ({
  variant = 'outline',
  className = '',
  showDropdown = true,
}) => {
  const [showTickerDialog, setShowTickerDialog] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval] = useState(15); // minutes

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for refreshing all prices
  const refreshAllMutation = useMutation({
    mutationFn: () => unifiedApi.refreshAllPrices(),
    onSuccess: (data) => {
      toast({
        title: "Prices Updated Successfully",
        description: data.message || `Updated ${data.summary?.total_positions || 0} positions`,
      });
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['options'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Price Update Failed",
        description: error.message || "Failed to refresh prices",
        variant: "destructive",
      });
    },
  });

  // For now, use position IDs approach until ticker-based refresh is implemented
  const refreshTickersMutation = useMutation({
    mutationFn: (tickers: string[]) => {
      // Convert tickers to position IDs (placeholder - would need actual implementation)
      console.log('Refreshing tickers:', tickers);
      return unifiedApi.refreshAllPrices(); // Fallback to all prices for now
    },
    onSuccess: (data) => {
      toast({
        title: "Selected Prices Updated",
        description: data.message || `Updated prices for ${selectedTickers.length} tickers`,
      });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['options'] });
      setShowTickerDialog(false);
      setSelectedTickers([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Selective Update Failed",
        description: error.message || "Failed to refresh selected prices",
        variant: "destructive",
      });
    },
  });

  const handleRefreshAll = () => {
    refreshAllMutation.mutate();
  };

  const handleAddTicker = () => {
    if (tickerInput.trim() && !selectedTickers.includes(tickerInput.trim().toUpperCase())) {
      setSelectedTickers([...selectedTickers, tickerInput.trim().toUpperCase()]);
      setTickerInput('');
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setSelectedTickers(selectedTickers.filter(t => t !== ticker));
  };

  const handleRefreshSelected = () => {
    if (selectedTickers.length > 0) {
      refreshTickersMutation.mutate(selectedTickers);
    }
  };

  const isLoading = refreshAllMutation.isPending || refreshTickersMutation.isPending;

  // Auto-refresh functionality (placeholder for future implementation)
  React.useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        refreshAllMutation.mutate();
      }
    }, autoRefreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, isLoading, refreshAllMutation]);

  if (!showDropdown) {
    // Simple refresh button without dropdown
    return (
      <Button
        onClick={handleRefreshAll}
        disabled={isLoading}
        variant={variant}
        className={className}
      >
        <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Updating...' : 'Refresh Prices'}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isLoading}
            variant={variant}
            className={`${className} pr-1`}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Updating...' : 'Refresh Prices'}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Price Update Options</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleRefreshAll} disabled={isLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh All Prices
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowTickerDialog(true)} disabled={isLoading}>
            <Settings className="w-4 h-4 mr-2" />
            Refresh Selected Tickers
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            disabled={isLoading}
          >
            <Clock className="w-4 h-4 mr-2" />
            Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selective Ticker Refresh Dialog */}
      <Dialog open={showTickerDialog} onOpenChange={setShowTickerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refresh Selected Tickers</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticker symbol (e.g., AAPL)"
                value={tickerInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTickerInput(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddTicker()}
                className="flex-1"
              />
              <Button onClick={handleAddTicker} size="sm">
                Add
              </Button>
            </div>

            {selectedTickers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Tickers:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTickers.map((ticker) => (
                    <Badge
                      key={ticker}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTicker(ticker)}
                    >
                      {ticker} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTickerDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRefreshSelected}
                disabled={selectedTickers.length === 0 || refreshTickersMutation.isPending}
              >
                {refreshTickersMutation.isPending ? 'Updating...' : `Refresh ${selectedTickers.length} Tickers`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedRefreshButton;
