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

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/analytics`)
      if (response.data) {
        setAnalytics(response.data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold liquid-text liquid-glow mb-3">
            Trading Analytics
          </h1>
          <p className="text-glass-muted text-lg">
            Advanced metrics and performance insights
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="glass p-12 rounded-3xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-glass-muted text-lg">Loading analytics...</p>
              </div>
            </div>
          </div>
        ) : !analytics ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-20 h-20 text-glass-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-glass-muted text-xl">No analytics data available</p>
            <p className="text-glass-subtle mt-2">Start trading to generate insights</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="stat-card">
                <div className="glass-icon mb-4">
                  <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="stat-label">Total Orders</div>
                <div className="stat-value">{analytics?.total_orders || 0}</div>
              </div>

              <div className="stat-card metric-positive">
                <div className="glass-icon mb-4">
                  <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-label">Fill Rate</div>
                <div className="stat-value text-green-300">{(analytics?.fillRate || 0).toFixed(1)}%</div>
              </div>

              <div className="stat-card">
                <div className="glass-icon mb-4">
                  <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="stat-label">Avg Latency</div>
                <div className="stat-value">{(analytics?.avg_latency_ms || 0).toFixed(2)}ms</div>
              </div>

              <div className="stat-card">
                <div className="glass-icon mb-4">
                  <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-label">Total Volume</div>
                <div className="stat-value">${(analytics?.total_volume || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Additional Insights */}
            <div className="glass-card p-8">
              <h2 className="text-2xl font-bold liquid-text mb-6">Performance Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-xl">
                  <h3 className="text-glass font-semibold mb-4">Order Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">Buy Orders</span>
                      <span className="text-green-300 font-bold">{analytics?.buy_orders || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">Sell Orders</span>
                      <span className="text-red-300 font-bold">{analytics?.sell_orders || 0}</span>
                    </div>
                    <div className="glass-divider"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">Buy/Sell Ratio</span>
                      <span className="text-glass font-bold">
                        {((analytics?.buy_orders || 0) / Math.max(analytics?.sell_orders || 1, 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-xl">
                  <h3 className="text-glass font-semibold mb-4">System Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">Success Rate</span>
                      <span className="text-green-300 font-bold">{(analytics?.fillRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">P50 Latency</span>
                      <span className="text-glass font-bold">{(analytics?.p50_latency_ms || 0).toFixed(2)}ms</span>
                    </div>
                    <div className="glass-divider"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-glass-muted">P99 Latency</span>
                      <span className="text-yellow-300 font-bold">{(analytics?.p99_latency_ms || 0).toFixed(2)}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
