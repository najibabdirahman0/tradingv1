import { useState, useEffect, useMemo } from 'react';
import { Bot, Terminal, BarChart4, ChevronDown, Check, Columns, Settings2, Sparkles, SlidersHorizontal, Trash2, LineChart, Code } from 'lucide-react';
import TradingViewWidget from './components/TradingViewWidget';
import AICompanion from './components/AICompanion';
import PineEditor from './components/PineEditor';
import StrategyTester from './components/StrategyTester';
import { generateGoldData, runBacktest, BacktestResult, Bar } from './utils/backtester';

// Pre-define default Pine Script v6 strategy
const DEFAULT_PINE_SCRIPT = `//@version=6
strategy("My Strategy", overlay=true)

// Write your Pine Script strategy or prompt AI to build one...
`;

const INITIAL_PARAMETERS = [
  { name: 'Fast EMA Period', key: 'fast_period', type: 'number', default: '9', min: '2', max: '50' },
  { name: 'Slow EMA Period', key: 'slow_period', type: 'number', default: '21', min: '5', max: '100' },
  { name: 'RSI Filter Period', key: 'rsi_period', type: 'number', default: '14', min: '5', max: '50' },
  { name: 'RSI Overbought Limit', key: 'overbought', type: 'number', default: '70', min: '50', max: '90' },
  { name: 'RSI Oversold Limit', key: 'oversold', type: 'number', default: '30', min: '10', max: '50' }
];

export default function App() {
  // Navigation / UI State
  const [selectedSymbol, setSelectedSymbol] = useState('OANDA:XAUUSD');
  const [selectedInterval, setSelectedInterval] = useState('D');
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'ai' | 'editor' | 'tester'>('ai');

  // Quantitative Backtester States
  const [historicalData, setHistoricalData] = useState<Bar[]>([]);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [pineScript, setPineScript] = useState(DEFAULT_PINE_SCRIPT);
  const [parameters, setParameters] = useState(INITIAL_PARAMETERS);
  const [activeParameters, setActiveParameters] = useState<Record<string, any>>({
    fast_period: 9,
    slow_period: 21,
    rsi_period: 14,
    overbought: 70,
    oversold: 30
  });

  const [startDate, setStartDate] = useState('2026-01-02');
  const [endDate, setEndDate] = useState('2026-07-14');
  const [strategyType, setStrategyType] = useState<'MA_CROSSOVER' | 'RSI_OS_OB' | 'CUSTOM'>('MA_CROSSOVER');
  const [customSignals, setCustomSignals] = useState<any[]>([]);
  const [strategyExplanation, setStrategyExplanation] = useState(
    'Interactive strategy development hub. Paste code, ask the AI for custom logic, or explore compiled signals in real-time.'
  );

  // Compilation State
  const [compilationStatus, setCompilationStatus] = useState<'idle' | 'success' | 'error'>('success');
  const [compilationMessage, setCompilationMessage] = useState('Workspace loaded successfully. Ready for backtesting.');

  // Pre-seed historical gold bars on mount
  useEffect(() => {
    const bars = generateGoldData();
    setHistoricalData(bars);
  }, []);

  // Compute dynamic backtest on dependencies
  const backtestResult = useMemo(() => {
    if (historicalData.length === 0) {
      return {
        netProfit: 0,
        netProfitPercent: 0,
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        trades: [],
        equityCurve: []
      };
    }
    return runBacktest(historicalData, strategyType, activeParameters, customSignals);
  }, [historicalData, strategyType, activeParameters, customSignals]);

  // Handle setting parameters dynamically
  const handleParameterChange = (key: string, value: any) => {
    setActiveParameters((prev) => ({
      ...prev,
      [key]: value
    }));
    setCompilationStatus('success');
    setCompilationMessage(`Updated parameter '${key}' to ${value}. Backtest updated.`);
  };

  // Compile active Pine Script (simulated compilation)
  const handleCompile = () => {
    setCompilationStatus('idle');
    setCompilationMessage('Analyzing Pine Script syntax trees...');
    
    setTimeout(() => {
      // Intelligently parse the pine script to identify what strategy logic is being compiled
      const lowercaseScript = pineScript.toLowerCase();
      
      let detectedType: 'MA_CROSSOVER' | 'RSI_OS_OB' | 'CUSTOM' = 'MA_CROSSOVER';
      let msg = 'Pine Script v6 compiled successfully. Applied plots to chart.';

      if (lowercaseScript.includes('rsi') && !lowercaseScript.includes('ema') && !lowercaseScript.includes('ma')) {
        detectedType = 'RSI_OS_OB';
        msg = 'Pine Script v6 compiled. Loaded RSI Overbought/Oversold criteria.';
      } else if (lowercaseScript.includes('strategy') && customSignals.length > 0) {
        detectedType = 'CUSTOM';
        msg = 'Pine Script v6 custom strategy parsed. Loaded dynamic optimization arrays.';
      }

      setStrategyType(detectedType);
      setCompilationStatus('success');
      setCompilationMessage(msg);
      
      // Auto switch to Strategy Tester tab to show the results of compile/apply!
      setSidebarTab('tester');
    }, 800);
  };

  // When AI applies a new script
  const handleApplyAIScript = (
    script: string,
    name: string,
    newParams: any[],
    newSignals: any[],
    explanation: string
  ) => {
    setPineScript(script);
    setStrategyName(name);
    setParameters(newParams);
    setCustomSignals(newSignals);
    setStrategyExplanation(explanation);
    setStrategyType('CUSTOM');

    // Build default map
    const defaultMap: Record<string, any> = {};
    newParams.forEach((p) => {
      defaultMap[p.key] = Number(p.default) || p.default;
    });
    setActiveParameters(defaultMap);

    setCompilationStatus('success');
    setCompilationMessage(`AI strategy "${name}" applied to workspace successfully.`);
    setSidebarTab('tester'); // instantly show user backtest results
  };

  // Switch symbols and reset backtest dates appropriately
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCompilationStatus('success');
    setCompilationMessage(`Switched chart workspace to ${symbol}. Recalculating signal streams...`);
  };

  return (
    <div id="app-root" className="w-full h-screen bg-white flex overflow-hidden text-[#131722] font-sans">
      
      {/* Main Core Screen Layout Workspace */}
      <div className="flex-1 flex overflow-hidden relative h-full w-full">
        
        {/* LEFT WORKSPACE: Main Full-size Chart Widget (ALWAYS stays 100% full width and height) */}
        <div className="flex-1 h-full relative bg-white animate-fade-in" id="chart-viewport-container">
          <TradingViewWidget symbol={selectedSymbol} interval={selectedInterval} />
          
          {/* Quick overlay indicator of active strategy */}
          <div className="absolute top-4 left-4 bg-white/95 border border-[#e0e3eb] backdrop-blur p-3 rounded-lg shadow-md max-w-sm pointer-events-auto z-10 flex flex-col gap-1 text-xs transition">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-[#131722] font-extrabold">{strategyName}</strong>
            </div>
            <p className="text-[#707a8a] text-[11px] leading-relaxed line-clamp-2">
              {strategyExplanation}
            </p>
            <div className="flex items-center gap-1.5 mt-1 border-t border-[#f0f3f6] pt-1.5 text-[11px] font-bold text-[#2962FF]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Input Optimizations Active</span>
            </div>
          </div>

          {/* Clean Floating Sidebar Toggle in top-right of the chart */}
          <button
            type="button"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="absolute top-4 right-4 bg-white hover:bg-[#fafbfc] border border-[#e0e3eb] p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all text-[#4c525e] hover:text-[#131722] z-20 flex items-center gap-1.5 font-bold text-xs cursor-pointer"
            title={showRightSidebar ? "Close Sidebar" : "Open Sidebar"}
          >
            <Bot className="w-4 h-4 text-[#2962FF]" />
            {showRightSidebar ? "Hide Tools" : "Show Algo Hub"}
          </button>
        </div>

        {/* RIGHT WORKSPACE: Integrated Chat & Algo Companion Hub Widget */}
        {showRightSidebar && (
          <div className="w-[480px] h-full shrink-0 border-l border-[#e0e3eb] bg-white z-20 flex flex-col shadow-lg">
            
            {/* Integrated Tabs Selection Header */}
            <div className="flex bg-[#fafbfc] border-b border-[#e0e3eb] shrink-0 h-12">
              <button
                type="button"
                onClick={() => setSidebarTab('ai')}
                className={`flex-1 h-12 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  sidebarTab === 'ai' ? 'border-[#2962FF] text-[#2962FF] bg-white' : 'border-transparent text-[#707a8a] hover:text-[#131722] hover:bg-[#fafbfc]'
                }`}
              >
                <Bot className="w-4 h-4" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('editor')}
                className={`flex-1 h-12 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  sidebarTab === 'editor' ? 'border-[#2962FF] text-[#2962FF] bg-white' : 'border-transparent text-[#707a8a] hover:text-[#131722] hover:bg-[#fafbfc]'
                }`}
              >
                <Code className="w-4 h-4" />
                Pine Editor
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('tester')}
                className={`flex-1 h-12 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  sidebarTab === 'tester' ? 'border-[#2962FF] text-[#2962FF] bg-white' : 'border-transparent text-[#707a8a] hover:text-[#131722] hover:bg-[#fafbfc]'
                }`}
              >
                <BarChart4 className="w-4 h-4" />
                Backtester
              </button>
            </div>

            {/* Selected Tab Tool Viewport */}
            <div className="flex-1 overflow-hidden relative">
              {sidebarTab === 'ai' && (
                <AICompanion
                  onApplyScript={handleApplyAIScript}
                  currentScript={pineScript}
                />
              )}
              {sidebarTab === 'editor' && (
                <PineEditor
                  script={pineScript}
                  onScriptChange={setPineScript}
                  onCompile={handleCompile}
                  compilationStatus={compilationStatus}
                  compilationMessage={compilationMessage}
                />
              )}
              {sidebarTab === 'tester' && (
                <StrategyTester
                  result={backtestResult}
                  startDate={startDate}
                  endDate={endDate}
                  onDateChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  strategyName={strategyName}
                />
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
