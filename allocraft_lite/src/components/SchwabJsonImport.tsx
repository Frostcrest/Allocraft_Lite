import React, { useState } from 'react';
import { useImportPositions } from '../api/enhancedClient';

/**
 * Schwab JSON Importer
 * Allows users to paste Schwab API JSON and import positions into Allocraft.
 */
const SchwabJsonImport: React.FC = () => {
    const [jsonInput, setJsonInput] = useState('');
    const [parseError, setParseError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const importPositions = useImportPositions();

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
        } catch (err: any) {
            setParseError(err?.message || 'Import failed.');
        }
    };

    return (
        <div style={{
            maxWidth: 520,
            margin: '2rem auto',
            padding: '2rem',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
            fontFamily: 'inherit',
        }}>
            <h2 style={{ marginBottom: 8 }}>Import Schwab Positions (JSON)</h2>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>
                Paste the JSON result from Schwab's API export or developer tools below. This will import positions into your Allocraft account.
            </p>
            <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                rows={10}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 14, padding: 10, borderRadius: 6, border: '1px solid #ccc', marginBottom: 12 }}
                placeholder="Paste Schwab API JSON here..."
                disabled={importPositions.isPending}
            />
            {parseError && <div style={{ color: '#c00', marginBottom: 8 }}>{parseError}</div>}
            {successMsg && <div style={{ color: '#080', marginBottom: 8 }}>{successMsg}</div>}
            <button
                onClick={handleImport}
                disabled={importPositions.isPending || !jsonInput.trim()}
                style={{
                    background: '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 24px',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: importPositions.isPending ? 'not-allowed' : 'pointer',
                    opacity: importPositions.isPending ? 0.7 : 1,
                    transition: 'background 0.2s',
                }}
            >
                {importPositions.isPending ? 'Importing...' : 'Import Positions'}
            </button>
        </div>
    );
};

export default SchwabJsonImport;
