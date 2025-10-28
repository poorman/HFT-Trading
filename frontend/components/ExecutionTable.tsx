'use client'

interface Execution {
  id?: string
  order_id?: string
  symbol: string
  side: string
  quantity: number
  price: number
  status: string
  timestamp: string
}

export default function ExecutionTable({ executions }: { executions: Execution[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
                Recent Executions
              </span>
            </h2>
            <p className="text-white/60 text-sm font-medium">Order flow history</p>
          </div>
        </div>
        
        {executions.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-white text-xl font-bold mb-2">No executions yet</p>
            <p className="text-white/50 text-sm">Submit your first order to see results here</p>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      <div className="flex items-center space-x-2">
                        <span>🎯</span>
                        <span>Symbol</span>
                      </div>
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      <div className="flex items-center space-x-2">
                        <span>📈</span>
                        <span>Side</span>
                      </div>
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      Quantity
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      Price
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-bold text-white/80 uppercase tracking-wide">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {executions.slice(0, 10).map((execution, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center">
                            <span className="text-sm font-black text-white">{execution.symbol?.substring(0, 2) || 'XX'}</span>
                          </div>
                          <span className="text-white font-black text-lg group-hover:text-cyan-300 transition-colors">
                            {execution.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl font-black text-sm backdrop-blur-sm border transition-all ${
                          execution.side === 'BUY'
                            ? 'bg-green-500/20 border-green-400/30 text-green-300'
                            : 'bg-red-500/20 border-red-400/30 text-red-300'
                        }`}>
                          <span className="mr-2">{execution.side === 'BUY' ? '📈' : '📉'}</span>
                          {execution.side}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-white font-bold text-lg">
                          {execution.quantity?.toLocaleString()}
                        </span>
                        <span className="text-white/50 text-sm ml-2">shares</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-white font-black text-xl">
                          ${typeof execution.price === 'number' ? execution.price.toFixed(2) : '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl font-black text-sm backdrop-blur-sm border ${
                          execution.status === 'FILLED'
                            ? 'bg-green-500/20 border-green-400/30 text-green-300'
                            : execution.status === 'REJECTED'
                            ? 'bg-red-500/20 border-red-400/30 text-red-300'
                            : 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
                        }`}>
                          {execution.status === 'FILLED' && '✓ '}
                          {execution.status === 'REJECTED' && '✗ '}
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-white/80 text-sm font-semibold">
                            {execution.timestamp ? new Date(execution.timestamp).toLocaleTimeString() : 'N/A'}
                          </span>
                          <span className="text-white/40 text-xs">
                            {execution.timestamp ? new Date(execution.timestamp).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {executions.length > 10 && (
              <div className="border-t border-white/10 p-4 text-center">
                <p className="text-white/60 text-sm font-medium">
                  Showing 10 of {executions.length} executions
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
