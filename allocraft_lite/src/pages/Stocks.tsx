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
import { backendSchwabApi } from '../services/backendSchwabApi';

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
  const [error, setError] = useState<string>('');

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

  // Safe position transformation with error handling
  const transformSchwabPosition = (pos: any, accountNumber: string, accountType: string, index: number): Position | null => {
    try {
      // Safely extract values with fallbacks
      const instrument = pos.instrument || {};
      const symbol = instrument.symbol || instrument.cusip || `UNKNOWN_${index}`;
      const longQuantity = parseFloat(pos.longQuantity || 0);
      const shortQuantity = parseFloat(pos.shortQuantity || 0);
      const quantity = longQuantity || shortQuantity || 0;

      if (quantity === 0) {
        return null; // Skip positions with no quantity
      }

      const marketValue = parseFloat(pos.marketValue || 0);
      const averagePrice = parseFloat(pos.averagePrice || 0);
      const marketPrice = quantity > 0 ? marketValue / quantity : 0;

      const profitLoss = marketValue - (averagePrice * quantity);
      const profitLossPercent = averagePrice > 0 ? ((marketPrice - averagePrice) / averagePrice) * 100 : 0;

      return {
        id: `schwab-${accountNumber}-${symbol}-${index}`,
        symbol: symbol,
        shares: quantity,
        costBasis: averagePrice,
        marketPrice: marketPrice,
        marketValue: marketValue,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        source: 'schwab' as const,
        accountType: accountType,
        accountNumber: accountNumber
      };
    } catch (error) {
      console.error('Error transforming position:', error, pos);
      return null;
    }
  };

  // Load Schwab positions with better error handling
  const loadSchwabPositions = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔍 Loading Schwab positions...');

      // Check if user is connected to Schwab via backend
      const status = await backendSchwabApi.getStatus();
      if (!status.connected) {
        console.log('❌ User not connected to Schwab');
        setSchwabPositions([]);
        return;
      }

      // Use the Backend Schwab API service with correct hash-based flow
      console.log('📡 Fetching account summaries via Backend Schwab API service...');
      
      // Step 1: Get account summaries (accountNumber + hashValue)
      const accountSummaries = await backendSchwabApi.getAccountSummaries();
      console.log('✅ Schwab account summaries fetched:', accountSummaries);
      console.log('🔍 Raw account summaries structure:', JSON.stringify(accountSummaries, null, 2));

      if (!Array.isArray(accountSummaries) || accountSummaries.length === 0) {
        console.log('❌ No Schwab account summaries found');
        setSchwabPositions([]);
        return;
      }

      // Step 2: Get full account details for each account using hash values
      const allPositions: Position[] = [];

      for (const accountSummary of accountSummaries) {
        try {
          console.log('🔍 Individual account summary:', JSON.stringify(accountSummary, null, 2));
          console.log(`🔍 Processing account ${accountSummary.accountNumber} with hash ${accountSummary.hashValue}`);
          
          // Get full account details using the hash value
          const accountDetails = await backendSchwabApi.getAccountByHash(accountSummary.hashValue);
          console.log('🔍 Full account details:', JSON.stringify(accountDetails, null, 2));
          
          const securitiesAccount = accountDetails.securitiesAccount;
          if (!securitiesAccount) {
            console.error('❌ No securitiesAccount found in account details:', accountDetails);
            continue;
          }
          
          const accountNumber = securitiesAccount.accountNumber;
          const accountType = 'Securities'; // Schwab accounts are securities accounts
          
          console.log(`🔍 Account ${accountNumber} processed with hash authentication`);

          // Check if positions are included in the account details
          if (securitiesAccount.positions && securitiesAccount.positions.length > 0) {
            console.log(`📊 Found ${securitiesAccount.positions.length} positions in account ${accountNumber}`);
            
            const transformedPositions = securitiesAccount.positions
              .map((pos: any, index: number) =>
                transformSchwabPosition(pos, accountNumber, accountType, index)
              )
              .filter((pos: Position | null) => pos !== null) as Position[];

            allPositions.push(...transformedPositions);
          } else {
            console.log(`ℹ️ No positions found in account ${accountNumber} (this is normal if account has no holdings)`);
          }
        } catch (error) {
          console.error(`❌ Error fetching details for account ${accountSummary.accountNumber}:`, error);
          continue;
        }
      }

      console.log(`✅ Total Schwab positions loaded: ${allPositions.length}`);
      setSchwabPositions(allPositions);
      setLastRefresh(new Date());

    } catch (error) {
      console.error('❌ Error loading Schwab positions:', error);
      let errorMessage = 'Failed to load Schwab positions';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Full error details:', error);
        
        // Handle specific error types
        if (error.message.includes('Not authenticated with Allocraft')) {
          errorMessage = 'Please log in to your Allocraft account first';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Schwab connection expired. Please reconnect your account.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access denied. Please check your Schwab account permissions.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Schwab positions on component mount
  useEffect(() => {
    // Check if user is connected to Schwab and auto-load positions
    const checkAndLoadPositions = async () => {
      try {
        const status = await backendSchwabApi.getStatus();
        if (status.connected) {
          console.log('🔄 User is connected to Schwab, loading positions...');
          setTimeout(() => {
            loadSchwabPositions();
          }, 500);
        } else {
          console.log('ℹ️ User not connected to Schwab, skipping position load');
        }
      } catch (error) {
        console.log('ℹ️ Could not check Schwab status, user might not be logged in');
      }
    };
    
    checkAndLoadPositions();
  }, []);

  // Listen for Schwab connection events
  useEffect(() => {
    const handleSchwabConnection = () => {
      console.log('🔄 Schwab connection detected, refreshing positions...');
      setTimeout(() => {
        loadSchwabPositions();
      }, 1000); // Give OAuth time to complete
    };

    window.addEventListener('schwab-connected', handleSchwabConnection);
    return () => {
      window.removeEventListener('schwab-connected', handleSchwabConnection);
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

  // Combine manual and Schwab positions safely
  const allPositions = [...positions, ...schwabPositions];
  const totalValue = allPositions.reduce((sum, pos) => {
    const value = isNaN(pos.marketValue) ? 0 : pos.marketValue;
    return sum + value;
  }, 0);

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

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-800">❌ Error Loading Positions</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError('');
                  loadSchwabPositions();
                }}
                className="border-red-300"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          {isLoading && allPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin h-6 w-6 mx-auto mb-2 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p>Loading Schwab positions...</p>
            </div>
          ) : allPositions.length === 0 ? (
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