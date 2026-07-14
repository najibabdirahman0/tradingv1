import { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
}

export default function TradingViewWidget({ symbol = 'OANDA:XAUUSD', interval = 'D' }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear container
    containerRef.current.innerHTML = '';

    // Create the script element to load the TradingView external advanced chart widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // This is the exact widget configuration provided by the user
    script.innerHTML = JSON.stringify({
      "allow_symbol_change": true,
      "calendar": false,
      "details": false,
      "hide_side_toolbar": false,
      "hide_top_toolbar": false,
      "hide_legend": false,
      "hide_volume": true,
      "hotlist": false,
      "interval": interval,
      "locale": "en",
      "save_image": true,
      "style": "1",
      "symbol": symbol,
      "theme": "light",
      "timezone": "Etc/UTC",
      "backgroundColor": "#ffffff",
      "gridColor": "rgba(46, 46, 46, 0)",
      "watchlist": [
        "OANDA:XAUUSD",
        "OANDA:EURUSD",
        "OANDA:GBPUSD",
        "OANDA:AUDUSD",
        "OANDA:GBPJPY",
        "BITSTAMP:BTCUSD",
        "CME_MINI:ES1!"
      ],
      "withdateranges": true,
      "compareSymbols": [],
      "studies": [],
      "autosize": true
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      id="tradingview-chart-container"
      style={{ height: '100%', width: '100%', backgroundColor: '#ffffff' }}
    />
  );
}
