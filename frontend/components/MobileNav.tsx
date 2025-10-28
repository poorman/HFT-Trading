'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sm:hidden text-white p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shadow-lg border border-white/20"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-gradient-to-b from-slate-900/98 via-purple-900/98 to-slate-900/98 backdrop-blur-xl border-t border-white/30 shadow-2xl z-50 sm:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4 space-y-2">
              <a 
                href="/trading" 
                className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors shadow-sm"
                onClick={() => setIsOpen(false)}
              >
                📈 Trading
              </a>
              
              <div className="space-y-1">
                <div className="px-4 py-2 text-white/80 text-xs font-bold uppercase tracking-wider">
                  Strategies
                </div>
                <a 
                  href="/daily-movers" 
                  className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors ml-2 shadow-sm"
                  onClick={() => setIsOpen(false)}
                >
                  📊 Daily Movers
                </a>
                <a 
                  href="/strategy/movers" 
                  className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors ml-2 shadow-sm"
                  onClick={() => setIsOpen(false)}
                >
                  🎯 Movers Strategy
                </a>
              </div>

              <a 
                href="/positions" 
                className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors shadow-sm"
                onClick={() => setIsOpen(false)}
              >
                💼 Positions
              </a>
              
              <a 
                href="/analytics" 
                className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors shadow-sm"
                onClick={() => setIsOpen(false)}
              >
                📊 Analytics
              </a>
              
              <a 
                href="/monitoring" 
                className="block px-4 py-3 text-white font-medium hover:bg-white/20 rounded-lg transition-colors shadow-sm"
                onClick={() => setIsOpen(false)}
              >
                🖥️ Monitoring
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

