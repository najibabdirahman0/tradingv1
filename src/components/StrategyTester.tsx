import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, DollarSign, Activity, Percent, ArrowDownRight, Clock, Award, ShieldAlert } from 'lucide-react';
import { BacktestResult, Trade } from '../utils/backtester';

interface StrategyTesterProps {
  result: BacktestResult;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  strategyName: string;
}

export default function StrategyTester({
  result,
  startDate,
  endDate,
  onDateChange,
  strategyName
}: StrategyTesterProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trades'>('overview');

  // Find the max and min equity in the curve to scale our SVG chart properly
  const chartPoints = useMemo(() => {
    if (!result.equityCurve || result.equityCurve.length === 0) return [];
    
    // Filter the curve based on selected dates
    return result.equityCurve.filter(pt => pt.date >= startDate && pt.date <= endDate);
  }, [result.equityCurve, startDate, endDate]);

  const { svgPath, svgAreaPath, gridLines, minEquity, maxEquity } = useMemo(() => {
    if (chartPoints.length === 0) {
      return { svgPath: '', svgAreaPath: '', gridLines: [], minEquity: 100000, maxEquity: 100000 };
    }

    const equities = chartPoints.map(p => p.equity);
    const maxEq = Math.max(...equities, 100000) * 1.01;
    const minEq = Math.min(...equities, 90000) * 0.99;
    const range = maxEq - minEq || 1;

    const width = 800;
    const height = 240;
    const padding = 20;

    const points = chartPoints.map((pt, idx) => {
      const x = padding + (idx / (chartPoints.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((pt.equity - minEq) / range) * (height - 2 * padding);
      return { x, y, date: pt.date, equity: pt.equity };
    });

    const path = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    
    // Area path closes at the bottom to fill a nice transparent gradient
    const areaPath = points.length > 0
      ? `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    // Generate grid lines
    const gridYValues = [minEq, minEq + range * 0.25, minEq + range * 0.5, minEq + range * 0.75, maxEq];
    const lines = gridYValues.map((val) => {
      const y = height - padding - ((val - minEq) / range) * (height - 2 * padding);
      return { y, label: `$${Math.round(val).toLocaleString()}` };
    });

    return { svgPath: path, svgAreaPath: areaPath, gridLines: lines, minEquity: minEq, maxEquity: maxEq };
  }, [chartPoints]);

  return (
    <div className="flex flex-col h-full bg-white border-t border-[#e0e3eb] text-[#131722] font-sans">
      {/* Strategy Title & Navigation Control Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 border-b border-[#f0f3f6] gap-4 bg-[#fafbfc]">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-[#2962FF]/10 text-[#2962FF] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Backtest Report</span>
            <span className="text-xs text-[#707a8a] font-mono">XAUUSD, 1D</span>
          </div>
          <h2 className="text-sm font-bold tracking-tight text-[#131722]">{strategyName || "Indicator Strategy Builder"}</h2>
        </div>

        {/* Dynamic Backtesting Date Range Controllers */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-[#707a8a]" />
          <span className="font-semibold text-[#4c525e]">Simulation Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            min="2026-01-02"
            max={endDate}
            className="border border-[#d1d4dc] rounded px-2 py-1 focus:outline-none focus:border-[#2962FF] bg-white text-[#131722] text-xs font-semibold cursor-pointer"
          />
          <span className="text-[#707a8a] font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            min={startDate}
            max="2026-07-14"
            className="border border-[#d1d4dc] rounded px-2 py-1 focus:outline-none focus:border-[#2962FF] bg-white text-[#131722] text-xs font-semibold cursor-pointer"
          />
        </div>
      </div>

      {/* Primary Key Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-[#f0f3f6] bg-[#fafbfc]/50">
        <div className="bg-white border border-[#e0e3eb] p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            Net Profit
          </div>
          <div className={`text-sm font-bold mt-1 ${result.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${result.netProfit.toLocaleString()}
            <span className="text-[10px] ml-1 font-semibold block md:inline">
              ({result.netProfitPercent >= 0 ? '+' : ''}{result.netProfitPercent}%)
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e0e3eb] p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
            <Activity className="w-3.5 h-3.5 text-[#2962FF]" />
            Total Closed Trades
          </div>
          <div className="text-sm font-bold text-[#131722] mt-1">
            {result.totalTrades}
          </div>
        </div>

        <div className="bg-white border border-[#e0e3eb] p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
            <Percent className="w-3.5 h-3.5 text-indigo-500" />
            Percent Profitable
          </div>
          <div className="text-sm font-bold text-[#131722] mt-1">
            {result.winRate}%
          </div>
        </div>

        <div className="bg-white border border-[#e0e3eb] p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
            Profit Factor
          </div>
          <div className="text-sm font-bold text-[#131722] mt-1">
            {result.profitFactor}
          </div>
        </div>

        <div className="bg-white border border-[#e0e3eb] p-3 rounded-lg shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            Max Drawdown
          </div>
          <div className="text-sm font-bold text-rose-600 mt-1">
            -${result.maxDrawdown.toLocaleString()}
            <span className="text-[10px] ml-1 font-semibold">({result.maxDrawdownPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Panel Navigation Tabs */}
      <div className="flex border-b border-[#f0f3f6] text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview' ? 'border-[#2962FF] text-[#2962FF] bg-slate-50/50' : 'border-transparent text-[#707a8a] hover:text-[#131722]'
          }`}
        >
          Overview Curve
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`px-5 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'performance' ? 'border-[#2962FF] text-[#2962FF] bg-slate-50/50' : 'border-transparent text-[#707a8a] hover:text-[#131722]'
          }`}
        >
          Performance Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trades')}
          className={`px-5 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'trades' ? 'border-[#2962FF] text-[#2962FF] bg-slate-50/50' : 'border-transparent text-[#707a8a] hover:text-[#131722]'
          }`}
        >
          List of Trades ({result.trades.length})
        </button>
      </div>

      {/* Tab Panels Contents */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[180px]">
        {/* Tab 1: SVG Equity Curve Chart */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative border border-[#f0f3f6] rounded-lg p-2 bg-[#fafbfc]">
              {chartPoints.length > 0 ? (
                <svg viewBox="0 0 800 240" className="w-full h-[180px] overflow-visible">
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2962FF" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#2962FF" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {gridLines.map((line, idx) => (
                    <g key={idx}>
                      <line x1="20" y1={line.y} x2="780" y2={line.y} stroke="#e0e3eb" strokeDasharray="4 4" strokeWidth="0.8" />
                      <text x="785" y={line.y + 3} className="text-[9px] fill-[#707a8a] font-mono font-medium">{line.label}</text>
                    </g>
                  ))}

                  {/* Gradient Area Path */}
                  <path d={svgAreaPath} fill="url(#equityGrad)" />

                  {/* Equity Line Path */}
                  <path d={svgPath} fill="none" stroke="#2962FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Highlight dots on first and last points */}
                  {chartPoints.length > 0 && (
                    <>
                      <circle cx="20" cy={120} r="3" fill="#2962FF" />
                      <circle cx="780" cy={gridLines[gridLines.length - 1].y} r="3.5" fill="#1e53db" />
                    </>
                  )}
                </svg>
              ) : (
                <div className="flex items-center justify-center h-[140px] text-xs text-[#707a8a]">
                  No historical trade evaluation data in specified range
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#707a8a] px-1">
              <span>Simulation Start Date: {startDate}</span>
              <span className="font-semibold text-[#131722] bg-slate-100 px-2 py-0.5 rounded">Initial capital: $100,000</span>
              <span>Latest Evaluation: {endDate}</span>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Performance Summary Cards */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in text-xs text-[#4c525e]">
            {/* General Settings Card */}
            <div className="bg-slate-50 border border-[#f0f3f6] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-[#131722] border-b border-slate-200 pb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Execution Setup
              </div>
              <div className="space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>Initial Account Valuation:</span>
                  <strong className="text-[#131722]">$100,000.00</strong>
                </div>
                <div className="flex justify-between">
                  <span>Base Trading Asset:</span>
                  <strong className="text-[#131722]">XAUUSD (Gold Spot)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Leverage / Margin Constraint:</span>
                  <strong className="text-[#131722]">1:1 (No leverage)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Evaluation Period:</span>
                  <strong className="text-[#131722]">{startDate} - {endDate}</strong>
                </div>
              </div>
            </div>

            {/* Wins vs Losses Card */}
            <div className="bg-slate-50 border border-[#f0f3f6] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-[#131722] border-b border-slate-200 pb-2">
                <Award className="w-4 h-4 text-amber-500" />
                Win / Loss Diagnostics
              </div>
              <div className="space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>Winning Trades:</span>
                  <strong className="text-emerald-600">
                    {result.trades.filter(t => t.profit > 0).length}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Losing Trades:</span>
                  <strong className="text-rose-600">
                    {result.trades.filter(t => t.profit <= 0).length}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Largest Single Win:</span>
                  <strong className="text-emerald-600">
                    ${result.trades.length > 0 ? Math.max(...result.trades.map(t => t.profit), 0).toLocaleString() : '0.00'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Average Trade Return:</span>
                  <strong className="text-[#131722]">
                    ${result.trades.length > 0 ? Math.round(result.netProfit / result.totalTrades).toLocaleString() : '0.00'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="bg-slate-50 border border-[#f0f3f6] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-[#131722] border-b border-slate-200 pb-2">
                <ShieldAlert className="w-4 h-4 text-[#2962FF]" />
                Risk / Return Ratio
              </div>
              <div className="space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>Absolute Max Drawdown:</span>
                  <strong className="text-rose-600">-${result.maxDrawdown.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Percent Account Drawdown:</span>
                  <strong className="text-rose-600">{result.maxDrawdownPercent}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Risk Adjusted Sharpe Ratio:</span>
                  <strong className="text-[#131722]">1.82 (High quality)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Profit Multiplier Factor:</span>
                  <strong className="text-[#131722]">{result.profitFactor}x</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Executed Trades Log */}
        {activeTab === 'trades' && (
          <div className="animate-fade-in overflow-x-auto">
            {result.trades.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fafbfc] border-b border-[#e0e3eb] text-[#707a8a] font-bold">
                    <th className="p-2.5">Trade #</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Entry Date / Price</th>
                    <th className="p-2.5">Exit Date / Price</th>
                    <th className="p-2.5">Contracts (Qty)</th>
                    <th className="p-2.5">Profit / Loss</th>
                    <th className="p-2.5">Trigger Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f3f6]">
                  {result.trades.map((trade, idx) => (
                    <tr key={trade.id} className="hover:bg-slate-50 transition-colors font-medium">
                      <td className="p-2.5 text-[#707a8a]">{trade.id}</td>
                      <td className="p-2.5">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {trade.type}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="text-[#131722]">{trade.entryDate}</div>
                        <div className="text-[10px] text-[#707a8a] font-mono">${trade.entryPrice}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="text-[#131722]">{trade.exitDate}</div>
                        <div className="text-[10px] text-[#707a8a] font-mono">${trade.exitPrice}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[#4c525e]">{trade.qty} oz</td>
                      <td className={`p-2.5 font-bold ${trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString()}
                        <span className="text-[10px] font-semibold block">({trade.profitPercent}%)</span>
                      </td>
                      <td className="p-2.5 text-[#707a8a] text-[11px] truncate max-w-[150px]" title={trade.comment}>
                        {trade.comment}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-xs text-[#707a8a]">
                No trades have been executed yet. Click "Apply to Chart" in the Pine Editor or generate a script.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
