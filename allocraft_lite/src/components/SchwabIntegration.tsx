import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { 
  useSchwabAuth, 
  useSchwabLogin, 
  useSchwabLogout, 
  useSchwabAccounts, 
  useSchwabPositions,
  useRefreshSchwabData 
} from '@/hooks/useSchwab';
import { SchwabPosition } from '@/services/schwabApi';
import { formatCurrency } from '@/lib/utils';

interface SchwabPositionsTableProps {
  positions: SchwabPosition[];
  isLoading: boolean;
}

function SchwabPositionsTable({ positions, isLoading }: SchwabPositionsTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading positions...</p>
      </div>
    );
  }

  if (!positions.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No positions found in this account.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Symbol
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Market Value
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Day P&L
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Day P&L %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {positions.map((position, index) => (
            <tr key={`${position.instrument.symbol}-${index}`} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{position.instrument.symbol}</div>
                <div className="text-sm text-gray-500">{position.instrument.assetType}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {position.instrument.description}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {position.quantity.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(position.averagePrice)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {formatCurrency(position.marketValue)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                position.currentDayProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.currentDayProfitLoss >= 0 ? '+' : ''}
                {formatCurrency(position.currentDayProfitLoss)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                position.currentDayProfitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.currentDayProfitLossPercentage >= 0 ? '+' : ''}
                {position.currentDayProfitLossPercentage.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SchwabIntegration() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const { data: auth, isLoading: authLoading } = useSchwabAuth();
  const loginMutation = useSchwabLogin();
  const logoutMutation = useSchwabLogout();
  const refreshMutation = useRefreshSchwabData();
  
  const { 
    data: accounts = [], 
    error: accountsError 
  } = useSchwabAccounts();
  
  const { 
    data: positions = [], 
    isLoading: positionsLoading, 
    error: positionsError 
  } = useSchwabPositions(selectedAccountId);

  // Auto-select first account if none selected
  if (accounts.length > 0 && !selectedAccountId) {
    setSelectedAccountId(accounts[0].accountId);
  }

  const handleLogin = () => {
    loginMutation.mutate();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    setSelectedAccountId('');
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Checking Schwab connection...</p>
      </div>
    );
  }

  if (!auth?.isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect Your Schwab Account
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Link your Charles Schwab account to automatically import your positions and keep your portfolio in sync.
          </p>
          <Button 
            onClick={handleLogin}
            disabled={loginMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loginMutation.isPending ? 'Connecting...' : 'Connect Schwab Account'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Schwab Account Connected
            </h3>
            <p className="text-gray-600 mt-1">Your positions are synced with Charles Schwab</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Account Selector */}
        {accounts.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Account:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.accountId} ({account.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {(accountsError || positionsError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <h4 className="text-red-800 font-medium">Error loading Schwab data</h4>
              <p className="text-red-700 text-sm mt-1">
                {accountsError?.message || positionsError?.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Positions Table */}
      {selectedAccountId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Current Positions</h4>
            <p className="text-gray-600 text-sm mt-1">
              Account: {selectedAccountId}
            </p>
          </div>
          <SchwabPositionsTable 
            positions={positions} 
            isLoading={positionsLoading} 
          />
        </div>
      )}
    </div>
  );
}
