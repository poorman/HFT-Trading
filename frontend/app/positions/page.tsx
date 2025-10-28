'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

// Get API URL dynamically based on current page URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    
    // For production domains (hft.widesurf.com), use hftapi.widesurf.com
    if (host === 'hft.widesurf.com') {
      return 'https://hftapi.widesurf.com/api'
    }
    
    // For IP addresses (dev), use direct backend
    if (host.includes('178.128.15.57')) {
      return 'http://178.128.15.57:8082/api'
    }
  }
  // Fallback for SSR - use relative path
  return '/api'
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPositions()
    // Fetch every 60 seconds instead of 5 seconds to avoid rate limiting
    const interval = setInterval(fetchPositions, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchPositions = async () => {
    try {
      const apiUrl = getApiUrl()
      console.log('📊 Fetching positions from:', `${apiUrl}/positions`)
      
      const response = await axios.get(`${apiUrl}/positions`)
      console.log('📥 Positions response:', response.data)
      
      // Handle different response formats
      if (response.data.positions) {
        // Format: { positions: [...] }
        setPositions(response.data.positions)
        console.log('✓ Loaded positions from .positions:', response.data.positions.length)
      } else if (Array.isArray(response.data)) {
        // Format: [...]
        setPositions(response.data)
        console.log('✓ Loaded positions from array:', response.data.length)
      } else {
        // No positions
        setPositions([])
        console.log('ℹ️ No positions found')
      }
    } catch (err: any) {
      console.error('❌ Error fetching positions:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      // Don't clear positions on error - keep showing last known state
    } finally {
      setLoading(false)
    }
  }

  const totalPnL = Array.isArray(positions)
    ? positions.reduce((sum, p) => {
        const qty = parseFloat(p.qty || 0)
        const avgPrice = parseFloat(p.avg_entry_price || 0)
        const currentPrice = parseFloat(p.current_price || 0)
        const unrealizedPnL = (currentPrice - avgPrice) * qty
        return sum + unrealizedPnL
      }, 0)
    : 0

  const totalValue = Array.isArray(positions)
    ? positions.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0)
    : 0

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="glass-card p-10 text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">Portfolio Positions</h1>
        <p className="text-white/80 text-lg font-light">Real-time position tracking and performance analytics</p>
      </div>

      {/* Professional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Open Positions */}
        <div className="glass-card p-8 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-2">Open Positions</div>
          <div className="text-5xl font-bold text-white">
            {Array.isArray(positions) ? positions.length : 0}
          </div>
        </div>

        {/* Total Value */}
        <div className="glass-card p-8 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-2">Total Market Value</div>
          <div className="text-5xl font-bold text-white">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total P&L */}
        <div className={`glass-card p-8 hover:scale-[1.02] transition-all duration-300 ${totalPnL >= 0 ? 'border-l-4 border-emerald-400' : 'border-l-4 border-rose-400'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              totalPnL >= 0 
                ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                : 'bg-gradient-to-br from-rose-500 to-red-600'
            }`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={totalPnL >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-2">Total P&L</div>
          <div className={`text-5xl font-bold ${totalPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Active Positions</h2>
          <button
            onClick={fetchPositions}
            className="glass-button text-sm px-6 py-2"
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-white/60">Loading positions...</p>
            </div>
          </div>
        ) : !Array.isArray(positions) || positions.length === 0 ? (
          <div className="glass p-20 rounded-2xl text-center">
            <svg className="w-20 h-20 text-white/30 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-white/70 text-xl font-semibold mb-2">No Open Positions</p>
            <p className="text-white/50">Submit trades to build your portfolio</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-white/90">Symbol</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Quantity</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Avg Cost</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Current Price</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Market Value</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Unrealized P&L</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-white/90">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => {
                    // Parse numeric values from Alpaca (they come as strings)
                    const qty = parseFloat(position.qty || 0)
                    const avgPrice = parseFloat(position.avg_entry_price || 0)
                    const currentPrice = parseFloat(position.current_price || 0)
                    const marketValue = parseFloat(position.market_value || 0)
                    
                    // Calculate unrealized P&L: (Current Price - Avg Price) × Quantity
                    const pnl = (currentPrice - avgPrice) * qty
                    
                    // Calculate return percentage: ((Current - Avg) / Avg) × 100
                    const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0

                    return (
                      <tr 
                        key={index} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                              {position.symbol?.substring(0, 2) || 'XX'}
                            </div>
                            <span className="font-bold text-white text-lg">{position.symbol}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-white font-semibold">{qty.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-white/80">${avgPrice.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-white/80">${currentPrice.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-white font-bold text-lg">
                            ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className={`inline-flex items-center px-4 py-2 rounded-lg font-bold text-lg ${
                            pnl >= 0 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {pnl >= 0 ? '↗' : '↘'} {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className={`inline-flex items-center px-4 py-2 rounded-full font-bold ${
                            pnlPercent >= 0 
                              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' 
                              : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                          }`}>
                            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
