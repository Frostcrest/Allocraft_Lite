import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink } from 'lucide-react';

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

interface StockPositionRowProps {
    position: Position;
    onRemove: (id: string) => void;
    canRemove: boolean;
}

const StockPositionRow: React.FC<StockPositionRowProps> = ({
    position,
    onRemove,
    canRemove
}) => {
    const formatCurrency = (value: number) => {
        if (isNaN(value)) return '$0.00';
        return `$${value.toFixed(2)}`;
    };

    const formatPercent = (value: number) => {
        if (isNaN(value)) return '0.00%';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const formatShares = (shares: number) => {
        if (isNaN(shares)) return '0';
        return shares.toFixed(4);
    };

    const getProfitLossColor = (value: number) => {
        if (isNaN(value) || value === 0) return 'text-gray-600';
        return value >= 0 ? 'text-green-600' : 'text-red-600';
    };

    const getStatusBadge = () => {
        if (position.source === 'schwab') {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Schwab
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Manual
            </span>
        );
    };

    return (
        <div className="grid grid-cols-8 gap-4 items-center py-3 text-sm hover:bg-gray-50 rounded-lg px-2">
            {/* Ticker */}
            <div className="font-medium">
                <div className="flex items-center gap-2">
                    <span>{position.symbol}</span>
                    {position.source === 'schwab' && (
                        <ExternalLink className="h-3 w-3 text-blue-500" />
                    )}
                </div>
            </div>

            {/* Shares */}
            <div className="text-right">
                {formatShares(position.shares)}
            </div>

            {/* Cost Basis */}
            <div className="text-right">
                {formatCurrency(position.costBasis)}
            </div>

            {/* Market Price */}
            <div className="text-right">
                {formatCurrency(position.marketPrice)}
            </div>

            {/* Market Value */}
            <div className="text-right font-medium">
                {formatCurrency(position.marketValue)}
            </div>

            {/* P/L */}
            <div className="text-right">
                <div className={`font-medium ${getProfitLossColor(position.profitLoss)}`}>
                    {formatCurrency(position.profitLoss)}
                </div>
                <div className={`text-xs ${getProfitLossColor(position.profitLossPercent)}`}>
                    {formatPercent(position.profitLossPercent)}
                </div>
            </div>

            {/* Status */}
            <div>
                {getStatusBadge()}
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                {canRemove ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(position.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <span className="text-xs text-gray-400">Synced</span>
                )}
            </div>
        </div>
    );
};

export default StockPositionRow;