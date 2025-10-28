'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import OrderForm from '@/components/OrderForm'
import ExecutionTable from '@/components/ExecutionTable'
import OpenOrdersTable from '@/components/OpenOrdersTable'
import RiskDashboard from '@/components/RiskDashboard'
import { useExecutionStore } from '@/lib/store'

// Get API URL dynamically based on current page URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
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



export default function TradingPage() {
  const [mounted, setMounted] = useState(false)
  const [executions, setExecutions] = useState<any[]>([])
  const [openOrders, setOpenOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState<any>(null)
  const { addExecution } = useExecutionStore()
  
  // Throttle WebSocket updates to prevent rate limiting
  const lastUpdateTimeRef = useRef<number>(0)
  const THROTTLE_INTERVAL = 15000 // 15 seconds

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    fetchExecutions()
    fetchAccount()
    fetchOpenOrders()

    // Auto-refresh open orders every 15 seconds (reduced from 5s to avoid rate limiting)
    const ordersInterval = setInterval(() => {
      fetchOpenOrders()
    }, 15000)

    // Auto-refresh account every 30 seconds (avoid rate limits)
    const accountInterval = setInterval(() => {
      fetchAccount()
    }, 30000)

    // WebSocket connection - skip if on HTTPS with HTTP backend (mixed content blocked)
    let ws: any = null
    
    if (typeof window !== 'undefined') {
      const apiUrl = getApiUrl()
      const isSecure = window.location.protocol === 'https:'
      const isHttpBackend = apiUrl.startsWith('http://')
      
      if (isSecure && isHttpBackend) {
        console.log('Skipping WebSocket connection: HTTPS page with HTTP backend (mixed content blocked)')
        ws = null
      } else {
        try {
          // For WebSocket, use the base backend URL without /api path
          let wsBaseUrl = apiUrl
          // Remove /api suffix if present for WebSocket endpoint
          if (wsBaseUrl.endsWith('/api')) {
            wsBaseUrl = wsBaseUrl.slice(0, -4)
          }
          const wsUrl = wsBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'
          if (typeof WebSocket !== 'undefined') {
            ws = new WebSocket(wsUrl)
          }
        } catch (error) {
          console.log('WebSocket connection skipped:', error)
          ws = null
        }
      }
    }

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const now = Date.now()
          
          // Throttle position/PNL updates to once every 15 seconds
          const isThrottledUpdate = data.type === 'POSITION_UPDATE' || data.type === 'PNL_UPDATE'
          const shouldProcess = !isThrottledUpdate || (now - lastUpdateTimeRef.current) >= THROTTLE_INTERVAL
          
          if (isThrottledUpdate && !shouldProcess) {
            // Skip this update - too soon since last one
            return
          }
          
          if (isThrottledUpdate) {
            lastUpdateTimeRef.current = now
            console.log(`✓ Processing ${data.type} (throttled to 15s)`)
          }
          
          if (data.positions) {
            // Position updates are throttled above
          }
          
          // If orders update is received via WebSocket, handle it immediately (not throttled)
          if (data.orders && Array.isArray(data.orders)) {
            console.log('Orders update from WebSocket:', data.orders.length, 'orders')
            setOpenOrders(data.orders)
          }
          
          // If order status update is received, handle it immediately (critical update)
          if (data.order_update) {
            console.log('Order status update:', data.order_update.status)
            fetchOpenOrders()
          }
        } catch (err) {
          console.error('WebSocket message error:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setTimeout(() => {
          console.log('Attempting to reconnect...')
        }, 5000)
      }
    }

    return () => {
      clearInterval(ordersInterval)
      clearInterval(accountInterval)
      if (ws) {
        ws.close()
      }
    }
  }, [mounted])

  const fetchExecutions = async () => {
    try {
      const apiUrl = getApiUrl()
      const url = `${apiUrl}/executions`
      console.log('Fetching executions from:', url)
      const response = await axios.get(url)
      console.log('Executions response:', response.data)
      setExecutions(response.data || [])
    } catch (err) {
      console.error('Error fetching executions:', err)
    }
  }

  const fetchAccount = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/account`)
      if (response.data.account) {
        setAccount(response.data.account)
      }
    } catch (err) {
      console.error('Error fetching account:', err)
    }
  }

  const fetchOpenOrders = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/orders/open`)
      // Only update if we get a successful response with data
      if (response.data && response.status === 200) {
        // If we get an array, use it; otherwise keep current orders
        if (Array.isArray(response.data)) {
          setOpenOrders(response.data)
        }
      }
    } catch (err) {
      console.error('Error fetching open orders:', err)
      // Don't clear orders on error - keep showing the last known state
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      console.log('🗑️ Cancelling order:', orderId)
      
      const response = await axios.delete(`${apiUrl}/order/${orderId}`)
      console.log('✓ Cancel response:', response.data)
      
      // Check if cancellation was successful
      if (response.data && response.data.success) {
        console.log('✓ Order cancelled successfully')
        
        // Immediately remove from local state for instant UI feedback
        setOpenOrders(prevOrders => prevOrders.filter(order => 
          (order.id || order.order_id) !== orderId
        ))
        
        // Refresh from Alpaca to ensure we're in sync
        setTimeout(() => fetchOpenOrders(), 500)
        setTimeout(() => fetchOpenOrders(), 2000)
        
        alert('✓ Order cancelled successfully')
      } else {
        console.log('⚠️ Cancel response did not include success flag')
        // Still refresh to check actual state
        fetchOpenOrders()
      }
    } catch (err: any) {
      console.error('❌ Error cancelling order:', err)
      console.error('Error response:', err.response?.data)
      
      // Show error to user
      let errorMessage = 'Failed to cancel order. Please try again.'
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      alert(`❌ ${errorMessage}`)
      
      // Refresh to ensure we have the latest state
      fetchOpenOrders()
    } finally {
      setLoading(false)
    }
  }

  const handleOrderSubmit = async (orderData: any) => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      console.log('📤 Submitting order:', orderData)
      
      const response = await axios.post(`${apiUrl}/order`, orderData)
      console.log('📥 Order response:', response.data)
      
      if (response.data.success) {
        // If order has fill quantity, add to executions
        if (response.data.fill_qty > 0) {
          const newExecution = {
            order_id: response.data.order_id,
            client_order_id: response.data.client_order_id,
            symbol: response.data.symbol,
            side: response.data.side,
            fill_price: response.data.fill_price,
            fill_qty: response.data.fill_qty,
            timestamp: new Date()
          }
          addExecution(newExecution)
          setExecutions([newExecution, ...executions])
          console.log('✓ Order filled, added to executions')
        }

        // Force immediate refresh of open orders from Alpaca
        console.log('🔄 Refreshing open orders from Alpaca...')
        setTimeout(() => fetchOpenOrders(), 500) // Small delay to ensure Alpaca has processed
        setTimeout(() => fetchOpenOrders(), 2000) // Second refresh to catch any delays
        
        // Refresh executions
        setTimeout(() => fetchExecutions(), 1000)

        return {
          success: true,
          message: response.data.message || 'Order submitted successfully',
          data: response.data
        }
      } else {
        return {
          success: false,
          message: response.data.error || 'Order failed'
        }
      }
    } catch (err: any) {
      console.error('❌ Error submitting order:', err)
      console.error('Error response data:', err.response?.data)
      console.error('Error response status:', err.response?.status)
      
      let errorMessage = 'Failed to submit order'
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.data?.reason) {
        errorMessage = err.response.data.reason
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      return {
        success: false,
        message: errorMessage
      }
    } finally {
      setLoading(false)
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
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="space-y-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10"></div>
          <div className="relative z-10">
            <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text animate-gradient">
                Trading Terminal
              </span>
            </h1>
            <p className="text-xl text-white/80 font-light">
              Ultra-low latency execution • Real-time order flow • Professional-grade trading
            </p>
          </div>
        </div>

        {/* Account Balance Section */}
        {account && (
          <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <span className="text-4xl">💎</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white mb-1">
                    <span className="bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
                      Account Overview
                    </span>
                  </h2>
                  <p className="text-white/60 font-medium">Live trading account</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: '💰',
                    label: 'Cash Balance',
                    value: `$${Number(account.cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    gradient: 'from-cyan-400 to-blue-400',
                    glow: 'cyan'
                  },
                  {
                    icon: '📊',
                    label: 'Portfolio Value',
                    value: `$${Number(account.equity || account.portfolio_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    gradient: 'from-purple-400 to-pink-400',
                    glow: 'purple'
                  },
                  {
                    icon: '⚡',
                    label: 'Buying Power',
                    value: `$${Number(account.buying_power || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    gradient: 'from-green-400 to-emerald-400',
                    glow: 'green'
                  },
                  {
                    icon: '✨',
                    label: 'Status',
                    value: account.status || 'ACTIVE',
                    gradient: 'from-yellow-400 to-orange-400',
                    glow: 'yellow'
                  }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 hover:scale-105 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-3xl">{stat.icon}</div>
                        <div className={`w-2 h-2 rounded-full bg-${stat.glow}-400 animate-pulse`}></div>
                      </div>
                      
                      <p className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-2">
                        {stat.label}
                      </p>
                      
                      <p className={`text-3xl font-black bg-gradient-to-r ${stat.gradient} text-transparent bg-clip-text`}>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Account Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10">
                {[
                  { label: 'Daytrade Count', value: account.daytrade_count || 0 },
                  { label: 'Pattern Day Trader', value: account.pattern_day_trader ? 'Yes' : 'No' },
                  { label: 'Account Blocked', value: account.account_blocked ? 'Yes' : 'No' },
                  { label: 'Trading Blocked', value: account.trading_blocked ? 'Yes' : 'No' },
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-white/50 text-xs font-medium uppercase mb-1">{item.label}</p>
                    <p className="text-white text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risk Management Dashboard */}
        <RiskDashboard />

        {/* Trading Interface */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
            <OrderForm onSubmit={handleOrderSubmit} loading={loading} />
          </div>

          <div className="xl:col-span-2 space-y-8">
            <OpenOrdersTable orders={openOrders} onCancelOrder={handleCancelOrder} />
            <ExecutionTable executions={executions} />
          </div>
        </div>

        {/* Message Legend */}
        <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                    Order Response Messages
                  </span>
                </h2>
                <p className="text-white/60 text-sm font-medium">Understanding order status and error messages</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Success Messages */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                  <span className="text-xl">✅</span> Success Messages
                </h3>
                
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 font-semibold mb-1">✓ Order submitted successfully</p>
                  <p className="text-white/60 text-sm">Order accepted by Alpaca and sent to market</p>
                </div>
                
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 font-semibold mb-1">✓ Order filled</p>
                  <p className="text-white/60 text-sm">Order executed successfully at market price</p>
                </div>
                
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 font-semibold mb-1">✓ Order cancelled successfully</p>
                  <p className="text-white/60 text-sm">Open order has been cancelled</p>
                </div>
              </div>

              {/* Error Messages */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <span className="text-xl">❌</span> Common Errors
                </h3>
                
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-1">✗ Failed to submit order</p>
                  <p className="text-white/60 text-sm">General submission error. Check symbol validity, market hours, or network connection.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-1">✗ rate limit exceeded</p>
                  <p className="text-white/60 text-sm">Too many API requests too quickly. Wait 10-15 seconds before next action.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-1">✗ insufficient buying power</p>
                  <p className="text-white/60 text-sm">Not enough cash to complete this purchase. Reduce quantity or add funds.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-1">✗ insufficient shares to sell</p>
                  <p className="text-white/60 text-sm">You don't own enough shares to sell. Check your positions first.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 font-semibold mb-1">✓ potential wash trade detected</p>
                  <p className="text-white/60 text-sm">Selling shares you recently bought may trigger wash sale rules. Order blocked.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-1">✗ API error</p>
                  <p className="text-white/60 text-sm">Backend communication error. Check if services are running or wait and retry.</p>
                </div>
              </div>

              {/* Warning Messages */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Important Notes
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <p className="text-blue-400 font-semibold mb-1">📊 Market Hours</p>
                    <p className="text-white/60 text-sm">Orders outside market hours (9:30 AM - 4:00 PM CT) will be queued until market opens.</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <p className="text-purple-400 font-semibold mb-1">🎯 Limit Orders</p>
                    <p className="text-white/60 text-sm">Limit orders only execute if the market price reaches your specified price.</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <p className="text-orange-400 font-semibold mb-1">⚡ Market Orders</p>
                    <p className="text-white/60 text-sm">Market orders execute immediately at the current best available price.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
