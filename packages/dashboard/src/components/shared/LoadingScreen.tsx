import React from 'react';

export function LoadingScreen(): React.ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
      }}
    >
      Loading...
    </div>
  );
}
