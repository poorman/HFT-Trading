'use client'

interface OpenOrdersTableProps {
  orders: any[]
  onCancelOrder: (orderId: string) => void
}

export default function OpenOrdersTable({ orders, onCancelOrder }: OpenOrdersTableProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5"></div>
      
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-2xl">🕒</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-orange-400 to-red-400 text-transparent bg-clip-text">
                Open Orders
              </span>
            </h2>
            <p className="text-white/60 text-sm font-medium">Pending orders awaiting execution</p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="text-5xl opacity-50">📋</span>
            </div>
            <p className="text-white/60 text-lg font-semibold mb-2">No open orders</p>
            <p className="text-white/40 text-sm">All your orders are either filled or cancelled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id || order.order_id}
                className="group relative overflow-hidden rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 p-4 transition-all duration-300 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Symbol */}
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Symbol</p>
                      <p className="text-white font-bold text-lg">{order.symbol}</p>
                    </div>

                    {/* Side & Type */}
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Side & Type</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          order.side?.toLowerCase() === 'buy' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {order.side}
                        </span>
                        <span className="text-white/70 text-sm">{order.order_type || order.type}</span>
                      </div>
                    </div>

                    {/* Quantity & Price */}
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Qty @ Price</p>
                      <p className="text-white font-semibold">
                        {order.quantity || order.qty} @ {
                          (order.order_type?.toLowerCase() === 'market' || order.type?.toLowerCase() === 'market')
                            ? <span className="text-cyan-400 font-bold">MARKET</span>
                            : `$${Number(order.price || order.limit_price || 0).toFixed(2)}`
                        }
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'accepted' || order.status === 'pending_new'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : order.status === 'new'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Cancel Button */}
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onCancelOrder(order.id || order.order_id);
                      }}
                      className="group/btn relative overflow-hidden rounded-lg px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-red-400 font-semibold text-sm pointer-events-none">Cancel</span>
                      <svg className="w-4 h-4 text-red-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Submitted Time */}
                {(order.submitted_at || order.created_at) && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-white/40 text-xs">
                      Submitted: {new Date(order.submitted_at || order.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

