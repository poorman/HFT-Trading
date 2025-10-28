'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Mover {
  symbol: string
  price: number
  change: number
  percent_change: number
  volume?: number
}

interface PerformanceMetrics {
  api_provider: string
  iterations: number
  total_time_ms: number
  avg_time_ms: number
  min_time_ms: number
  max_time_ms: number
  p50_time_ms: number
  p95_time_ms: number
  p99_time_ms: number
  success_count: number
  error_count: number
  success_rate: number
  data_size_bytes: number
  throughput_mbps: number
}

export default function DailyMoversPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'movers' | 'alpaca' | 'polygon'>('movers')
  const [gainers, setGainers] = useState<Mover[]>([])
  const [losers, setLosers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  
  const [alpacaMetrics, setAlpacaMetrics] = useState<PerformanceMetrics | null>(null)
  const [polygonMetrics, setPolygonMetrics] = useState<PerformanceMetrics | null>(null)
  const [testingAlpaca, setTestingAlpaca] = useState(false)
  const [testingPolygon, setTestingPolygon] = useState(false)
  const [iterations, setIterations] = useState(10)

  useEffect(() => {
    setMounted(true)
    setLastUpdate(new Date().toLocaleTimeString())
  }, [])

  useEffect(() => {
    if (activeTab === 'movers' && mounted) {
      fetchMovers()
      const interval = setInterval(fetchMovers, 30000) // Reduced from 60s to 30s for faster updates
      return () => clearInterval(interval)
    }
  }, [activeTab, mounted])

  const fetchMovers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/movers`, {
        timeout: 10000 // 10 second timeout
      })
      if (response.data.movers) {
        const movers = response.data.movers
        setGainers(movers.gainers || [])
        setLosers(movers.losers || [])
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error('Error fetching market movers:', err)
      // Set empty arrays on error to show no data state
      setGainers([])
      setLosers([])
    } finally {
      setLoading(false)
    }
  }

  const testAlpacaPerformance = async () => {
    setTestingAlpaca(true)
    try {
      const response = await axios.get(`${API_URL}/api/performance/alpaca?iterations=${iterations}`)
      setAlpacaMetrics(response.data)
    } catch (err) {
      console.error('Error testing Alpaca performance:', err)
    } finally {
      setTestingAlpaca(false)
    }
  }

  const testPolygonPerformance = async () => {
    setTestingPolygon(true)
    try {
      const response = await axios.get(`${API_URL}/api/performance/polygon?iterations=${iterations}`)
      setPolygonMetrics(response.data)
    } catch (err) {
      console.error('Error testing Polygon performance:', err)
    } finally {
      setTestingPolygon(false)
    }
  }

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8 relative">
        {/* Hero Header with Glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text animate-gradient">
                    Daily Market Movers
                  </span>
                </h1>
                <p className="text-xl text-white/80 font-light">Live market data • Real-time updates • API performance analytics</p>
              </div>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative bg-white/20 backdrop-blur-lg rounded-full px-6 py-3 border border-white/30">
                    <span className="text-white font-bold text-lg">🔴 LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-2 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl">
            <button
              onClick={() => setActiveTab('movers')}
              className={`relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'movers'
                  ? 'bg-white/30 text-white shadow-2xl scale-105'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {activeTab === 'movers' && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur-xl"></div>
              )}
              <span className="relative flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <span>Market Movers</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('alpaca')}
              className={`relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'alpaca'
                  ? 'bg-white/30 text-white shadow-2xl scale-105'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {activeTab === 'alpaca' && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-xl blur-xl"></div>
              )}
              <span className="relative flex items-center space-x-2">
                <span className="text-2xl">🚀</span>
                <span>Alpaca</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('polygon')}
              className={`relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'polygon'
                  ? 'bg-white/30 text-white shadow-2xl scale-105'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {activeTab === 'polygon' && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl"></div>
              )}
              <span className="relative flex items-center space-x-2">
                <span className="text-2xl">⚡</span>
                <span>Polygon</span>
              </span>
            </button>
          </div>
        </div>

        {/* Market Movers Tab */}
        {activeTab === 'movers' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-bold text-white">Live Trading Activity</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchMovers}
                  disabled={loading}
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 px-6 py-3 hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative text-white font-bold flex items-center space-x-2">
                    <span>{loading ? '⏳' : '🔄'}</span>
                    <span>{loading ? 'Loading...' : 'Refresh'}</span>
                  </span>
                </button>
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
                  <span className="text-white/80 text-sm font-medium">Updated: {lastUpdate}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-96 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl">
                <div className="relative">
                  <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-cyan-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-24 w-24 border-2 border-purple-400 opacity-20"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Top Gainers */}
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                      <div className="relative w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                    </div>
                    <h3 className="text-3xl font-bold text-white">Top Gainers</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-green-500/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {gainers.slice(0, 8).map((mover, index) => (
                      <div
                        key={`gainer-${index}`}
                        className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 hover:scale-105 hover:border-green-400/50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="text-3xl font-black text-white mb-1">{mover.symbol}</h4>
                              <p className="text-sm text-white/50 font-medium">Stock</p>
                            </div>
                            <div className="bg-green-500/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-green-400/30">
                              <span className="text-2xl">📈</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm font-medium">Current Price</span>
                              <span className="text-2xl font-bold text-white">${mover.price?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm font-medium">Change</span>
                              <span className="text-xl font-bold text-green-300">
                                +${mover.change?.toFixed(2) || '0.00'}
                              </span>
                            </div>

                            <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-green-500/10 border border-green-400/30 p-4">
                              <div className="flex justify-between items-center">
                                <span className="text-white/80 text-sm font-semibold">% Change</span>
                                <span className="text-3xl font-black text-green-300">
                                  +{mover.percent_change?.toFixed(2) || '0.00'}%
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-white/60 text-sm font-medium">Volume</span>
                              <span className="text-white/90 font-bold">{mover.volume && typeof mover.volume === 'number' ? mover.volume.toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Losers */}
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                      <div className="relative w-6 h-6 bg-gradient-to-r from-red-400 to-rose-500 rounded-full"></div>
                    </div>
                    <h3 className="text-3xl font-bold text-white">Top Losers</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {losers.slice(0, 8).map((mover, index) => (
                      <div
                        key={`loser-${index}`}
                        className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 hover:scale-105 hover:border-red-400/50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="text-3xl font-black text-white mb-1">{mover.symbol}</h4>
                              <p className="text-sm text-white/50 font-medium">Stock</p>
                            </div>
                            <div className="bg-red-500/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-red-400/30">
                              <span className="text-2xl">📉</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm font-medium">Current Price</span>
                              <span className="text-2xl font-bold text-white">${mover.price?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm font-medium">Change</span>
                              <span className="text-xl font-bold text-red-300">
                                ${mover.change?.toFixed(2) || '0.00'}
                              </span>
                            </div>

                            <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-red-500/10 border border-red-400/30 p-4">
                              <div className="flex justify-between items-center">
                                <span className="text-white/80 text-sm font-semibold">% Change</span>
                                <span className="text-3xl font-black text-red-300">
                                  {mover.percent_change?.toFixed(2) || '0.00'}%
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-white/60 text-sm font-medium">Volume</span>
                              <span className="text-white/90 font-bold">{mover.volume && typeof mover.volume === 'number' ? mover.volume.toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alpaca Performance Tab */}
        {activeTab === 'alpaca' && (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-cyan-500/5"></div>
              <div className="relative z-10">
                <h2 className="text-4xl font-black text-white mb-6">
                  <span className="bg-gradient-to-r from-green-400 to-cyan-400 text-transparent bg-clip-text">
                    🚀 Alpaca API Performance
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <label className="text-white/80 text-sm font-bold mb-3 block">Test Iterations (1-100)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={iterations}
                      onChange={(e) => setIterations(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                      className="w-full backdrop-blur-xl bg-white/10 border border-white/30 text-white placeholder-white/50 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    />
                    <p className="text-white/50 text-sm mt-3 font-medium">
                      Measures Alpaca API response times using C++ high-resolution timers
                    </p>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={testAlpacaPerformance}
                      disabled={testingAlpaca}
                      className="w-full group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-r from-green-500/30 to-cyan-500/30 border border-white/30 px-8 py-5 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-cyan-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <span className="relative text-white font-black text-xl flex items-center justify-center space-x-2">
                        <span>{testingAlpaca ? '⏳' : '🎯'}</span>
                        <span>{testingAlpaca ? 'Testing...' : 'Run Test'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {testingAlpaca && (
              <div className="flex flex-col items-center justify-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-20">
                <div className="relative mb-8">
                  <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-green-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-32 w-32 border-2 border-cyan-400 opacity-20"></div>
                </div>
                <p className="text-white text-2xl font-bold">Running {iterations} iterations...</p>
                <p className="text-white/60 mt-2">This may take a few moments</p>
              </div>
            )}

            {alpacaMetrics && !testingAlpaca && (
              <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-10">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-cyan-500/5"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-white mb-8">
                    <span className="bg-gradient-to-r from-green-400 to-cyan-400 text-transparent bg-clip-text">
                      📊 Alpaca Results
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {[
                      { label: 'Iterations', value: alpacaMetrics.iterations, color: 'from-blue-400 to-cyan-400' },
                      { label: 'Success Rate', value: `${alpacaMetrics.success_rate.toFixed(1)}%`, color: alpacaMetrics.success_rate >= 95 ? 'from-green-400 to-emerald-400' : 'from-red-400 to-rose-400' },
                      { label: 'Avg Response', value: `${alpacaMetrics.avg_time_ms.toFixed(2)}ms`, color: 'from-purple-400 to-pink-400' },
                      { label: 'Throughput', value: `${alpacaMetrics.throughput_mbps.toFixed(4)} MB/s`, color: 'from-cyan-400 to-blue-400' },
                    ].map((metric, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 hover:scale-105 transition-all">
                        <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-10`}></div>
                        <div className="relative z-10">
                          <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-2">{metric.label}</p>
                          <p className="text-4xl font-black text-white">{metric.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Min', value: `${alpacaMetrics.min_time_ms.toFixed(2)}ms`, color: 'text-green-300' },
                      { label: 'P50', value: `${alpacaMetrics.p50_time_ms.toFixed(2)}ms`, color: 'text-white' },
                      { label: 'P95', value: `${alpacaMetrics.p95_time_ms.toFixed(2)}ms`, color: 'text-yellow-300' },
                      { label: 'P99', value: `${alpacaMetrics.p99_time_ms.toFixed(2)}ms`, color: 'text-orange-300' },
                      { label: 'Max', value: `${alpacaMetrics.max_time_ms.toFixed(2)}ms`, color: 'text-red-300' },
                      { label: 'Data Size', value: `${(alpacaMetrics.data_size_bytes / 1024).toFixed(1)} KB`, color: 'text-cyan-300' },
                    ].map((metric, idx) => (
                      <div key={idx} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <p className="text-white/60 text-sm font-semibold mb-2">{metric.label}</p>
                        <p className={`text-2xl font-black ${metric.color}`}>{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Polygon Performance Tab */}
        {activeTab === 'polygon' && (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
              <div className="relative z-10">
                <h2 className="text-4xl font-black text-white mb-6">
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                    ⚡ Polygon API Performance
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <label className="text-white/80 text-sm font-bold mb-3 block">Test Iterations (1-100)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={iterations}
                      onChange={(e) => setIterations(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                      className="w-full backdrop-blur-xl bg-white/10 border border-white/30 text-white placeholder-white/50 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    />
                    <p className="text-white/50 text-sm mt-3 font-medium">
                      Measures Polygon API response times using C++ high-resolution timers
                    </p>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={testPolygonPerformance}
                      disabled={testingPolygon}
                      className="w-full group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-white/30 px-8 py-5 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <span className="relative text-white font-black text-xl flex items-center justify-center space-x-2">
                        <span>{testingPolygon ? '⏳' : '🎯'}</span>
                        <span>{testingPolygon ? 'Testing...' : 'Run Test'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {testingPolygon && (
              <div className="flex flex-col items-center justify-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-20">
                <div className="relative mb-8">
                  <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-32 w-32 border-2 border-pink-400 opacity-20"></div>
                </div>
                <p className="text-white text-2xl font-bold">Running {iterations} iterations...</p>
                <p className="text-white/60 mt-2">This may take a few moments</p>
              </div>
            )}

            {polygonMetrics && !testingPolygon && (
              <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-10">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-white mb-8">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                      📊 Polygon Results
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {[
                      { label: 'Iterations', value: polygonMetrics.iterations, color: 'from-blue-400 to-cyan-400' },
                      { label: 'Success Rate', value: `${polygonMetrics.success_rate.toFixed(1)}%`, color: polygonMetrics.success_rate >= 95 ? 'from-green-400 to-emerald-400' : 'from-red-400 to-rose-400' },
                      { label: 'Avg Response', value: `${polygonMetrics.avg_time_ms.toFixed(2)}ms`, color: 'from-purple-400 to-pink-400' },
                      { label: 'Throughput', value: `${polygonMetrics.throughput_mbps.toFixed(4)} MB/s`, color: 'from-cyan-400 to-blue-400' },
                    ].map((metric, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 hover:scale-105 transition-all">
                        <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-10`}></div>
                        <div className="relative z-10">
                          <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-2">{metric.label}</p>
                          <p className="text-4xl font-black text-white">{metric.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Min', value: `${polygonMetrics.min_time_ms.toFixed(2)}ms`, color: 'text-green-300' },
                      { label: 'P50', value: `${polygonMetrics.p50_time_ms.toFixed(2)}ms`, color: 'text-white' },
                      { label: 'P95', value: `${polygonMetrics.p95_time_ms.toFixed(2)}ms`, color: 'text-yellow-300' },
                      { label: 'P99', value: `${polygonMetrics.p99_time_ms.toFixed(2)}ms`, color: 'text-orange-300' },
                      { label: 'Max', value: `${polygonMetrics.max_time_ms.toFixed(2)}ms`, color: 'text-red-300' },
                      { label: 'Data Size', value: `${(polygonMetrics.data_size_bytes / 1024).toFixed(1)} KB`, color: 'text-cyan-300' },
                    ].map((metric, idx) => (
                      <div key={idx} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <p className="text-white/60 text-sm font-semibold mb-2">{metric.label}</p>
                        <p className={`text-2xl font-black ${metric.color}`}>{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparison Section */}
        {alpacaMetrics && polygonMetrics && (
          <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-white mb-8">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                  ⚔️ Performance Comparison
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                {[
                  {
                    title: 'Winner: Speed',
                    winner: alpacaMetrics.avg_time_ms < polygonMetrics.avg_time_ms ? 'Alpaca' : 'Polygon',
                    value: `${Math.min(alpacaMetrics.avg_time_ms, polygonMetrics.avg_time_ms).toFixed(2)}ms avg`,
                    icon: alpacaMetrics.avg_time_ms < polygonMetrics.avg_time_ms ? '🚀' : '⚡',
                    gradient: 'from-green-500 to-cyan-500'
                  },
                  {
                    title: 'Winner: Throughput',
                    winner: alpacaMetrics.throughput_mbps > polygonMetrics.throughput_mbps ? 'Alpaca' : 'Polygon',
                    value: `${Math.max(alpacaMetrics.throughput_mbps, polygonMetrics.throughput_mbps).toFixed(4)} MB/s`,
                    icon: alpacaMetrics.throughput_mbps > polygonMetrics.throughput_mbps ? '🚀' : '⚡',
                    gradient: 'from-blue-500 to-purple-500'
                  },
                  {
                    title: 'Winner: Reliability',
                    winner: alpacaMetrics.success_rate >= polygonMetrics.success_rate ? 'Alpaca' : 'Polygon',
                    value: `${Math.max(alpacaMetrics.success_rate, polygonMetrics.success_rate).toFixed(1)}% success`,
                    icon: alpacaMetrics.success_rate >= polygonMetrics.success_rate ? '🚀' : '⚡',
                    gradient: 'from-purple-500 to-pink-500'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-8 text-center hover:scale-105 transition-all">
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                    <div className="relative z-10">
                      <p className="text-white/60 text-sm font-bold mb-4">{item.title}</p>
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <p className="text-3xl font-black text-white mb-2">{item.winner}</p>
                      <p className="text-white/50 text-sm font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-8 py-5 text-sm font-bold text-white uppercase tracking-wide">Metric</th>
                      <th className="text-center px-8 py-5 text-sm font-bold text-white uppercase tracking-wide">Alpaca</th>
                      <th className="text-center px-8 py-5 text-sm font-bold text-white uppercase tracking-wide">Polygon</th>
                      <th className="text-center px-8 py-5 text-sm font-bold text-white uppercase tracking-wide">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Avg Response Time', alpaca: `${alpacaMetrics.avg_time_ms.toFixed(2)}ms`, polygon: `${polygonMetrics.avg_time_ms.toFixed(2)}ms`, diff: `${Math.abs(alpacaMetrics.avg_time_ms - polygonMetrics.avg_time_ms).toFixed(2)}ms`, color: 'text-cyan-300' },
                      { label: 'P95 Latency', alpaca: `${alpacaMetrics.p95_time_ms.toFixed(2)}ms`, polygon: `${polygonMetrics.p95_time_ms.toFixed(2)}ms`, diff: `${Math.abs(alpacaMetrics.p95_time_ms - polygonMetrics.p95_time_ms).toFixed(2)}ms`, color: 'text-purple-300' },
                      { label: 'Data Transfer', alpaca: `${(alpacaMetrics.data_size_bytes / 1024).toFixed(1)} KB`, polygon: `${(polygonMetrics.data_size_bytes / 1024).toFixed(1)} KB`, diff: `${Math.abs((alpacaMetrics.data_size_bytes - polygonMetrics.data_size_bytes) / 1024).toFixed(1)} KB`, color: 'text-pink-300' },
                      { label: 'Throughput', alpaca: `${alpacaMetrics.throughput_mbps.toFixed(4)} MB/s`, polygon: `${polygonMetrics.throughput_mbps.toFixed(4)} MB/s`, diff: `${Math.abs(alpacaMetrics.throughput_mbps - polygonMetrics.throughput_mbps).toFixed(4)} MB/s`, color: 'text-green-300' },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-8 py-5 text-white font-semibold">{row.label}</td>
                        <td className="px-8 py-5 text-center text-white/90 font-bold">{row.alpaca}</td>
                        <td className="px-8 py-5 text-center text-white/90 font-bold">{row.polygon}</td>
                        <td className={`px-8 py-5 text-center font-black text-xl ${row.color}`}>{row.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
