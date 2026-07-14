import React, { useState, useRef, DragEvent } from 'react';
import { Bot, Upload, Video, Play, CheckCircle, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface Parameter {
  name: string;
  key: string;
  type: string;
  default: string;
  min?: string;
  max?: string;
}

interface SimulatedSignal {
  date: string;
  type: string;
  price: number;
  qty: number;
  profit: number;
  comment: string;
}

interface GeminiResponse {
  name: string;
  pinescript: string;
  explanation: string;
  parameters: Parameter[];
  simulatedSignals: SimulatedSignal[];
}

interface AICompanionProps {
  onApplyScript: (script: string, strategyName: string, params: Parameter[], signals: SimulatedSignal[], explanation: string) => void;
  currentScript: string;
}

export default function AICompanion({ onApplyScript, currentScript }: AICompanionProps) {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File upload state
  const [file, setFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results state
  const [aiResult, setAiResult] = useState<GeminiResponse | null>(null);

  // Predefined prompts
  const quickPrompts = [
    { label: 'Gold EMA Crossover', text: 'Create an EMA 9 & 21 Crossover strategy for XAUUSD with strict 2% risk stop-loss.' },
    { label: 'RSI Pullback System', text: 'Generate an RSI oversold pullback indicator that enters long when RSI crosses above 30 on gold.' },
    { label: 'Bollinger Band Reversal', text: 'Write a mean reversion strategy entering long at the lower Bollinger Band and closing at the basis line.' }
  ];

  // Drag and drop handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFile({
        name: selectedFile.name,
        base64: base64String,
        mimeType: selectedFile.type
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !file && !videoUrl) {
      setError("Please write a prompt, upload a document, or paste a video URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/generate-pinescript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || `Generate a Pine Script strategy representing the uploaded logic.`,
          fileData: file?.base64 || null,
          fileName: file?.name || null,
          fileMimeType: file?.mimeType || null,
          videoUrl: videoUrl || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to communicate with AI Assistant.");
      }

      const data: GeminiResponse = await response.json();
      setAiResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!aiResult) return;
    onApplyScript(
      aiResult.pinescript,
      aiResult.name,
      aiResult.parameters,
      aiResult.simulatedSignals,
      aiResult.explanation
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#fafbfc] border-l border-[#e0e3eb] text-[#131722] overflow-y-auto">
      {/* Title Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[#e0e3eb] bg-white">
        <Bot className="w-5 h-5 text-[#2962FF]" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">AI Strategy Companion</h2>
          <p className="text-[11px] text-[#707a8a]">Pine Script v6 Algorithm Generator</p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 p-4 space-y-4">
        {/* Upload Doc Section */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#4c525e]">Strategy Document / Chart Image</label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
              dragActive ? 'border-[#2962FF] bg-[#2962FF]/5' : 'border-[#d1d4dc] hover:border-[#b2b5be] hover:bg-white bg-white/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.png,.jpg,.jpeg,.doc,.docx"
            />
            {file ? (
              <div className="flex items-center gap-2 text-xs text-[#2962FF]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-xs text-red-500 hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-6 h-6 text-[#707a8a] mx-auto mb-1" />
                <p className="text-xs text-[#4c525e] font-medium">Drag & Drop strategy files</p>
                <p className="text-[10px] text-[#707a8a]">PDF, images, charts, or text rules</p>
              </div>
            )}
          </div>
        </div>

        {/* Video Link Analysis */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#4c525e]">Strategy Video Tutorial Link</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Paste YouTube or custom video URL..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs p-2 pl-8 border border-[#d1d4dc] rounded-lg focus:outline-none focus:border-[#2962FF] bg-white text-[#131722]"
            />
            <Video className="w-4 h-4 text-[#707a8a] absolute left-2.5 top-2.5" />
          </div>
          <p className="text-[9px] text-[#707a8a]">AI uses search grounding to parse the strategy from online video sources.</p>
        </div>

        {/* AI prompt box */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#4c525e]">Prompt / Strategy Specifications</label>
          <textarea
            placeholder="Describe your strategy: 'Double EMA crossover on gold with profit targets and trailing stop...'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full text-xs p-3 border border-[#d1d4dc] rounded-lg focus:outline-none focus:border-[#2962FF] bg-white text-[#131722]"
          />
        </div>

        {/* Quick presets */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#707a8a]">Quick Presets</span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(p.text)}
                className="text-[11px] px-2 py-1 bg-white border border-[#e0e3eb] hover:border-[#2962FF] hover:bg-[#2962FF]/5 rounded-md transition-all text-[#4c525e] cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2 bg-[#2962FF] hover:bg-[#1e53db] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing & Drafting Code...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Generate Pine Script v6</span>
            </>
          )}
        </button>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated output section */}
        {aiResult && (
          <div className="border border-[#e0e3eb] rounded-lg bg-white overflow-hidden shadow-sm animate-fade-in">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-[#2962FF]/10 to-[#2962FF]/5 border-b border-[#e0e3eb] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-[#2962FF] font-bold uppercase tracking-wider">Ready Strategy</span>
                <h3 className="text-xs font-bold text-[#131722] truncate max-w-[200px]">{aiResult.name}</h3>
              </div>
              <button
                type="button"
                onClick={handleApply}
                className="px-2.5 py-1 bg-[#2962FF] text-white hover:bg-[#1e53db] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Layers className="w-3 h-3" />
                Apply to Tester
              </button>
            </div>

            {/* Markdown / Overview content */}
            <div className="p-3 space-y-2 text-xs text-[#4c525e] max-h-[220px] overflow-y-auto">
              <div className="border-b border-[#f0f3f6] pb-2">
                <span className="font-semibold text-[#131722]">Generated Parameters</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1 text-[11px]">
                  {aiResult.parameters.map((p, idx) => (
                    <div key={idx} className="bg-[#fafbfc] border border-[#e0e3eb] p-1.5 rounded">
                      <span className="text-[#707a8a] block truncate">{p.name}</span>
                      <strong className="text-[#131722]">{p.default}</strong>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="font-semibold text-[#131722]">Strategy Backtest Overview</span>
                <p className="mt-1 leading-relaxed text-[11px] whitespace-pre-line bg-[#fafbfc] border border-[#e0e3eb] p-2 rounded max-h-[100px] overflow-y-auto font-mono text-[10px]">
                  {aiResult.pinescript}
                </p>
                <p className="mt-1 leading-relaxed text-[11px]">
                  {aiResult.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
