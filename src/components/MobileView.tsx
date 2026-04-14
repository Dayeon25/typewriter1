import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import * as Hangul from "hangul-js";
import { 
  Keyboard as KeyboardIcon, 
  MousePointer2, 
  Delete, 
  CornerDownLeft, 
  Space,
  Globe,
  Hash,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Mode = "keyboard" | "mouse";
type Language = "ko" | "en" | "num" | "sym";

const MobileView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mode, setMode] = useState<Mode>("keyboard");
  const [lang, setLang] = useState<Language>("ko");
  const [textBuffer, setTextBuffer] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState("");
  
  // Mouse state
  const lastTouch = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    newSocket.emit("join-session", sessionId);
    return () => { newSocket.close(); };
  }, [sessionId]);

  // Sync text to laptop
  useEffect(() => {
    if (socket) {
      socket.emit("keyboard-event", { 
        sessionId, 
        data: { type: "text", value: Hangul.assemble(textBuffer) } 
      });
    }
    setPreviewText(Hangul.assemble(textBuffer));
  }, [textBuffer, socket, sessionId]);

  const handleKey = (char: string) => {
    if (char === "\b") {
      setTextBuffer(prev => prev.slice(0, -1));
    } else {
      setTextBuffer(prev => [...prev, char]);
    }
  };

  const handleDelete = useCallback(() => {
    setTextBuffer(prev => prev.slice(0, -1));
  }, []);

  // Long press delete
  const deleteInterval = useRef<NodeJS.Timeout | null>(null);
  const startDelete = () => {
    handleDelete();
    deleteInterval.current = setInterval(handleDelete, 100);
  };
  const stopDelete = () => {
    if (deleteInterval.current) clearInterval(deleteInterval.current);
  };

  const handleMouse = (e: React.TouchEvent) => {
    if (mode !== "mouse") return;
    const touch = e.touches[0];
    if (lastTouch.current) {
      const dx = (touch.clientX - lastTouch.current.x) * 0.5;
      const dy = (touch.clientY - lastTouch.current.y) * 0.5;
      socket?.emit("mouse-event", { sessionId, data: { dx, dy } });
    }
    lastTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const stopMouse = () => {
    lastTouch.current = null;
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Preview Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
          <span>{mode === 'keyboard' ? 'Keyboard Mode' : 'Touchpad Mode'}</span>
          <span className="text-blue-400">{sessionId}</span>
        </div>
        <div className="h-12 bg-slate-950 rounded-lg border border-slate-800 px-3 flex items-center overflow-x-auto whitespace-nowrap text-lg">
          {previewText || <span className="text-slate-700">Waiting for input...</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {mode === "keyboard" ? (
            <motion.div 
              key="keyboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col p-2 gap-2"
            >
              <KeyboardLayout 
                lang={lang} 
                onKey={handleKey} 
                onDeleteStart={startDelete}
                onDeleteEnd={stopDelete}
                onLangChange={setLang}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="mouse"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full p-4"
              onTouchMove={handleMouse}
              onTouchEnd={stopMouse}
            >
              <div className="w-full h-full bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <MousePointer2 className="w-10 h-10 text-blue-400" />
                </div>
                <p className="text-slate-500 font-medium">Slide to move cursor</p>
                <div className="flex gap-4 mt-8">
                  <div className="w-20 h-32 bg-slate-800 rounded-xl border border-slate-700 flex items-end justify-center pb-4 text-xs font-bold text-slate-500">LEFT</div>
                  <div className="w-20 h-32 bg-slate-800 rounded-xl border border-slate-700 flex items-end justify-center pb-4 text-xs font-bold text-slate-500">RIGHT</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-around items-center">
        <button 
          onClick={() => setMode("keyboard")}
          className={`flex flex-col items-center gap-1 transition-colors ${mode === 'keyboard' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <KeyboardIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Keyboard</span>
        </button>
        <button 
          onClick={() => setMode("mouse")}
          className={`flex flex-col items-center gap-1 transition-colors ${mode === 'mouse' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <MousePointer2 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Touchpad</span>
        </button>
      </div>
    </div>
  );
};

interface KeyboardProps {
  lang: Language;
  onKey: (char: string) => void;
  onDeleteStart: () => void;
  onDeleteEnd: () => void;
  onLangChange: (lang: Language) => void;
}

const KeyboardLayout: React.FC<KeyboardProps> = ({ lang, onKey, onDeleteStart, onDeleteEnd, onLangChange }) => {
  // Cheonjiin Specific Logic
  const [lastConsonant, setLastConsonant] = useState<{ key: string, idx: number } | null>(null);
  const [lastTime, setLastTime] = useState(0);

  const handleCheonjiinConsonant = (chars: string[]) => {
    const now = Date.now();
    const key = chars.join("");
    
    if (lastConsonant?.key === key && now - lastTime < 1000) {
      // Cycle through chars
      const nextIdx = (lastConsonant.idx + 1) % chars.length;
      onKey("\b"); // Backspace first
      onKey(chars[nextIdx]);
      setLastConsonant({ key, idx: nextIdx });
    } else {
      onKey(chars[0]);
      setLastConsonant({ key, idx: 0 });
    }
    setLastTime(now);
  };

  if (lang === "ko") {
    return (
      <div className="grid grid-cols-4 grid-rows-4 gap-2 h-full">
        {/* Row 1 */}
        <Key label="ㄱㅋ" sub="ㄲ" onClick={() => handleCheonjiinConsonant(["ㄱ", "ㅋ", "ㄲ"])} />
        <Key label="ㄴㄹ" onClick={() => handleCheonjiinConsonant(["ㄴ", "ㄹ"])} />
        <Key label="ㄷㅌ" sub="ㄸ" onClick={() => handleCheonjiinConsonant(["ㄷ", "ㅌ", "ㄸ"])} />
        <Key icon={<Delete className="w-6 h-6" />} color="bg-slate-800" onTouchStart={onDeleteStart} onTouchEnd={onDeleteEnd} />

        {/* Row 2 */}
        <Key label="ㅂㅍ" sub="ㅃ" onClick={() => handleCheonjiinConsonant(["ㅂ", "ㅍ", "ㅃ"])} />
        <Key label="ㅅㅎ" sub="ㅆ" onClick={() => handleCheonjiinConsonant(["ㅅ", "ㅎ", "ㅆ"])} />
        <Key label="ㅈㅊ" sub="ㅉ" onClick={() => handleCheonjiinConsonant(["ㅈ", "ㅊ", "ㅉ"])} />
        <Key icon={<CornerDownLeft className="w-6 h-6" />} color="bg-slate-800" onClick={() => onKey("\n")} />

        {/* Row 3 */}
        <Key label="ㅇㅁ" onClick={() => handleCheonjiinConsonant(["ㅇ", "ㅁ"])} />
        <Key label="ㅣ" color="bg-blue-600" onClick={() => onKey("ㅣ")} />
        <Key label="ㆍ" color="bg-blue-600" onClick={() => onKey("ㆍ")} />
        <Key label="ㅡ" color="bg-blue-600" onClick={() => onKey("ㅡ")} />

        {/* Row 4 */}
        <Key icon={<Globe className="w-5 h-5" />} onClick={() => onLangChange("en")} />
        <Key icon={<Hash className="w-5 h-5" />} onClick={() => onLangChange("num")} />
        <Key icon={<Space className="w-6 h-6" />} className="col-span-2" onClick={() => onKey(" ")} />
      </div>
    );
  }

  // English Layout (Simplified)
  const enKeys = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  if (lang === "en") {
    return (
      <div className="flex flex-col gap-2 h-full">
        {enKeys.map((row, i) => (
          <div key={i} className="flex gap-1 justify-center">
            {row.split("").map(k => (
              <Key key={k} label={k} className="flex-1 h-12" onClick={() => onKey(k.toLowerCase())} />
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-2 mt-auto">
          <Key icon={<Type className="w-5 h-5" />} onClick={() => onLangChange("ko")} />
          <Key icon={<Space className="w-6 h-6" />} className="col-span-2" onClick={() => onKey(" ")} />
          <Key icon={<Delete className="w-6 h-6" />} onTouchStart={onDeleteStart} onTouchEnd={onDeleteEnd} />
        </div>
      </div>
    );
  }

  // Numbers & Symbols
  const numKeys = ["123", "456", "789", "*0#"];
  return (
    <div className="grid grid-cols-3 gap-2 h-full">
      {numKeys.join("").split("").map(k => (
        <Key key={k} label={k} onClick={() => onKey(k)} />
      ))}
      <Key icon={<Type className="w-5 h-5" />} onClick={() => onLangChange("ko")} />
      <Key icon={<Space className="w-6 h-6" />} onClick={() => onKey(" ")} />
      <Key icon={<Delete className="w-6 h-6" />} onTouchStart={onDeleteStart} onTouchEnd={onDeleteEnd} />
    </div>
  );
};

const Key: React.FC<{ 
  label?: string; 
  sub?: string; 
  icon?: React.ReactNode; 
  onClick?: () => void; 
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  className?: string;
  color?: string;
}> = ({ label, sub, icon, onClick, onTouchStart, onTouchEnd, className = "", color = "bg-slate-900" }) => (
  <motion.button
    whileTap={{ scale: 0.92, backgroundColor: "rgb(30, 41, 59)" }}
    onClick={onClick}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    className={`
      ${color} border border-slate-800 rounded-xl flex flex-col items-center justify-center 
      shadow-lg active:shadow-inner transition-all relative overflow-hidden
      ${className}
    `}
  >
    {label && <span className="text-xl font-bold">{label}</span>}
    {sub && <span className="text-[10px] text-slate-500 absolute bottom-1 right-2">{sub}</span>}
    {icon}
  </motion.button>
);

export default MobileView;
