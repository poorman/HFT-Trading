'use client';

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, TrendingUp, DollarSign, Settings, AlertTriangle, RefreshCw } from 'lucide-react';

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
  return ''
}

const API_URL = getApiUrl();

interface StrategyStatus {
  running: boolean;
  enabled: boolean;
  selected_api: string;
  api_failures: number;
  active_positions: number;
  purchased_today: number;
  config: {
    buy_threshold: number;
    sell_threshold: number;
    investment_amount: number;
    check_interval: number;
    max_positions: number;
  };
  market_hours: boolean;
  before_cutoff: boolean;
  near_close: boolean;
  current_time: string;
}

interface Position {
  symbol: string;
  purchase_price: number;
  quantity: number;
  purchase_time: number;
  order_id: string;
  is_active: boolean;
}

interface Performance {
  total_positions: number;
  purchased_today: number;
  api_failures: number;
  selected_api: string;
}

// Memoized Status Card Component
const StatusCard = memo(function StatusCard() {
  const [status, setStatus] = useState<StrategyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/strategy/movers/status`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(data.data);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="text-white/60">Loading status...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="glass-card border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/80">Status</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{status.running ? 'Running' : 'Stopped'}</div>
          <p className="text-xs text-white/60 mt-1">API: {status.selected_api}</p>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/80">Active Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{status.active_positions}</div>
          <p className="text-xs text-white/60 mt-1">{status.purchased_today} purchased today</p>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/80">Market Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Badge variant={status.market_hours ? "default" : "secondary"} className="glass-badge">
              ● {status.market_hours ? 'Market Open' : 'Market Closed'}
            </Badge>
            <div className="flex gap-2 text-xs">
              <Badge variant={status.before_cutoff ? "default" : "secondary"} className="glass-badge-success">
                {status.before_cutoff ? '✓' : '✗'} Before 9 AM CT
              </Badge>
              <Badge variant={!status.near_close ? "default" : "secondary"} className="glass-badge-success">
                {!status.near_close ? '✓' : '✗'} Safe time
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/80">Configuration</CardTitle>
            <Settings className="h-4 w-4 text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          {status && status.config && (
            <div className="space-y-1 text-xs text-white/80">
              <div className="flex justify-between">
                <span>Buy:</span>
                <span className="font-bold text-emerald-400">{status.config.buy_threshold}%</span>
              </div>
              <div className="flex justify-between">
                <span>Sell:</span>
                <span className="font-bold text-blue-400">{status.config.sell_threshold}%</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold text-yellow-400">${status.config.investment_amount}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// Memoized Positions Component
const PositionsCard = memo(function PositionsCard() {
  const [positions, setPositions] = useState<Position[]>([]);

  const fetchPositions = async () => {
    try {
      const response = await fetch(`${API_URL}/strategy/movers/positions`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setPositions(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-card border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Active Positions</CardTitle>
            <CardDescription className="text-white/60">Real-time position monitoring</CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled={positions.length === 0} className="glass-button">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Force Close All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/60">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No active positions</p>
            <p className="text-sm">Positions will appear here when the strategy executes trades</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position, idx) => (
              <div key={idx} className="glass p-4 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white">{position.symbol}</h4>
                    <p className="text-sm text-white/60">
                      {position.quantity} shares @ ${position.purchase_price.toFixed(2)}
                    </p>
                  </div>
                  <Badge className="glass-badge-success">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Memoized Performance Component
const PerformanceCard = memo(function PerformanceCard() {
  const [performance, setPerformance] = useState<Performance | null>(null);

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`${API_URL}/strategy/movers/performance`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPerformance(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch performance:', err);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!performance) return <div className="text-white/60">Loading performance...</div>;

  return (
    <Card className="glass-card border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{performance.total_positions}</div>
            <div className="text-sm text-white/60">Total Positions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{performance.purchased_today}</div>
            <div className="text-sm text-white/60">Purchased Today</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{performance.api_failures}</div>
            <div className="text-sm text-white/60">API Failures</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Main Component (only re-renders on toggle/refresh actions)
export default function MoversStrategyPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial enabled state
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/strategy/movers/status`, {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setEnabled(data.data.enabled);
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial status:', err);
      }
    };
    fetchStatus();
  }, []);

  const handleToggleStrategy = async () => {
    if (enabled === null) return;
    
    setActionLoading(true);
    try {
      const endpoint = enabled ? 'disable' : 'enable';
      const response = await fetch(`${API_URL}/strategy/movers/${endpoint}`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setEnabled(!enabled);
        setError(null);
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to toggle strategy');
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Only re-renders on toggle */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold liquid-text liquid-glow mb-3">
                Daily Movers Strategy
              </h1>
              <p className="text-glass-muted text-lg">
                Automated momentum trading control panel
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                className="glass-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <button
                onClick={handleToggleStrategy}
                disabled={actionLoading || enabled === null}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 border-2 ${
                  enabled
                    ? 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30'
                    : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
                } ${actionLoading || enabled === null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Label */}
                <span className="text-white/90 font-medium text-sm">Strategy</span>
                
                {/* Toggle Switch */}
                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  enabled ? 'bg-emerald-500' : 'bg-slate-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    enabled ? 'transform translate-x-6' : ''
                  }`} />
                </div>
                
                {/* Status Text */}
                <span className={`font-bold text-sm min-w-[60px] ${
                  enabled ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <Alert className="glass-card border-red-500/50 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Independent updating sections */}
        <div className="space-y-6">
          <StatusCard />
          <PositionsCard />
          <PerformanceCard />
          
          {/* Static Information Section */}
          <Card className="glass-card border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Strategy Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Buy Conditions
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">●</span>
                      <span>Stock gained <strong className="text-white">5%+</strong> since market open</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">●</span>
                      <span>Before <strong className="text-white">9:00 AM CT</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">●</span>
                      <span><strong className="text-white">$1,000</strong> per position</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">●</span>
                      <span>One position per symbol per day</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Sell Conditions
                  </h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">●</span>
                      <span>Profit reaches <strong className="text-white">4.5%</strong> from purchase price</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">●</span>
                      <span><strong className="text-white">OR:</strong> <strong className="text-white">3:50 PM CT</strong> (10 min before close)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">●</span>
                      <span>Checks every <strong className="text-white">10 seconds</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">●</span>
                      <span>Automatic stop-loss protection</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
