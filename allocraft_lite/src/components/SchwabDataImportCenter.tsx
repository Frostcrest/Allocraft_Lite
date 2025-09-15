import React, { useState } from 'react';
import { useImportPositions } from '../api/enhancedClient';
import { transform_positions, transform_orders, transform_transactions, transform_accounts } from '../services/schwabTransformClient';

// --- Exported for automated testing and UI use ---
export function schwabToAllocraftUnified({
    accountNumbers,
    accounts,
    accountsPositions,
    accountOrders,
    orders,
    transactions
}: any) {
    // 1. Accounts: from accounts or accountsPositions
    const accountsArr = transform_accounts(accountsPositions) || transform_accounts(accounts);
    // 2. Positions: from accountsPositions
    const positionsArr = transform_positions(accountsPositions);
    // 3. Orders: from accountOrders and orders
    const ordersArr = [
        ...transform_orders(accountOrders),
        ...transform_orders(orders)
    ];
    // 4. Transactions
    const transactionsArr = transform_transactions(transactions);

    // Map to Allocraft unified import format
    // See backend PortfolioService.import_positions for expected format
    return {
        export_info: {
            source: 'schwab',
            imported_at: new Date().toISOString(),
            total_accounts: accountsArr.length,
            total_positions: positionsArr.length,
            total_orders: ordersArr.length,
            total_transactions: transactionsArr.length
        },
        accounts: accountsArr.map((acct: any) => {
            // Always output snake_case 'account_number' for backend
            const account_number = acct.account_number || acct.accountNumber;
            // Find positions for this account
            const acctPositions = positionsArr.filter((p: any) => {
                return (p.account_number || p.accountNumber) === account_number;
            });
            // Find orders for this account
            const acctOrders = ordersArr.filter((o: any) => {
                return (o.account_number || o.accountNumber) === account_number;
            });
            // Find transactions for this account
            const acctTransactions = transactionsArr.filter((t: any) => {
                return (t.account_number || t.accountNumber) === account_number;
            });
            return {
                account_number,
                account_type: acct.type || acct.accountType || 'UNKNOWN',
                brokerage: 'schwab',
                hash_value: acct.hashValue || acct.hash_value || null,
                is_day_trader: acct.isDayTrader || acct.is_day_trader || false,
                cash_balance: (acct.currentBalances && acct.currentBalances.cashBalance) || acct.cashBalance || 0,
                buying_power: (acct.currentBalances && acct.currentBalances.buyingPower) || acct.buyingPower || 0,
                total_value: (acct.currentBalances && acct.currentBalances.liquidationValue) || acct.totalValue || 0,
                day_trading_buying_power: (acct.currentBalances && acct.currentBalances.dayTradingBuyingPower) || acct.dayTradingBuyingPower || 0,
                last_synced: new Date().toISOString(),
                is_active: true,
                positions: acctPositions.map((p: any) => ({
                    symbol: p.instrument?.symbol || p.symbol,
                    asset_type: p.instrument?.assetType || p.assetType || p.asset_type,
                    underlying_symbol: p.instrument?.underlyingSymbol || p.underlyingSymbol,
                    option_type: p.instrument?.putCall || p.optionType || p.option_type,
                    strike_price: p.strikePrice || p.strike_price,
                    expiration_date: p.expirationDate || p.expiration_date,
                    long_quantity: p.longQuantity || p.long_quantity || 0,
                    short_quantity: p.shortQuantity || p.short_quantity || 0,
                    market_value: p.marketValue || p.market_value || 0,
                    data_source: 'schwab_import'
                })),
                orders: acctOrders,
                transactions: acctTransactions
            };
        })
    };
}
/**
 * Schwab Data Import Center
 * Accepts 6 Schwab endpoint files or JSON blobs and maps to Allocraft's unified model.
 */

const SchwabDataImportCenter: React.FC = () => {
    // State for each Schwab endpoint
    const [accountNumbersInput, setAccountNumbersInput] = useState('');
    const [accountsInput, setAccountsInput] = useState('');
    const [accountsPositionsInput, setAccountsPositionsInput] = useState('');
    const [accountOrdersInput, setAccountOrdersInput] = useState('');
    const [ordersInput, setOrdersInput] = useState('');
    const [transactionsInput, setTransactionsInput] = useState('');

    const [parseError, setParseError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [preview, setPreview] = useState<any | null>(null);
    const importPositions = useImportPositions();

    // File upload handler for each input
    const handleFileChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setParseError(null);
        setSuccessMsg(null);
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                setter(text);
            } catch {
                setParseError('Invalid JSON in file.');
            }
        };
        reader.readAsText(file);
    };

    // Helper to robustly parse JSON input
    const safeParse = (input: string | undefined, label?: string) => {
        if (!input || input.trim() === '') return undefined;
        try {
            return JSON.parse(input.trim());
        } catch (e) {
            throw new Error((label ? `${label}: ` : '') + (e instanceof Error ? e.message : String(e)));
        }
    };

    // Preview handler
    const handlePreview = () => {
        setParseError(null);
        setSuccessMsg(null);
        try {
            setPreview({
                accountNumbers: safeParse(accountNumbersInput, 'accountNumbers'),
                accounts: safeParse(accountsInput, 'accounts'),
                accountsPositions: safeParse(accountsPositionsInput, 'accountsPositions'),
                accountOrders: safeParse(accountOrdersInput, 'accountOrders'),
                orders: safeParse(ordersInput, 'orders'),
                transactions: safeParse(transactionsInput, 'transactions'),
            });
        } catch (e: any) {
            setParseError('Invalid JSON in one or more inputs.' + (e?.message ? ` (${e.message})` : ''));
        }
    };

    // Import handler
    const handleImport = async () => {
        setParseError(null);
        setSuccessMsg(null);
        try {
            // Parse all 6 Schwab blobs robustly
            const accountNumbers = safeParse(accountNumbersInput, 'accountNumbers');
            const accounts = safeParse(accountsInput, 'accounts');
            const accountsPositions = safeParse(accountsPositionsInput, 'accountsPositions');
            const accountOrders = safeParse(accountOrdersInput, 'accountOrders');
            const orders = safeParse(ordersInput, 'orders');
            const transactions = safeParse(transactionsInput, 'transactions');

            // Transform to Allocraft unified import format
            const unified = schwabToAllocraftUnified({
                accountNumbers,
                accounts,
                accountsPositions,
                accountOrders,
                orders,
                transactions
            });

            // Send to backend
            const result = await importPositions.mutateAsync(unified);
            setSuccessMsg(`Imported ${result.imported_count || result.positions || 0} positions successfully!`);
        } catch (err: any) {
            setParseError(err?.message || 'Import failed.');
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '2rem auto', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', fontFamily: 'inherit' }}>
            <h2>Schwab Data Import Center</h2>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>
                Upload or paste JSON for each Schwab endpoint below. All 6 are required for a complete import.
            </p>
            <ImportInput label="GET accounts/accountNumbers" value={accountNumbersInput} setValue={setAccountNumbersInput} onFile={handleFileChange(setAccountNumbersInput)} />
            <ImportInput label="GET accounts" value={accountsInput} setValue={setAccountsInput} onFile={handleFileChange(setAccountsInput)} />
            <ImportInput label="GET accounts?fields=positions" value={accountsPositionsInput} setValue={setAccountsPositionsInput} onFile={handleFileChange(setAccountsPositionsInput)} />
            <ImportInput label="GET accounts/{accountNumber}/orders" value={accountOrdersInput} setValue={setAccountOrdersInput} onFile={handleFileChange(setAccountOrdersInput)} />
            <ImportInput label="GET orders" value={ordersInput} setValue={setOrdersInput} onFile={handleFileChange(setOrdersInput)} />
            <ImportInput label="GET transactions" value={transactionsInput} setValue={setTransactionsInput} onFile={handleFileChange(setTransactionsInput)} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 16 }}>
                <button onClick={handlePreview} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 500 }}>Preview</button>
                <button onClick={handleImport} style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>Import Data</button>
            </div>
            {parseError && <div style={{ color: '#c00', marginBottom: 8 }}>{parseError}</div>}
            {successMsg && <div style={{ color: '#080', marginBottom: 8 }}>{successMsg}</div>}
            {preview && <pre style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, fontSize: 14, minHeight: 120 }}>{JSON.stringify(preview, null, 2)}</pre>}
        </div>
    );
};

// Reusable input for file or textarea
function ImportInput({ label, value, setValue, onFile }: { label: string, value: string, setValue: (v: string) => void, onFile: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, fontSize: 15 }}>{label}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <input type="file" accept="application/json" onChange={onFile} style={{ marginBottom: 0 }} />
                <span style={{ color: '#888', fontSize: 12 }}>(or paste JSON below)</span>
            </div>
            <textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                rows={4}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 14, padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }}
                placeholder={`Paste JSON for ${label} here...`}
            />
        </div>
    );
}

export default SchwabDataImportCenter;
