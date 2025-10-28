'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

// Get API URL dynamically based on current page URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    
    // For production domains (hft.widesurf.com), use hftapi.widesurf.com
    if (host === 'hft.widesurf.com') {
      return 'https://hftapi.widesurf.com'
    }
    
    // For IP addresses (dev), use direct backend
    if (host.includes('178.128.15.57')) {
      return 'http://178.128.15.57:8082'
    }
  }
  // Fallback for SSR - use relative path
  return ''
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchHealth = async () => {
    try {
      const apiUrl = getApiUrl()
      console.log('🏥 Fetching health from:', `${apiUrl}/health`)
      
      const response = await axios.get(`${apiUrl}/health`)
      console.log('📥 Health response:', response.data)
      
      if (response.data) {
        setHealth(response.data)
      }
    } catch (err: any) {
      console.error('❌ Error fetching health:', err)
      console.error('Error response:', err.response?.data)
      // Set error state but don't clear health data
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'ok':
        return 'glass-badge-success'
      case 'degraded':
      case 'slow':
        return 'glass-badge-warning'
      default:
        return 'glass-badge-danger'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'ok':
        return (
          <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'degraded':
      case 'slow':
        return (
          <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold liquid-text liquid-glow mb-3">
            System Monitoring
          </h1>
          <p className="text-glass-muted text-lg">
            Real-time health status and system diagnostics
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="glass p-12 rounded-3xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-glass-muted text-lg">Checking system health...</p>
              </div>
            </div>
          </div>
        ) : !health ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-20 h-20 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-glass text-xl">Unable to fetch health status</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overall Status */}
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold liquid-text mb-2">Overall System Status</h2>
                  <p className="text-glass-muted">All critical services operational</p>
                </div>
                <div className={`glass-badge ${getStatusColor(health.status)} text-lg px-6 py-3 pulse-glow`}>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(health.status)}
                    <span>{health.status?.toUpperCase() || 'UNKNOWN'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Trading Engine */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-glass">Trading Engine</h3>
                  <div className={`glass-badge ${getStatusColor(health.services?.engine?.status)}`}>
                    {getStatusIcon(health.services?.engine?.status)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Status</span>
                    <span className="text-glass font-semibold">{health.services?.engine?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Latency</span>
                    <span className="text-glass font-semibold">{health.services?.engine?.latency_ms || 0}ms</span>
                  </div>
                  {health.services?.engine?.error && (
                    <div className="flex justify-between">
                      <span className="text-red-400 text-xs">{health.services.engine.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Database */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-glass">Database</h3>
                  <div className={`glass-badge ${getStatusColor(health.services?.database?.status)}`}>
                    {getStatusIcon(health.services?.database?.status)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Status</span>
                    <span className="text-glass font-semibold">{health.services?.database?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Latency</span>
                    <span className="text-glass font-semibold">{health.services?.database?.latency_ms || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Connections</span>
                    <span className="text-glass font-semibold">{health.services?.database?.connections || 0}</span>
                  </div>
                </div>
              </div>

              {/* Redis */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-glass">Redis Cache</h3>
                  <div className={`glass-badge ${getStatusColor(health.services?.redis?.status)}`}>
                    {getStatusIcon(health.services?.redis?.status)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Status</span>
                    <span className="text-glass font-semibold">{health.services?.redis?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Latency</span>
                    <span className="text-glass font-semibold">{health.services?.redis?.latency_ms || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted text-sm">Hit Rate</span>
                    <span className="text-glass font-semibold">{parseFloat(health.services?.redis?.hit_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Metrics */}
            <div className="glass-card p-8">
              <h2 className="text-2xl font-bold liquid-text mb-6">System Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-xl">
                  <div className="stat-label mb-2">Uptime</div>
                  <div className="text-glass text-2xl font-bold">{health.uptime || '0s'}</div>
                </div>
                
                <div className="glass p-6 rounded-xl">
                  <div className="stat-label mb-2">Requests/sec</div>
                  <div className="text-glass text-2xl font-bold">{health.requests_per_sec || 0}</div>
                </div>
                
                <div className="glass p-6 rounded-xl">
                  <div className="stat-label mb-2">Active WebSockets</div>
                  <div className="text-glass text-2xl font-bold">{health.active_websockets || 0}</div>
                </div>
              </div>
            </div>

            {/* Grafana Dashboards */}
            <div className="glass-card p-8">
              <h2 className="text-2xl font-bold liquid-text mb-6">Grafana Dashboards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="http://178.128.15.57:3001/d/hft-order-flow" target="_blank" rel="noopener noreferrer" className="glass-link">
                  <div className="glass p-6 rounded-xl hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3">
                      <div className="glass-icon">
                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-glass font-bold">Order Flow</div>
                        <div className="text-glass-muted text-sm">Submissions, fills, rejections</div>
                      </div>
                    </div>
                  </div>
                </a>

                <a href="http://178.128.15.57:3001/d/hft-latency" target="_blank" rel="noopener noreferrer" className="glass-link">
                  <div className="glass p-6 rounded-xl hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3">
                      <div className="glass-icon">
                        <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-glass font-bold">Latency Analysis</div>
                        <div className="text-glass-muted text-sm">P50, P95, P99 percentiles</div>
                      </div>
                    </div>
                  </div>
                </a>

                <a href="http://178.128.15.57:3001/d/hft-pnl" target="_blank" rel="noopener noreferrer" className="glass-link">
                  <div className="glass p-6 rounded-xl hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3">
                      <div className="glass-icon">
                        <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-glass font-bold">Position & P&L</div>
                        <div className="text-glass-muted text-sm">Profit/loss tracking</div>
                      </div>
                    </div>
                  </div>
                </a>

                <a href="http://178.128.15.57:3001/d/hft-health" target="_blank" rel="noopener noreferrer" className="glass-link">
                  <div className="glass p-6 rounded-xl hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3">
                      <div className="glass-icon">
                        <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-glass font-bold">System Health</div>
                        <div className="text-glass-muted text-sm">CPU, memory, network</div>
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
