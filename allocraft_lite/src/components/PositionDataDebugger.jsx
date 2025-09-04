/**
 * Debug Component for Position Data Analysis
 * Temporary component to inspect actual position data structure
 */
import React from 'react';
import { usePositionsData } from '../api/enhancedClient';

export default function PositionDataDebugger() {
  const { allPositions, stockPositions, optionPositions, isLoading, isError } = usePositionsData();

  console.log('🔍 PositionDataDebugger:', {
    allPositions,
    stockPositions,
    optionPositions,
    isLoading,
    isError
  });

  if (isLoading) {
    return <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'yellow', 
      padding: '10px',
      border: '1px solid black',
      zIndex: 9999
    }}>
      Loading positions...
    </div>;
  }

  if (isError) {
    return <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'red', 
      color: 'white',
      padding: '10px',
      border: '1px solid black',
      zIndex: 9999
    }}>
      Error loading positions!
    </div>;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'lightblue', 
      padding: '10px',
      border: '1px solid black',
      zIndex: 9999,
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      fontSize: '12px'
    }}>
      <h4>Position Data Debug</h4>
      <div><strong>All Positions:</strong> {allPositions?.length || 0}</div>
      <div><strong>Stock Positions:</strong> {stockPositions?.length || 0}</div>
      <div><strong>Option Positions:</strong> {optionPositions?.length || 0}</div>
      
      {allPositions?.length > 0 && (
        <div>
          <h5>Sample Position:</h5>
          <pre style={{ fontSize: '10px' }}>
            {JSON.stringify(allPositions[0], null, 2)}
          </pre>
        </div>
      )}
      
      {optionPositions?.length > 0 && (
        <div>
          <h5>Sample Option:</h5>
          <pre style={{ fontSize: '10px' }}>
            {JSON.stringify(optionPositions[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
