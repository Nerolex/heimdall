import React from 'react';

interface ErrorStateProps {
  message?: string;
}

/** Displayed when config has errors or component type is unknown */
export function ErrorState({ message }: ErrorStateProps): React.ReactElement {
  return (
    <div
      data-testid="error-state"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: '#ff6b6b',
        fontSize: '1.5rem',
      }}
    >
      <p>⚠ {message || 'Unknown component type'}</p>
    </div>
  );
}
