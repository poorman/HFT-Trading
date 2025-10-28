'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

interface DailyPnL {
  date: string
  realized_pnl: number
  unrealized_pnl: number
  total_pnl: number
  circuit_breaker_triggered: boolean
  updated_at: string
}

interface RiskAlert {
  id: number
  alert_type: string
  severity: string
  symbol: string
  message: string
  metadata: string
  created_at: string
}

interface CircuitBreakerEvent {
  id: number
  trigger_type: string
  trigger_value: number
  threshold: number
  active: boolean
  created_at: string
}

// Get API URL dynamically
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    
    if (host === 'hft.widesurf.com') {
      return 'https://hftapi.widesurf.com/api'
    }
    
    if (host.includes('178.128.15.57')) {
      return 'http://178.128.15.57:8082/api'
    }
  }
  return '/api'
}

export default function RiskDashboard() {
  const [dailyPnL, setDailyPnL] = useState<DailyPnL>({
    date: new Date().toISOString().split('T')[0],
    realized_pnl: 0,
    unrealized_pnl: 0,
    total_pnl: 0,
    circuit_breaker_triggered: false,
    updated_at: new Date().toISOString()
  })
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerEvent | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [positions, setPositions] = useState<any[]>([])

  useEffect(() => {
    // Fetch initial data
    fetchPositionsAndCalculatePnL()
    fetchRiskAlerts()
    fetchCircuitBreaker()
    
    // Auto-refresh every 60 seconds (matches backend cache duration to avoid rate limiting)
    const interval = setInterval(() => {
      fetchPositionsAndCalculatePnL()
      fetchRiskAlerts()
      fetchCircuitBreaker()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchPositionsAndCalculatePnL = async () => {
    try {
      const apiUrl = getApiUrl()
      console.log('📊 Fetching positions to calculate P&L from:', `${apiUrl}/positions`)
      
      const response = await axios.get(`${apiUrl}/positions`)
      console.log('📥 Positions response:', response.data)
      
      let positionsData: any[] = []
      
      // Handle different response formats
      if (response.data.positions) {
        if (typeof response.data.positions === 'object' && response.data.positions.message) {
          // Rate limited or error - don't return, just log and continue with empty positions
          console.warn('⚠️ Positions request issue:', response.data.positions.message)
          positionsData = []
        } else {
          positionsData = Array.isArray(response.data.positions) ? response.data.positions : []
        }
      } else if (Array.isArray(response.data)) {
        positionsData = response.data
      }
      
      setPositions(positionsData)
      
      // Calculate unrealized P&L from positions
      const unrealizedPnL = positionsData.reduce((sum, p) => {
        const qty = parseFloat(p.qty || 0)
        const avgPrice = parseFloat(p.avg_entry_price || 0)
        const currentPrice = parseFloat(p.current_price || 0)
        return sum + ((currentPrice - avgPrice) * qty)
      }, 0)
      
      // Set calculated P&L
      setDailyPnL({
        date: new Date().toISOString().split('T')[0],
        realized_pnl: 0, // Would need executions data for this
        unrealized_pnl: unrealizedPnL,
        total_pnl: unrealizedPnL,
        circuit_breaker_triggered: false,
        updated_at: new Date().toISOString()
      })
      
      setIsConnected(true)
      console.log('✓ Calculated unrealized P&L:', unrealizedPnL.toFixed(2))
    } catch (err: any) {
      console.error('❌ Error fetching positions:', err)
      console.error('Error response:', err.response?.data)
      setIsConnected(false)
    }
  }

  const fetchRiskAlerts = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/risk/alerts?limit=10`)
      
      if (response.data && Array.isArray(response.data)) {
        setAlerts(response.data)
      } else if (response.data?.alerts && Array.isArray(response.data.alerts)) {
        setAlerts(response.data.alerts)
      }
    } catch (err: any) {
      // Risk alerts endpoint might not exist yet - ignore 404 errors
      if (err.response?.status !== 404) {
        console.error('Error fetching risk alerts:', err.message)
      }
    }
  }

  const fetchCircuitBreaker = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/risk/circuit-breaker`)
      
      if (response.data) {
        setCircuitBreaker(response.data.active ? response.data : null)
      }
    } catch (err: any) {
      // Circuit breaker endpoint might not exist yet - ignore 404 errors
      if (err.response?.status !== 404) {
        console.error('Error fetching circuit breaker:', err.message)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Risk Management Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          ></div>
          <span className="text-white/80 text-sm">
            {isConnected ? 'LIVE' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Circuit Breaker Warning */}
      {(circuitBreaker?.active || dailyPnL.circuit_breaker_triggered) && (
        <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-red-600 border-2 border-red-400 p-6 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div className="text-6xl">🚨</div>
              <div>
                <h3 className="text-3xl font-black text-white mb-2">
                  CIRCUIT BREAKER ACTIVE
                </h3>
                <p className="text-white/90 text-lg">
                  Trading is halted due to daily loss limit breach
                </p>
                {circuitBreaker && (
                  <p className="text-white/70 text-sm mt-2">
                    Triggered: {new Date(circuitBreaker.created_at).toLocaleString()} |
                    Value: ${parseFloat(circuitBreaker.trigger_value || 0).toFixed(2)} |
                    Threshold: ${parseFloat(circuitBreaker.threshold || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily P&L Monitor */}
      <div
        className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border-2 p-6 ${
          dailyPnL.total_pnl >= 0
            ? 'bg-green-500/20 border-green-400'
            : 'bg-red-500/20 border-red-400'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Daily P&L</h3>
            <span className="text-white/60 text-sm">
              {new Date(dailyPnL.updated_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Realized</p>
              <p
                className={`text-2xl font-black ${
                  dailyPnL.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                ${dailyPnL.realized_pnl.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm mb-1">Unrealized</p>
              <p
                className={`text-2xl font-black ${
                  dailyPnL.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                ${dailyPnL.unrealized_pnl.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm mb-1">Total</p>
              <p
                className={`text-3xl font-black ${
                  dailyPnL.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                ${dailyPnL.total_pnl.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-4">Recent Alerts</h3>

          {alerts.length === 0 ? (
            <p className="text-white/60 text-center py-8">No alerts yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alerts.map((alert, idx) => (
                <div
                  key={alert.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-500/20 border-red-400'
                      : alert.severity === 'WARNING'
                      ? 'bg-yellow-500/20 border-yellow-400'
                      : 'bg-blue-500/20 border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-2xl">
                          {alert.severity === 'CRITICAL'
                            ? '🔴'
                            : alert.severity === 'WARNING'
                            ? '⚠️'
                            : 'ℹ️'}
                        </span>
                        <p className="font-bold text-white">{alert.alert_type}</p>
                        {alert.symbol && (
                          <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">
                            {alert.symbol}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 ml-8">{alert.message}</p>
                    </div>
                    <span className="text-xs text-white/50 ml-4">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

