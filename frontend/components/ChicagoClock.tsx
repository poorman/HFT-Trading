'use client';

import { useState, useEffect } from 'react';

export default function ChicagoClock() {
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const updateTime = () => {
      const now = new Date();
      const chicagoTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setTime(chicagoTime + ' CT');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return <div className="text-white text-sm font-medium w-32">Loading...</div>;
  }

  return (
    <div className="text-white text-sm font-medium">
      {time}
    </div>
  );
}
