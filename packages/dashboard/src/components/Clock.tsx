import React, { useEffect, useState } from 'react';

/** Displays current time, updates every second */
export function Clock(): React.ReactElement {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <span data-testid="overlay-clock" style={{ fontSize: '3vw', fontWeight: 700 }}>
      {hours}:{minutes}
    </span>
  );
}
