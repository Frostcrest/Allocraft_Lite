/**
 * Wheel Delete Modal Component
 * 
 * Provides a secure confirmation workflow for permanently deleting wheel strategies.
 * Features double confirmation to prevent accidental deletions and displays
 * comprehensive wheel details for user verification.
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, Shield } from 'lucide-react';

const WheelDeleteModal = ({ 
    isOpen, 
    onClose, 
    wheel, 
    onDelete, 
    isDeleting = false 
}) => {
    const [confirmationStep, setConfirmationStep] = useState(1);
    const [confirmText, setConfirmText] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setConfirmationStep(1);
            setConfirmText('');
            setIsConfirmed(false);
        }
    }, [isOpen]);

    if (!isOpen || !wheel) return null;

    const expectedConfirmText = `DELETE ${wheel.ticker || 'WHEEL'}`;
    const isTextConfirmed = confirmText === expectedConfirmText;

    const handleFirstConfirmation = () => {
        setConfirmationStep(2);
    };

    const handleSecondConfirmation = () => {
        if (isTextConfirmed) {
            setIsConfirmed(true);
        }
    };

    const handleFinalDelete = () => {
        onDelete(wheel.id);
    };

    const handleCancel = () => {
        onClose();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-red-100 bg-red-50">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <h2 className="text-xl font-semibold text-red-800">
                            Delete Wheel Strategy
                        </h2>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isDeleting}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Wheel Information */}
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Wheel Strategy Details
                    </h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ticker:</span>
                            <span className="font-medium text-gray-900">{wheel.ticker || 'N/A'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-600">Strategy:</span>
                            <span className="font-medium text-gray-900 capitalize">
                                {wheel.strategy_type || 'N/A'}
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium capitalize ${
                                wheel.status === 'active' ? 'text-green-600' :
                                wheel.status === 'closed' ? 'text-gray-600' :
                                'text-yellow-600'
                            }`}>
                                {wheel.status || 'N/A'}
                            </span>
                        </div>
                        
                        {wheel.strike_price && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Strike Price:</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(wheel.strike_price)}
                                </span>
                            </div>
                        )}
                        
                        {wheel.quantity && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-medium text-gray-900">{wheel.quantity}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium text-gray-900">
                                {formatDate(wheel.created_at)}
                            </span>
                        </div>
                        
                        {wheel.expiration_date && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Expiration:</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(wheel.expiration_date)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning Message */}
                <div className="p-6 border-b border-gray-200">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <Shield className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-red-800 mb-2">
                                    Permanent Deletion Warning
                                </h4>
                                <ul className="text-sm text-red-700 space-y-1">
                                    <li>• This action cannot be undone</li>
                                    <li>• All wheel events and history will be permanently deleted</li>
                                    <li>• Related position data will be removed</li>
                                    <li>• Performance calculations will be lost</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirmation Steps */}
                <div className="p-6">
                    {confirmationStep === 1 && (
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                Are you sure you want to permanently delete this wheel strategy?
                            </p>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFirstConfirmation}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Yes, Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {confirmationStep === 2 && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-700 mb-2">
                                    To confirm, type <strong className="text-red-600">{expectedConfirmText}</strong> below:
                                </p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                                        confirmText && !isTextConfirmed
                                            ? 'border-red-300 focus:ring-red-500'
                                            : isTextConfirmed
                                            ? 'border-green-300 focus:ring-green-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                    placeholder={expectedConfirmText}
                                    disabled={isDeleting}
                                    autoFocus
                                />
                                {confirmText && !isTextConfirmed && (
                                    <p className="text-sm text-red-600 mt-1">
                                        Text does not match. Please type exactly: {expectedConfirmText}
                                    </p>
                                )}
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setConfirmationStep(1)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSecondConfirmation}
                                    disabled={!isTextConfirmed || isDeleting}
                                    className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                                        isTextConfirmed && !isDeleting
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {isConfirmed && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-gray-700 mb-4">
                                    Final confirmation: This wheel strategy will be permanently deleted.
                                </p>
                                
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-red-700">
                                        <strong>Last chance:</strong> This action is irreversible and will remove all data associated with this wheel strategy.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setConfirmationStep(2)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFinalDelete}
                                    disabled={isDeleting}
                                    className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center ${
                                        isDeleting
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Permanently
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WheelDeleteModal;
