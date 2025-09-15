import React, { useState } from 'react';
import { useImportPositions } from '../api/enhancedClient';
import { transform_positions, transform_orders, transform_transactions } from '../services/schwabTransformClient';

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

    // Preview handler
    const handlePreview = () => {
        setParseError(null);
        setSuccessMsg(null);
        try {
            setPreview({
                accountNumbers: JSON.parse(accountNumbersInput),
                accounts: JSON.parse(accountsInput),
                accountsPositions: JSON.parse(accountsPositionsInput),
                accountOrders: JSON.parse(accountOrdersInput),
                orders: JSON.parse(ordersInput),
                transactions: JSON.parse(transactionsInput),
            });
        } catch {
            setParseError('Invalid JSON in one or more inputs.');
        }
    };

    // Import handler (stub: will wire up to Allocraft model in next step)
    const handleImport = async () => {
        setParseError(null);
        setSuccessMsg(null);
        try {
            // TODO: Transform all 6 Schwab blobs to Allocraft's unified import format
            setSuccessMsg('Import logic will be implemented in the next step.');
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
