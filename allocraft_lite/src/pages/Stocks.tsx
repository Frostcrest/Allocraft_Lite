import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StockPositionRow from '@/components/StockPositionRow';
import AddStockModal from '@/components/AddStockModal';
import SchwabIntegration from '@/components/SchwabIntegration';
import SchwabConfigTest from '@/components/SchwabConfigTest';
import SchwabIntegrationTests from '@/components/SchwabIntegrationTests';
import APISwitcher from '@/components/APISwitcher';
import { schwabApi } from '@/services/schwabApi';

interface Position {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
  source: 'manual' | 'schwab';
  accountType?: string;
  accountNumber?: string;
}

const Stocks: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [schwabPositions, setSchwabPositions] = useState<Position[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load manual positions from localStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('stockPositions');
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        const manualPositions = parsed.filter((p: Position) => p.source !== 'schwab');
        setPositions(manualPositions);
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    }
  }, []);

  // Load Schwab positions
  const loadSchwabPositions = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading Schwab positions...');

      // Check if we have a valid token
      const token = localStorage.getItem('schwab_access_token');
      if (!token) {
        console.log('❌ No Schwab token found');
        return;
      }

      // Fetch accounts first
      const accounts = await schwabApi.getAccounts();
      console.log('✅ Schwab accounts fetched:', accounts);

      if (!accounts || accounts.length === 0) {
        console.log('❌ No Schwab accounts found');
        return;
      }

      // Fetch positions for each account
      const allPositions: Position[] = [];

      for (const account of accounts) {
        try {
          console.log(`🔍 Fetching positions for account: ${account.accountNumber}`);
          const accountPositions = await schwabApi.getPositions(account.accountNumber);

          if (accountPositions && accountPositions.length > 0) {
            // Transform Schwab positions to our format
            const transformedPositions = accountPositions.map((pos: any, index: number) => ({
              id: `schwab-${account.accountNumber}-${pos.instrument?.symbol || index}`,
              symbol: pos.instrument?.symbol || 'Unknown',
              shares: pos.longQuantity || pos.shortQuantity || 0,
              costBasis: pos.averagePrice || 0,
              marketPrice: pos.marketValue / (pos.longQuantity || 1) || 0,
              marketValue: pos.marketValue || 0,
              profitLoss: (pos.marketValue || 0) - ((pos.averagePrice || 0) * (pos.longQuantity || 0)),
              profitLossPercent: pos.averagePrice ?
                (((pos.marketValue / (pos.longQuantity || 1)) - pos.averagePrice) / pos.averagePrice) * 100 : 0,
              source: 'schwab' as const,
              accountType: account.type,
              accountNumber: account.accountNumber
            }));

            allPositions.push(...transformedPositions);
            console.log(`✅ Added ${transformedPositions.length} positions from ${account.accountNumber}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching positions for account ${account.accountNumber}:`, error);
        }
      }

      setSchwabPositions(allPositions);
      setLastRefresh(new Date());
      console.log(`✅ Total Schwab positions loaded: ${allPositions.length}`);

    } catch (error) {
      console.error('❌ Error loading Schwab positions:', error);

      // If token is invalid, clear it
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('🔄 Token appears invalid, clearing...');
        localStorage.removeItem('schwab_access_token');
        localStorage.removeItem('schwab_refresh_token');
        localStorage.removeItem('schwab_accounts');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load Schwab positions on component mount and when token changes
  useEffect(() => {
    const token = localStorage.getItem('schwab_access_token');
    if (token) {
      loadSchwabPositions();
    }
  }, []);

  // Listen for Schwab connection events
  useEffect(() => {
    const handleSchwabConnection = () => {
      console.log('🔄 Schwab connection detected, refreshing positions...');
      loadSchwabPositions();
    };

    // Listen for custom events or storage changes
    window.addEventListener('schwab-connected', handleSchwabConnection);
    window.addEventListener('storage', (e) => {
      if (e.key === 'schwab_access_token' && e.newValue) {
        handleSchwabConnection();
      }
    });

    return () => {
      window.removeEventListener('schwab-connected', handleSchwabConnection);
      window.removeEventListener('storage', handleSchwabConnection);
    };
  }, []);

  const addPosition = (newPosition: Omit<Position, 'id' | 'source'>) => {
    const position: Position = {
      ...newPosition,
      id: Date.now().toString(),
      source: 'manual'
    };

    const updatedPositions = [...positions, position];
    setPositions(updatedPositions);
    localStorage.setItem('stockPositions', JSON.stringify([...updatedPositions, ...schwabPositions]));
  };

  const removePosition = (id: string) => {
    if (id.startsWith('schwab-')) {
      // Can't remove Schwab positions manually
      return;
    }

    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    localStorage.setItem('stockPositions', JSON.stringify([...updatedPositions, ...schwabPositions]));
  };

  // Combine manual and Schwab positions
  const allPositions = [...positions, ...schwabPositions];
  const totalValue = allPositions.reduce((sum, pos) => sum + pos.marketValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Positions</h1>
          <p className="text-muted-foreground">
            Manage your equity holdings • Total Value: ${totalValue.toFixed(2)}
            {schwabPositions.length > 0 && (
              <span className="ml-2 text-sm">
                ({positions.length} manual + {schwabPositions.length} Schwab positions)
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Position
        </Button>
      </div>

      {/* API Mode Switcher */}
      <APISwitcher />

      {/* Schwab Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🔗 Connect Your Schwab Account</span>
            {schwabPositions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSchwabPositions}
                  disabled={isLoading}
                >
                  {isLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
                </Button>
                {lastRefresh && (
                  <span className="text-xs text-muted-foreground">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Link your Charles Schwab account to automatically import your positions and keep your portfolio in sync.
          </p>
          <SchwabIntegration onConnectionSuccess={loadSchwabPositions} />
        </CardContent>
      </Card>

      {/* Schwab Status */}
      {schwabPositions.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">✅ Schwab Connected</h3>
                <p className="text-sm text-green-600">
                  {schwabPositions.length} positions imported from your Schwab account
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSchwabPositions}
                disabled={isLoading}
                className="border-green-300"
              >
                {isLoading ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OAuth Diagnostic */}
      <SchwabConfigTest />

      {/* Integration Tests */}
      <SchwabIntegrationTests />

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Positions
            {allPositions.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({allPositions.length} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No positions found.</p>
              <p className="text-sm mt-2">
                Add positions manually or connect your Schwab account to import automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Ticker</div>
                <div>Shares</div>
                <div>Cost Basis</div>
                <div>Market Price</div>
                <div>Market Value</div>
                <div>P/L</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Group positions by source */}
              {schwabPositions.length > 0 && (
                <>
                  <div className="text-sm font-medium text-blue-600 pt-4 pb-2 border-b">
                    📊 Schwab Positions ({schwabPositions.length})
                  </div>
                  {schwabPositions.map((position) => (
                    <div key={position.id} className="bg-blue-50 rounded-lg p-2">
                      <StockPositionRow
                        position={position}
                        onRemove={() => { }} // Can't remove Schwab positions
                        canRemove={false}
                      />
                      <div className="text-xs text-blue-600 mt-1">
                        Account: {position.accountNumber} ({position.accountType})
                      </div>
                    </div>
                  ))}
                </>
              )}

              {positions.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-600 pt-4 pb-2 border-b">
                    ✏️ Manual Positions ({positions.length})
                  </div>
                  {positions.map((position) => (
                    <StockPositionRow
                      key={position.id}
                      position={position}
                      onRemove={removePosition}
                      canRemove={true}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addPosition}
      />
    </div>
  );
};

export default Stocks;