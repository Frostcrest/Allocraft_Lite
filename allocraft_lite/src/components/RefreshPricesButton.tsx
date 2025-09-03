import React from 'react';
import { RefreshCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedApi, RefreshSummary } from '../services/unifiedApi';
import { useToast } from '@/components/ui/use-toast';

interface RefreshPricesButtonProps {
    variant?: 'all' | 'selected';
    positionIds?: number[];
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    onRefreshComplete?: (summary: RefreshSummary) => void;
}

export const RefreshPricesButton: React.FC<RefreshPricesButtonProps> = ({
    variant = 'all',
    positionIds = [],
    className = '',
    size = 'md',
    showText = true,
    onRefreshComplete
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const refreshMutation = useMutation({
        mutationFn: async () => {
            if (variant === 'selected' && positionIds.length > 0) {
                return await unifiedApi.refreshSelectedPrices(positionIds);
            } else {
                return await unifiedApi.refreshAllPrices();
            }
        },
        onSuccess: (data) => {
            // Invalidate all relevant queries to trigger re-fetch with updated prices
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['options'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            
            // Show success notification
            const { summary } = data;
            const updatedCount = (summary.stocks_updated || 0) + (summary.options_updated || 0);
            const totalCount = summary.total_positions || 0;
            
            toast({
                title: "✅ Prices Updated Successfully",
                description: `Updated ${updatedCount} of ${totalCount} positions`,
                variant: "default",
            });

            // Call optional callback
            if (onRefreshComplete) {
                onRefreshComplete(data);
            }
        },
        onError: (error) => {
            console.error('Price refresh error:', error);
            toast({
                title: "❌ Price Refresh Failed", 
                description: `Failed to refresh prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive",
            });
        }
    });

    const handleRefresh = () => {
        refreshMutation.mutate();
    };

    // Size configurations
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const isLoading = refreshMutation.isPending;

    return (
        <button
            onClick={handleRefresh}
            disabled={isLoading || (variant === 'selected' && positionIds.length === 0)}
            className={`
                inline-flex items-center gap-2 
                ${sizeClasses[size]}
                border border-blue-200 
                text-blue-700 
                bg-white 
                hover:bg-blue-50 
                disabled:opacity-50 
                disabled:cursor-not-allowed
                rounded-md 
                font-medium 
                transition-colors 
                duration-200
                focus:outline-none 
                focus:ring-2 
                focus:ring-blue-500 
                focus:ring-offset-2
                ${className}
            `}
            title={
                variant === 'selected' 
                    ? `Refresh prices for ${positionIds.length} selected positions`
                    : 'Refresh all portfolio prices'
            }
        >
            <RefreshCcw 
                className={`
                    ${iconSizes[size]} 
                    ${isLoading ? 'animate-spin' : ''}
                `} 
            />
            {showText && (
                <span>
                    {isLoading 
                        ? 'Refreshing...' 
                        : variant === 'selected' 
                            ? `Refresh Selected (${positionIds.length})`
                            : 'Refresh All Prices'
                    }
                </span>
            )}
        </button>
    );
};

export default RefreshPricesButton;

interface RefreshPricesButtonProps {
    variant?: 'all' | 'selected';
    positionIds?: number[];
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    onRefreshComplete?: (summary: RefreshSummary) => void;
}

export const RefreshPricesButton: React.FC<RefreshPricesButtonProps> = ({
    variant = 'all',
    positionIds = [],
    className = '',
    size = 'md',
    showText = true,
    onRefreshComplete
}) => {
    const queryClient = useQueryClient();

    const refreshMutation = useMutation({
        mutationFn: async () => {
            if (variant === 'selected' && positionIds.length > 0) {
                return await unifiedApi.refreshSelectedPrices(positionIds);
            } else {
                return await unifiedApi.refreshAllPrices();
            }
        },
        onSuccess: (data) => {
            // Invalidate all relevant queries to trigger re-fetch with updated prices
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['options'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            
            // Show success notification
            const { summary } = data;
            const updatedCount = (summary.stocks_updated || 0) + (summary.options_updated || 0);
            const totalCount = summary.total_positions || 0;
            
            toast.success(
                `Successfully updated ${updatedCount} of ${totalCount} positions`,
                {
                    duration: 4000,
                    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
                }
            );

            // Call optional callback
            if (onRefreshComplete) {
                onRefreshComplete(data);
            }
        },
        onError: (error) => {
            console.error('Price refresh error:', error);
            toast.error(
                `Failed to refresh prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
                {
                    duration: 6000,
                    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                }
            );
        }
    });

    const handleRefresh = () => {
        refreshMutation.mutate();
    };

    // Size configurations
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const isLoading = refreshMutation.isPending;

    return (
        <button
            onClick={handleRefresh}
            disabled={isLoading || (variant === 'selected' && positionIds.length === 0)}
            className={`
                inline-flex items-center gap-2 
                ${sizeClasses[size]}
                border border-blue-200 
                text-blue-700 
                bg-white 
                hover:bg-blue-50 
                disabled:opacity-50 
                disabled:cursor-not-allowed
                rounded-md 
                font-medium 
                transition-colors 
                duration-200
                focus:outline-none 
                focus:ring-2 
                focus:ring-blue-500 
                focus:ring-offset-2
                ${className}
            `}
            title={
                variant === 'selected' 
                    ? `Refresh prices for ${positionIds.length} selected positions`
                    : 'Refresh all portfolio prices'
            }
        >
            <RefreshCcw 
                className={`
                    ${iconSizes[size]} 
                    ${isLoading ? 'animate-spin' : ''}
                `} 
            />
            {showText && (
                <span>
                    {isLoading 
                        ? 'Refreshing...' 
                        : variant === 'selected' 
                            ? `Refresh Selected (${positionIds.length})`
                            : 'Refresh All Prices'
                    }
                </span>
            )}
        </button>
    );
};

export default RefreshPricesButton;
