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

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'FILLED' | 'REJECTED'>('ALL')

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/executions`)
      if (response.data) {
        setExecutions(response.data)
      }
    } catch (err) {
      console.error('Error fetching executions:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredExecutions = executions.filter(e => 
    filter === 'ALL' || e.status === filter
  )

  const stats = {
    total: executions.length,
    filled: executions.filter(e => e.status === 'FILLED').length,
    rejected: executions.filter(e => e.status === 'REJECTED').length,
    fillRate: executions.length > 0 ? (executions.filter(e => e.status === 'FILLED').length / executions.length * 100) : 0
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold liquid-text liquid-glow mb-3">
            Execution History
          </h1>
          <p className="text-glass-muted text-lg">
            Complete order execution log and performance analytics
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="stat-label">Total Executions</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          
          <div className="stat-card metric-positive">
            <div className="stat-label">Filled Orders</div>
            <div className="stat-value text-green-300">{stats.filled}</div>
          </div>
          
          <div className="stat-card metric-negative">
            <div className="stat-label">Rejected Orders</div>
            <div className="stat-value text-red-300">{stats.rejected}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Fill Rate</div>
            <div className={`stat-value ${stats.fillRate >= 95 ? 'text-green-300' : 'text-yellow-300'}`}>
              {stats.fillRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="glass mb-6 p-2 rounded-2xl inline-flex">
          <button
            onClick={() => setFilter('ALL')}
            className={`glass-tab px-6 py-2 rounded-xl ${filter === 'ALL' ? 'glass-tab-active' : ''}`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('FILLED')}
            className={`glass-tab px-6 py-2 rounded-xl ${filter === 'FILLED' ? 'glass-tab-active' : ''}`}
          >
            Filled ({stats.filled})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`glass-tab px-6 py-2 rounded-xl ${filter === 'REJECTED' ? 'glass-tab-active' : ''}`}
          >
            Rejected ({stats.rejected})
          </button>
        </div>

        {/* Executions Table */}
        <div className="glass-card p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="glass p-8 rounded-3xl">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <p className="text-glass-muted">Loading executions...</p>
                </div>
              </div>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="glass p-12 rounded-xl text-center">
              <svg className="w-16 h-16 text-glass-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-glass-muted text-lg">No executions found</p>
            </div>
          ) : (
            <div className="glass-table overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-4">Order ID</th>
                    <th className="text-left px-6 py-4">Symbol</th>
                    <th className="text-left px-6 py-4">Side</th>
                    <th className="text-right px-6 py-4">Quantity</th>
                    <th className="text-right px-6 py-4">Price</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-right px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.map((execution, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-glass-muted font-mono text-xs">
                          {execution.order_id?.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-glass text-lg">{execution.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`glass-badge ${
                          execution.side === 'BUY' ? 'glass-badge-success' : 'glass-badge-danger'
                        }`}>
                          {execution.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-glass font-semibold">{execution.quantity?.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-glass font-semibold">${execution.price?.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`glass-badge ${
                          execution.status === 'FILLED' ? 'glass-badge-success' : 
                          execution.status === 'REJECTED' ? 'glass-badge-danger' : 
                          'glass-badge-warning'
                        }`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-glass-muted text-sm">
                          {new Date(execution.timestamp).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
