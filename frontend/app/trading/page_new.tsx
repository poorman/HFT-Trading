'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import OrderForm from '@/components/OrderForm'
import ExecutionTable from '@/components/ExecutionTable'
import { useExecutionStore } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function TradingPage() {
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState<any>(null)
  const { addExecution } = useExecutionStore()

  useEffect(() => {
    fetchExecutions()
    fetchAccount()

    // Connect to WebSocket for real-time updates
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.positions) {
          console.log('Positions update:', data.positions)
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

    return () => {
      ws.close()
    }
  }, [])

  const fetchExecutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/executions`)
      setExecutions(response.data || [])
    } catch (err) {
      console.error('Error fetching executions:', err)
    }
  }

  const fetchAccount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/account`)
      if (response.data.account) {
        setAccount(response.data.account)
      }
    } catch (err) {
      console.error('Error fetching account:', err)
    }
  }

  const handleOrderSubmit = async (orderData: any) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/order`, orderData)
      
      if (response.data.success) {
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
        }

        return {
          success: true,
          message: response.data.message,
          data: response.data
        }
      } else {
        return {
          success: false,
          message: response.data.error || 'Order failed'
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'Order failed'
      }
    } finally {
      setLoading(false)
      fetchExecutions()
      fetchAccount()
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="glass-card p-8">
        <h1 className="text-4xl font-bold text-white mb-3 gradient-text">⚡ Trading Terminal</h1>
        <p className="text-white/70 text-lg">Ultra-low-latency order execution powered by C++</p>
      </div>

      {/* Account Balance Section */}
      {account && (
        <div className="glass-card p-8 pulse-glow">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">💰</span>
            Account Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="stat-card">
              <div className="text-white/60 text-sm uppercase tracking-wide mb-2">Account Balance</div>
              <div className="text-3xl font-bold text-white">
                ${Number(account.cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div className="text-white/60 text-sm uppercase tracking-wide mb-2">Portfolio Value</div>
              <div className="text-3xl font-bold text-white">
                ${Number(account.equity || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div className="text-white/60 text-sm uppercase tracking-wide mb-2">Buying Power</div>
              <div className="text-3xl font-bold text-green-300">
                ${Number(account.buying_power || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div className="text-white/60 text-sm uppercase tracking-wide mb-2">Status</div>
              <div className="text-2xl font-bold">
                <span className={`px-4 py-2 rounded-full ${
                  account.status === 'ACTIVE' ? 'bg-green-500/30 text-green-200' : 'bg-yellow-500/30 text-yellow-200'
                }`}>
                  {account.status || 'UNKNOWN'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Form and Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8">
          <OrderForm onSubmit={handleOrderSubmit} loading={loading} />
        </div>
        
        <div className="glass-card p-8">
          <ExecutionTable executions={executions} />
        </div>
      </div>
    </div>
  )
}

