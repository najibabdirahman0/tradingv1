import { useState, useEffect } from 'react';
import { Play, Code, AlertTriangle, FileText, CheckCircle2, Settings2 } from 'lucide-react';

interface Parameter {
  name: string;
  key: string;
  type: string;
  default: string;
  min?: string;
  max?: string;
}

interface PineEditorProps {
  script: string;
  onScriptChange: (newScript: string) => void;
  onCompile: () => void;
  compilationStatus: 'idle' | 'success' | 'error';
  compilationMessage: string;
}

export default function PineEditor({
  script,
  onScriptChange,
  onCompile,
  compilationStatus,
  compilationMessage
}: PineEditorProps) {
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = script.split('\n').length;
    setLineCount(lines || 1);
  }, [script]);

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-white text-[#131722] font-sans overflow-hidden">
      {/* Tab Header Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#fafbfc] border-b border-[#e0e3eb]">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#2962FF]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#131722]">Pine Editor v6</span>
          <span className="text-[10px] bg-[#2962FF]/10 text-[#2962FF] px-1.5 py-0.5 rounded-full font-semibold border border-[#2962FF]/20">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1 text-xs text-[#4c525e] hover:text-[#131722] bg-white hover:bg-[#fafbfc] rounded border border-[#d1d4dc] flex items-center gap-1.5 cursor-pointer transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
          <button
            type="button"
            onClick={onCompile}
            className="px-3 py-1 bg-[#2962FF] text-white hover:bg-[#1e53db] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            Apply to Chart
          </button>
        </div>
      </div>

      {/* Editor Main body: Right/Pine Script editor only */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic Syntax Highlight Coding Interface */}
        <div className="flex-1 flex bg-white overflow-hidden">
          {/* Gutter Line Numbers */}
          <div className="w-10 bg-[#fafbfc] select-none text-right pr-2 py-4 font-mono text-xs text-[#707a8a] space-y-0.5 border-r border-[#e0e3eb]">
            {lineNumbers.map((num) => (
              <div key={num} className="leading-5 h-5">{num}</div>
            ))}
          </div>

          {/* Interactive Textarea with Mock Syntax Overlays */}
          <div className="flex-1 relative font-mono text-xs">
            <textarea
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              className="absolute inset-0 w-full h-full p-4 bg-transparent text-[#131722] font-mono text-xs leading-5 focus:outline-none resize-none caret-[#2962FF] overflow-auto z-10 select-text"
              style={{ tabSize: 4 }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Compiler Log Output Tray */}
      <div className="bg-[#fafbfc] border-t border-[#e0e3eb] p-2.5 flex items-center justify-between text-xs px-4">
        <div className="flex items-center gap-2">
          {compilationStatus === 'success' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-emerald-600 font-semibold">Compiled Successfully</span>
            </>
          )}
          {compilationStatus === 'error' && (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-rose-600 font-semibold">Compile Error</span>
            </>
          )}
          {compilationStatus === 'idle' && (
            <>
              <FileText className="w-4 h-4 text-[#707a8a] shrink-0" />
              <span className="text-[#707a8a]">Ready to compile script</span>
            </>
          )}
          <span className="text-[11px] text-[#4c525e] border-l border-[#e0e3eb] pl-2 font-medium truncate max-w-[300px]">
            {compilationMessage || "Waiting for execution triggers..."}
          </span>
        </div>
        <div className="text-[11px] text-[#707a8a] font-mono">
          Pine SDK: v6.0.4
        </div>
      </div>
    </div>
  );
}
