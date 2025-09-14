
import React, { useState } from 'react';
import { useImportPositions } from '../api/enhancedClient';
import { transform_positions, transform_orders, transform_transactions } from '../services/schwabTransformClient';

/**
 * Schwab JSON Importer
 * Allows users to paste Schwab API JSON and import positions into Allocraft.
 */

const SchwabJsonImport: React.FC = () => {
    const [jsonInput, setJsonInput] = useState('');
    const [parseError, setParseError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [preview, setPreview] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'transactions' | 'wheels'>('positions');
    const importPositions = useImportPositions();

    // File upload handler
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setParseError(null);
        setSuccessMsg(null);
        setPreview(null);
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                setJsonInput(text);
                const parsed = JSON.parse(text);
                setPreview(parsed);
            } catch {
                setParseError('Invalid JSON in file.');
            }
        };
        reader.readAsText(file);
    };

    // Preview handler for pasted JSON
    const handlePreview = () => {
        setParseError(null);
        setSuccessMsg(null);
        try {
            const parsed = JSON.parse(jsonInput);
            setPreview(parsed);
        } catch {
            setParseError('Invalid JSON. Please check your input.');
        }
    };

    // Import handler
    const handleImport = async () => {
        setParseError(null);
        setSuccessMsg(null);
        let parsed: any;
        try {
            parsed = JSON.parse(jsonInput);
        } catch (e) {
            setParseError('Invalid JSON. Please check your input.');
            return;
        }
        try {
            const result = await importPositions.mutateAsync(parsed);
            setSuccessMsg(`Imported ${result.imported_count} positions successfully!`);
            setJsonInput('');
            setPreview(null);
            setFileName(null);
        } catch (err: any) {
            setParseError(err?.message || 'Import failed.');
        }
    };

    return (
        <div style={{
            maxWidth: 700,
            margin: '2rem auto',
            padding: '2rem',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
            fontFamily: 'inherit',
        }}>
            <h2 style={{ marginBottom: 8 }}>Import Schwab Data (JSON)</h2>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>
                Paste Schwab API JSON or upload a file. Preview and import positions, orders, transactions, and wheels into Allocraft.
            </p>
            <input type="file" accept="application/json" onChange={handleFileChange} style={{ marginBottom: 12 }} />
            {fileName && <div style={{ color: '#444', fontSize: 13, marginBottom: 8 }}>Loaded file: {fileName}</div>}
            <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                rows={10}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 14, padding: 10, borderRadius: 6, border: '1px solid #ccc', marginBottom: 12 }}
                placeholder="Paste Schwab API JSON here..."
                disabled={importPositions.isPending}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={handlePreview} disabled={!jsonInput.trim()} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 500 }}>Preview</button>
                <button
                    onClick={handleImport}
                    disabled={importPositions.isPending || !jsonInput.trim()}
                    style={{
                        background: '#1a73e8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontWeight: 600,
                        cursor: importPositions.isPending ? 'not-allowed' : 'pointer',
                        opacity: importPositions.isPending ? 0.7 : 1,
                        transition: 'background 0.2s',
                    }}
                >
                    {importPositions.isPending ? 'Importing...' : 'Import Data'}
                </button>
            </div>
            {parseError && <div style={{ color: '#c00', marginBottom: 8 }}>{parseError}</div>}
            {successMsg && <div style={{ color: '#080', marginBottom: 8 }}>{successMsg}</div>}
            {preview && (
                <>
                    <div style={{ margin: '18px 0 8px 0', display: 'flex', gap: 8 }}>
                        {['positions', 'orders', 'transactions', 'wheels'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                style={{
                                    background: activeTab === tab ? '#1a73e8' : '#eee',
                                    color: activeTab === tab ? '#fff' : '#222',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '8px 18px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: 15,
                                    transition: 'background 0.2s',
                                }}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, fontSize: 14, minHeight: 120 }}>
                        {activeTab === 'positions' && (
                            <PreviewTable
                                title="Positions"
                                data={transform_positions(preview)}
                                columns={['instrument.symbol', 'instrument.assetType', 'longQuantity', 'shortQuantity', 'marketValue', 'averagePrice']}
                            />
                        )}
                        {activeTab === 'orders' && (
                            <PreviewTable
                                title="Orders"
                                data={transform_orders(preview)}
                                columns={['orderId', 'orderType', 'status', 'quantity', 'price', 'symbol']}
                            />
                        )}
                        {activeTab === 'transactions' && (
                            <PreviewTable
                                title="Transactions"
                                data={transform_transactions(preview)}
                                columns={['transactionId', 'type', 'date', 'amount', 'symbol']}
                            />
                        )}
                        {activeTab === 'wheels' && (
                            <div style={{ color: '#888', fontStyle: 'italic' }}>Wheels import coming soon.</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    // Helper: PreviewTable
    function PreviewTable({ title, data, columns }: { title: string, data: any[], columns: string[] }) {
        if (!Array.isArray(data) || data.length === 0) {
            return <div style={{ color: '#888', fontStyle: 'italic' }}>No {title.toLowerCase()} found in this file.</div>;
        }
        return (
            <div>
                <strong>{title} ({data.length})</strong>
                <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                        <thead>
                            <tr>
                                {columns.map(col => <th key={col} style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid #ddd', background: '#f0f0f0' }}>{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(0, 10).map((row, i) => (
                                <tr key={i}>
                                    {columns.map(col => <td key={col} style={{ padding: 4, borderBottom: '1px solid #eee' }}>{getNested(row, col)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.length > 10 && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>(showing first 10 rows)</div>}
                </div>
            </div>
        );
    }

    // Helper: getNested
    function getNested(obj: any, path: string) {
        return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : ''), obj);
    }

}

export default SchwabJsonImport;
