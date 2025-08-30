import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Position {
    symbol: string;
    shares: number;
    costBasis: number;
    marketPrice: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercent: number;
}

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (position: Omit<Position, 'profitLoss' | 'profitLossPercent' | 'marketValue'>) => void;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        symbol: '',
        shares: '',
        costBasis: '',
        marketPrice: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        const newErrors: Record<string, string> = {};

        if (!formData.symbol.trim()) {
            newErrors.symbol = 'Symbol is required';
        }

        if (!formData.shares || parseFloat(formData.shares) <= 0) {
            newErrors.shares = 'Shares must be greater than 0';
        }

        if (!formData.costBasis || parseFloat(formData.costBasis) <= 0) {
            newErrors.costBasis = 'Cost basis must be greater than 0';
        }

        if (!formData.marketPrice || parseFloat(formData.marketPrice) <= 0) {
            newErrors.marketPrice = 'Market price must be greater than 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Calculate derived values
        const shares = parseFloat(formData.shares);
        const costBasis = parseFloat(formData.costBasis);
        const marketPrice = parseFloat(formData.marketPrice);
        const marketValue = shares * marketPrice;

        // Add the position
        onAdd({
            symbol: formData.symbol.toUpperCase(),
            shares,
            costBasis,
            marketPrice,
            marketValue
        });

        // Reset form and close modal
        setFormData({
            symbol: '',
            shares: '',
            costBasis: '',
            marketPrice: ''
        });
        setErrors({});
        onClose();
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleClose = () => {
        setFormData({
            symbol: '',
            shares: '',
            costBasis: '',
            marketPrice: ''
        });
        setErrors({});
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Stock Position</DialogTitle>
                    <DialogDescription>
                        Manually add a stock position to your portfolio. Enter the details below.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="symbol">Stock Symbol</Label>
                        <Input
                            id="symbol"
                            placeholder="e.g., AAPL, MSFT, GOOGL"
                            value={formData.symbol}
                            onChange={(e) => handleChange('symbol', e.target.value)}
                            className={errors.symbol ? 'border-red-500' : ''}
                        />
                        {errors.symbol && (
                            <p className="text-sm text-red-500">{errors.symbol}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shares">Number of Shares</Label>
                        <Input
                            id="shares"
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder="e.g., 100"
                            value={formData.shares}
                            onChange={(e) => handleChange('shares', e.target.value)}
                            className={errors.shares ? 'border-red-500' : ''}
                        />
                        {errors.shares && (
                            <p className="text-sm text-red-500">{errors.shares}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="costBasis">Cost Basis (per share)</Label>
                        <Input
                            id="costBasis"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 150.00"
                            value={formData.costBasis}
                            onChange={(e) => handleChange('costBasis', e.target.value)}
                            className={errors.costBasis ? 'border-red-500' : ''}
                        />
                        {errors.costBasis && (
                            <p className="text-sm text-red-500">{errors.costBasis}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="marketPrice">Current Market Price</Label>
                        <Input
                            id="marketPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 175.00"
                            value={formData.marketPrice}
                            onChange={(e) => handleChange('marketPrice', e.target.value)}
                            className={errors.marketPrice ? 'border-red-500' : ''}
                        />
                        {errors.marketPrice && (
                            <p className="text-sm text-red-500">{errors.marketPrice}</p>
                        )}
                    </div>

                    {/* Preview calculation */}
                    {formData.shares && formData.costBasis && formData.marketPrice && (
                        <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                            <div className="font-medium">Position Preview:</div>
                            <div>Market Value: ${(parseFloat(formData.shares) * parseFloat(formData.marketPrice)).toFixed(2)}</div>
                            <div>Total Cost: ${(parseFloat(formData.shares) * parseFloat(formData.costBasis)).toFixed(2)}</div>
                            <div className={`font-medium ${(parseFloat(formData.marketPrice) - parseFloat(formData.costBasis)) >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                P/L: ${((parseFloat(formData.marketPrice) - parseFloat(formData.costBasis)) * parseFloat(formData.shares)).toFixed(2)}
                                ({(((parseFloat(formData.marketPrice) - parseFloat(formData.costBasis)) / parseFloat(formData.costBasis)) * 100).toFixed(2)}%)
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Position
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddStockModal;