'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function OrderForm({ onSubmit, loading }: { onSubmit?: any; loading?: boolean }) {
  const [symbol, setSymbol] = useState('AAPL')
  const [quantity, setQuantity] = useState(100)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (onSubmit) {
      setSubmitting(true)
      setMessage('')
      
      // Generate unique client order ID
      const clientOrderId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const orderData: any = {
        symbol,
        quantity,
        side,
        order_type: orderType,
        client_order_id: clientOrderId,
      }

      if (orderType === 'LIMIT') {
        const limitPrice = parseFloat(price) || 0;
        if (limitPrice <= 0) {
          setMessage('✗ Limit price must be greater than 0');
          setSubmitting(false);
          setTimeout(() => setMessage(''), 5000);
          return;
        }
        orderData.limit_price = limitPrice;
        orderData.price = limitPrice;
      } else {
        // For MARKET orders, set price to 0 - backend will use market price
        orderData.price = 0;
      }

      console.log('Submitting order data:', JSON.stringify(orderData, null, 2));
      const result = await onSubmit(orderData)
      
      if (result.success) {
        setMessage(`✓ ${result.message}`)
        setQuantity(100)
        setPrice('')
      } else {
        setMessage(`✗ ${result.message}`)
      }
      
      setSubmitting(false)
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
                Submit Order
              </span>
            </h2>
            <p className="text-white/60 text-sm font-medium">Fast execution</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Symbol Input */}
          <div>
            <label className="text-white/80 text-sm font-bold mb-2 block uppercase tracking-wide">
              Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full backdrop-blur-xl bg-white/10 border border-white/30 text-white placeholder-white/50 rounded-xl px-5 py-4 text-xl font-black focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                placeholder="AAPL"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm font-bold">
                🎯
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="text-white/80 text-sm font-bold mb-2 block uppercase tracking-wide">
              Quantity
            </label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full backdrop-blur-xl bg-white/10 border border-white/30 text-white placeholder-white/50 rounded-xl px-5 py-4 text-xl font-black focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                min="1"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm font-bold">
                shares
              </div>
            </div>
          </div>

          {/* Side Selection */}
          <div>
            <label className="text-white/80 text-sm font-bold mb-3 block uppercase tracking-wide">
              Side
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-xl border px-6 py-5 transition-all duration-300 ${
                  side === 'BUY'
                    ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-green-400/50 scale-105 shadow-xl'
                    : 'bg-white/5 border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {side === 'BUY' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 opacity-10"></div>
                )}
                <div className="relative z-10 flex flex-col items-center space-y-2">
                  <span className="text-2xl">📈</span>
                  <span className="text-white font-black text-lg">BUY</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-xl border px-6 py-5 transition-all duration-300 ${
                  side === 'SELL'
                    ? 'bg-gradient-to-br from-red-500/30 to-rose-500/30 border-red-400/50 scale-105 shadow-xl'
                    : 'bg-white/5 border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {side === 'SELL' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-400 opacity-10"></div>
                )}
                <div className="relative z-10 flex flex-col items-center space-y-2">
                  <span className="text-2xl">📉</span>
                  <span className="text-white font-black text-lg">SELL</span>
                </div>
              </button>
            </div>
          </div>

          {/* Order Type Selection */}
          <div>
            <label className="text-white/80 text-sm font-bold mb-3 block uppercase tracking-wide">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-xl border px-6 py-4 transition-all duration-300 ${
                  orderType === 'MARKET'
                    ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-cyan-400/50 scale-105 shadow-xl'
                    : 'bg-white/5 border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {orderType === 'MARKET' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-400 opacity-10"></div>
                )}
                <div className="relative z-10 text-center">
                  <span className="text-white font-black">MARKET</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-xl border px-6 py-4 transition-all duration-300 ${
                  orderType === 'LIMIT'
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400/50 scale-105 shadow-xl'
                    : 'bg-white/5 border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {orderType === 'LIMIT' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 opacity-10"></div>
                )}
                <div className="relative z-10 text-center">
                  <span className="text-white font-black">LIMIT</span>
                </div>
              </button>
            </div>
          </div>

          {/* Limit Price Input */}
          {orderType === 'LIMIT' && (
            <div className="animate-fade-in">
              <label className="text-white/80 text-sm font-bold mb-2 block uppercase tracking-wide">
                Limit Price
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 text-xl font-bold">
                  $
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full backdrop-blur-xl bg-white/10 border border-white/30 text-white placeholder-white/50 rounded-xl pl-9 pr-5 py-4 text-xl font-black focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || loading}
            className={`group relative overflow-hidden w-full rounded-2xl border-2 px-8 py-5 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed ${
              side === 'BUY'
                ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400/50 hover:shadow-2xl'
                : 'bg-gradient-to-r from-red-500/30 to-rose-500/30 border-red-400/50 hover:shadow-2xl'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${
              side === 'BUY' ? 'from-green-400 to-emerald-400' : 'from-red-400 to-rose-400'
            } opacity-0 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className="relative z-10 flex items-center justify-center space-x-3">
              {submitting || loading ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white font-black text-xl">Executing...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">{side === 'BUY' ? '🚀' : '💫'}</span>
                  <span className="text-white font-black text-xl">
                    {side} {quantity} {symbol}
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Message Display */}
          {message && (
            <div className={`relative overflow-hidden rounded-xl backdrop-blur-xl border p-4 animate-fade-in ${
              message.startsWith('✓')
                ? 'bg-green-500/20 border-green-400/50'
                : 'bg-red-500/20 border-red-400/50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {message.startsWith('✓') ? '✅' : '❌'}
                </div>
                <p className="text-white font-semibold flex-1">{message}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
