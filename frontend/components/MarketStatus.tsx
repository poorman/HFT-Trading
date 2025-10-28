'use client';

import { useState, useEffect } from 'react';

// Force rebuild - v2

export default function MarketStatus() {
  const [countdown, setCountdown] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateCountdown = () => {
      const now = new Date();
      
      // Convert to Chicago time
      const chicagoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const hours = chicagoTime.getHours();
      const minutes = chicagoTime.getMinutes();
      const seconds = chicagoTime.getSeconds();
      const day = chicagoTime.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Market hours: 8:30 AM - 4:00 PM CT, Monday-Friday
      const isWeekday = day >= 1 && day <= 5;
      const currentTimeInMinutes = hours * 60 + minutes;
      const marketOpen = 8 * 60 + 30; // 8:30 AM
      const marketClose = 16 * 60; // 4:00 PM
      
      const marketIsOpen = isWeekday && currentTimeInMinutes >= marketOpen && currentTimeInMinutes < marketClose;
      setIsOpen(marketIsOpen);
      
      if (marketIsOpen) {
        // Market is open - show time until close
        const closeTime = new Date(chicagoTime);
        closeTime.setHours(16, 0, 0, 0);
        const diff = closeTime.getTime() - chicagoTime.getTime();
        
        const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
        
        setCountdown(`Closes in ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`);
      } else {
        // Market is closed - show time until next open
        let nextOpen = new Date(chicagoTime);
        
        // If it's after market close today, move to tomorrow
        if (currentTimeInMinutes >= marketClose) {
          nextOpen.setDate(nextOpen.getDate() + 1);
        }
        
        // If it's weekend, move to Monday
        if (day === 0) { // Sunday
          nextOpen.setDate(nextOpen.getDate() + 1);
        } else if (day === 6) { // Saturday
          nextOpen.setDate(nextOpen.getDate() + 2);
        } else if (!isWeekday || currentTimeInMinutes >= marketClose) {
          // Friday after close, move to Monday
          const daysUntilMonday = day === 5 ? 3 : (day === 6 ? 2 : 1);
          if (day === 5 && currentTimeInMinutes >= marketClose) {
            nextOpen.setDate(nextOpen.getDate() + 3);
          }
        }
        
        // Set to 8:30 AM
        nextOpen.setHours(8, 30, 0, 0);
        
        // Calculate difference
        const diff = nextOpen.getTime() - chicagoTime.getTime();
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setCountdown(`Opens in ${days}d ${hours}h ${minutesLeft}m ${secondsLeft}s`);
        } else {
          setCountdown(`Opens in ${hours}h ${minutesLeft}m ${secondsLeft}s`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  // Create compact version for mobile
  const compactCountdown = countdown.replace('Opens in ', '').replace('Closes in ', '');

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* LIVE Badge - Green when market is open, Red when closed */}
      <div className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap flex items-center gap-1 border ${
        isOpen 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
          : 'bg-red-500/20 border-red-500/50 text-red-400'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
        <span className="hidden sm:inline">LIVE</span>
      </div>

      {/* Market Countdown Timer */}
      <div className={`px-2 sm:px-3 py-1 rounded-full font-semibold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 border ${
        isOpen 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
          : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
      }`}>
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="whitespace-nowrap">
          {compactCountdown}
        </span>
      </div>
    </div>
  );
}

