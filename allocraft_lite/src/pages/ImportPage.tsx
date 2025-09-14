import React from 'react';
import SchwabDataImportCenter from '../components/SchwabDataImportCenter';

const ImportPage: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', background: '#f6f8fa', padding: '2rem 0' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
                    Data Import Center
                </h1>
                <p style={{ color: '#444', fontSize: 17, marginBottom: 32, textAlign: 'center' }}>
                    Import your data from various sources. More importers coming soon!
                </p>
                <SchwabDataImportCenter />
                {/* Future importers can be added here as new sections/components */}
            </div>
        </div>
    );
};

export default ImportPage;
