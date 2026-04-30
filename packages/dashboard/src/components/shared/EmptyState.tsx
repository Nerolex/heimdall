import React from 'react';

/** Displayed when no views are configured */
export function EmptyState(): React.ReactElement {
  return (
    <div
      data-testid="empty-state"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: '#888',
        fontSize: '1.5rem',
      }}
    >
      <p>No views configured</p>
      <p style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
        Create a config.json file to get started.
      </p>
    </div>
  );
}
