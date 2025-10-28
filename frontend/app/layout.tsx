import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MarketStatus from '@/components/MarketStatus'
import MobileNav from '@/components/MobileNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HFT Trading System',
  description: 'Ultra-low-latency high-frequency trading platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} animated-gradient-bg`}>
        <div className="min-h-screen">
          {/* Sticky Navigation - Not transparent, solid background */}
          <nav className="sticky top-0 w-full z-50 bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-lg border-b border-white/10 shadow-xl">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14 sm:h-16">
                {/* Logo + Navigation */}
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button */}
                  <div className="lg:hidden">
                    <MobileNav />
                  </div>
                  
                  {/* Logo - Same on mobile and desktop */}
                  <h1 className="text-lg sm:text-2xl font-bold text-white whitespace-nowrap">
                    ⚡ HFT Trading
                  </h1>
                  
                  {/* Desktop Navigation */}
                  <div className="hidden lg:flex lg:space-x-1 lg:ml-6">
                    <a href="/trading" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm transition-colors">
                      Trading
                    </a>
                    <div className="relative group">
                      <button className="text-white hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors">
                        Strategies
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="bg-slate-800/95 backdrop-blur-lg shadow-2xl border border-white/20 rounded-lg overflow-hidden">
                          <a href="/daily-movers" className="block px-4 py-3 text-white hover:bg-white/10 transition-colors border-b border-white/10 text-sm">
                            📊 Daily Movers
                    </a>
                          <a href="/strategy/movers" className="block px-4 py-3 text-white hover:bg-white/10 transition-colors text-sm">
                            🎯 Movers Strategy
                          </a>
                        </div>
                      </div>
                    </div>
                    <a href="/positions" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm transition-colors">
                      Positions
                    </a>
                    <a href="/analytics" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm transition-colors">
                      Analytics
                    </a>
                    <a href="/monitoring" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm transition-colors">
                      Monitoring
                    </a>
                  </div>
                </div>

                {/* Right side - Market Status (LIVE badge + Countdown) */}
                <MarketStatus />
              </div>
            </div>
          </nav>
          
          {/* Main Content - No overlap with menu */}
          <main className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Decorative Floating Orbs */}
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 float-animation"></div>
            <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 float-animation" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-green-400/30 to-emerald-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 float-animation" style={{animationDelay: '2s', animationDuration: '5s'}}></div>
            <div className="absolute bottom-40 right-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 float-animation" style={{animationDelay: '1.5s', animationDuration: '6s'}}></div>
          </div>
        </div>
      </body>
    </html>
  )
}
