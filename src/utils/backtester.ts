export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  smaFast?: number;
  smaSlow?: number;
  rsi?: number;
}

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  qty: number;
  profit: number;
  profitPercent: number;
  maxDrawdown: number;
  comment: string;
}

export interface BacktestResult {
  netProfit: number;
  netProfitPercent: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  trades: Trade[];
  equityCurve: { date: string; equity: number }[];
}

// Generate realistic daily gold (XAUUSD) historical price data
export function generateGoldData(): Bar[] {
  const bars: Bar[] = [];
  let currentPrice = 2280.50;
  const startDate = new Date('2026-01-02');

  for (let i = 0; i < 150; i++) {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Create realistic gold movements: a general bull trend with some corrections
    let changePercent = (Math.random() - 0.47) * 1.8; // biased slightly upwards
    
    // Create some specific historical trends
    if (i > 30 && i < 55) changePercent -= 0.3; // correction phase
    if (i >= 80 && i < 110) changePercent += 0.4; // strong breakout phase
    if (i >= 130) changePercent -= 0.15; // minor pullback

    const open = currentPrice;
    const close = Number((currentPrice * (1 + changePercent / 100)).toFixed(2));
    
    const dailyVolatility = 0.5 + Math.random() * 1.5; // daily high/low volatility
    const high = Number((Math.max(open, close) * (1 + dailyVolatility / 100)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - dailyVolatility / 100)).toFixed(2));
    const volume = Math.floor(80000 + Math.random() * 150000);

    bars.push({
      date: dateStr,
      open,
      high,
      low,
      close,
      volume
    });

    currentPrice = close;
    // Advance day (skip weekends for trading simplicity)
    startDate.setDate(startDate.getDate() + (startDate.getDay() === 5 ? 3 : 1));
  }

  return bars;
}

// Technical Indicator calculations
export function calculateSMA(data: Bar[], period: number): number[] {
  const smas: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      smas.push(data[i].close); // fallback
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      smas.push(Number((sum / period).toFixed(2)));
    }
  }
  return smas;
}

export function calculateEMA(data: Bar[], period: number): number[] {
  const emas: number[] = [];
  const k = 2 / (period + 1);
  let prevEma = data[0].close;
  emas.push(prevEma);

  for (let i = 1; i < data.length; i++) {
    const currentEma = data[i].close * k + prevEma * (1 - k);
    emas.push(Number(currentEma.toFixed(2)));
    prevEma = currentEma;
  }
  return emas;
}

export function calculateRSI(data: Bar[], period: number = 14): number[] {
  const rsis: number[] = [];
  if (data.length === 0) return rsis;

  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const difference = data[i].close - data[i - 1].close;
    gains.push(difference > 0 ? difference : 0);
    losses.push(difference < 0 ? -difference : 0);
  }

  // First RSI
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < period; i++) {
    rsis.push(50); // padding for initial values
  }

  const rsiVal = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  rsis.push(Number(rsiVal.toFixed(2)));

  for (let i = period + 1; i < data.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsis.push(Number(rsi.toFixed(2)));
  }

  return rsis;
}

// Run simulated trading strategy
export function runBacktest(
  data: Bar[],
  strategyType: 'MA_CROSSOVER' | 'RSI_OS_OB' | 'CUSTOM',
  params: Record<string, any>,
  customSignals?: any[]
): BacktestResult {
  const bars = [...data];
  
  // Calculate indicator helper states
  const fastPeriod = Number(params.fast_period || 9);
  const slowPeriod = Number(params.slow_period || 21);
  const rsiPeriod = Number(params.rsi_period || 14);
  const rsiOverbought = Number(params.overbought || 70);
  const rsiOversold = Number(params.oversold || 30);

  const smaFast = calculateSMA(bars, fastPeriod);
  const smaSlow = calculateSMA(bars, slowPeriod);
  const rsi = calculateRSI(bars, rsiPeriod);

  for (let i = 0; i < bars.length; i++) {
    bars[i].smaFast = smaFast[i];
    bars[i].smaSlow = smaSlow[i];
    bars[i].rsi = rsi[i];
  }

  const trades: Trade[] = [];
  let position: { entryDate: string; entryPrice: number; qty: number; type: 'BUY' | 'SELL' } | null = null;
  let initialBalance = 100000;
  let balance = initialBalance;
  let equity = initialBalance;
  const equityCurve: { date: string; equity: number }[] = [{ date: bars[0].date, equity: initialBalance }];

  // 1. If strategy is CUSTOM and we have pre-packaged AI signals, we load and adapt them
  if (strategyType === 'CUSTOM' && customSignals && customSignals.length > 0) {
    let currentBalance = initialBalance;
    const adaptedTrades: Trade[] = [];
    const curve: { date: string; equity: number }[] = [];
    
    // Distribute equity updates over historical dates
    let runningEquity = initialBalance;
    
    // Sort custom signals by date
    const sortedSignals = [...customSignals].sort((a, b) => a.date.localeCompare(b.date));

    // Map signals to trading records
    for (let i = 0; i < sortedSignals.length; i++) {
      const sig = sortedSignals[i];
      const tradeId = `T-${i + 1}`;
      
      // Calculate modified profits slightly influenced by user parameter changes (for fun optimization interactivity!)
      // e.g. multipling signal profit by a factor representing "parameter alignment"
      const lengthFactor = params.rsi_period ? (Number(params.rsi_period) / 14) : 1;
      const profitMultiplier = 0.8 + (Math.sin(lengthFactor * Math.PI) * 0.4); // maximum profit at certain periods
      
      const modifiedProfit = Number((sig.profit * profitMultiplier).toFixed(2));
      runningEquity += modifiedProfit;
      
      adaptedTrades.push({
        id: tradeId,
        type: sig.type === 'BUY' ? 'BUY' : 'SELL',
        entryDate: sig.date,
        entryPrice: sig.price,
        exitDate: sig.date, // simple intraday/next day close representation
        exitPrice: Number((sig.price + (modifiedProfit / sig.qty)).toFixed(2)),
        qty: sig.qty || 10,
        profit: modifiedProfit,
        profitPercent: Number(((modifiedProfit / (sig.price * (sig.qty || 10))) * 100).toFixed(2)),
        maxDrawdown: Number((sig.price * 0.015).toFixed(2)),
        comment: sig.comment || "AI Triggered execution"
      });

      curve.push({ date: sig.date, equity: runningEquity });
    }

    // Sort or fill missing days for equity curve
    const finalCurve = bars.map(bar => {
      const matchingTrade = curve.find(c => c.date === bar.date);
      if (matchingTrade) {
        runningEquity = matchingTrade.equity;
      }
      return { date: bar.date, equity: runningEquity };
    });

    const netProfit = runningEquity - initialBalance;
    const wins = adaptedTrades.filter(t => t.profit > 0);
    const losses = adaptedTrades.filter(t => t.profit <= 0);
    const winRate = adaptedTrades.length > 0 ? (wins.length / adaptedTrades.length) * 100 : 0;
    
    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : Number((grossProfit / grossLoss).toFixed(2));

    return {
      netProfit: Number(netProfit.toFixed(2)),
      netProfitPercent: Number(((netProfit / initialBalance) * 100).toFixed(2)),
      totalTrades: adaptedTrades.length,
      winRate: Number(winRate.toFixed(2)),
      profitFactor,
      maxDrawdown: Number((initialBalance * 0.05).toFixed(2)),
      maxDrawdownPercent: 5.0,
      trades: adaptedTrades,
      equityCurve: finalCurve
    };
  }

  // 2. Running local indicator-based strategy simulations
  for (let i = 2; i < bars.length; i++) {
    const currentBar = bars[i];
    const prevBar = bars[i - 1];
    
    let buySignal = false;
    let sellSignal = false;
    let exitSignal = false;

    if (strategyType === 'MA_CROSSOVER') {
      // Golden Cross: Fast MA crosses ABOVE Slow MA
      buySignal = (prevBar.smaFast! <= prevBar.smaSlow!) && (currentBar.smaFast! > currentBar.smaSlow!);
      // Death Cross: Fast MA crosses BELOW Slow MA
      sellSignal = (prevBar.smaFast! >= prevBar.smaSlow!) && (currentBar.smaFast! < currentBar.smaSlow!);
      exitSignal = sellSignal;
    } else if (strategyType === 'RSI_OS_OB') {
      // Oversold Crossover: RSI crosses ABOVE oversold threshold (from below)
      buySignal = (prevBar.rsi! <= rsiOversold) && (currentBar.rsi! > rsiOversold);
      // Overbought Crossover: RSI crosses BELOW overbought threshold (from above)
      sellSignal = (prevBar.rsi! >= rsiOverbought) && (currentBar.rsi! < rsiOverbought);
      exitSignal = sellSignal;
    }

    // Trade execution engine
    if (position === null) {
      if (buySignal) {
        position = {
          entryDate: currentBar.date,
          entryPrice: currentBar.close,
          qty: Math.floor((balance * 0.1) / currentBar.close) || 5, // 10% risk allocation
          type: 'BUY'
        };
      }
    } else {
      // We are in a buy position
      if (exitSignal || i === bars.length - 1) {
        // Exit trade
        const tradeProfit = (currentBar.close - position.entryPrice) * position.qty;
        balance += tradeProfit;
        
        trades.push({
          id: `T-${trades.length + 1}`,
          type: 'BUY',
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          exitDate: currentBar.date,
          exitPrice: currentBar.close,
          qty: position.qty,
          profit: Number(tradeProfit.toFixed(2)),
          profitPercent: Number(((tradeProfit / (position.entryPrice * position.qty)) * 100).toFixed(2)),
          maxDrawdown: Number((position.entryPrice * 0.012).toFixed(2)), // simulated average intraday drawdown
          comment: strategyType === 'MA_CROSSOVER' ? 'MA Bullish crossover' : 'RSI oversold turnback'
        });
        
        position = null;
      }
    }

    equity = balance + (position ? (currentBar.close - position.entryPrice) * position.qty : 0);
    equityCurve.push({ date: currentBar.date, equity: Number(equity.toFixed(2)) });
  }

  // Metrics calculations
  const totalNetProfit = equity - initialBalance;
  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  
  const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = grossLoss === 0 ? grossProfit : Number((grossProfit / grossLoss).toFixed(2));

  // Dynamic Drawdown calculation on equity curve
  let peak = initialBalance;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq.equity > peak) {
      peak = eq.equity;
    }
    const dd = peak - eq.equity;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }
  const maxDDPercent = Number(((maxDD / peak) * 100).toFixed(2));

  return {
    netProfit: Number(totalNetProfit.toFixed(2)),
    netProfitPercent: Number(((totalNetProfit / initialBalance) * 100).toFixed(2)),
    totalTrades: trades.length,
    winRate: Number(winRate.toFixed(2)),
    profitFactor,
    maxDrawdown: Number(maxDD.toFixed(2)),
    maxDrawdownPercent: maxDDPercent,
    trades,
    equityCurve
  };
}
