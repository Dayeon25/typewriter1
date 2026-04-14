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
  Type,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Mode = "keyboard" | "mouse";
type Language = "ko" | "en" | "num" | "sym";

const MobileView: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const [sessionId, setSessionId] = useState(urlSessionId || "");
  const [manualId, setManualId] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<Mode>("keyboard");
  const [lang, setLang] = useState<Language>("ko");
  const [textBuffer, setTextBuffer] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState("");
  
  // Mouse state
  const lastTouch = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const newSocket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });
    setSocket(newSocket);
    
    newSocket.on("connect", () => {
      console.log("Mobile connected to server:", newSocket.id);
      newSocket.emit("join-session", sessionId);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Mobile connection error:", err);
      setIsConnected(false);
    });

    return () => { newSocket.close(); };
  }, [sessionId]);

  // Sync text to laptop
  useEffect(() => {
    if (socket) {
      const assembled = Hangul.assemble(processCheonjiin(textBuffer));
      socket.emit("keyboard-event", { 
        sessionId, 
        data: { type: "text", value: assembled } 
      });
      setPreviewText(assembled);
    }
  }, [textBuffer, socket, sessionId]);

  const processCheonjiin = (buffer: string[]): string[] => {
    const result: string[] = [];
    let i = 0;
    while (i < buffer.length) {
      const char = buffer[i];
      if (["ㅣ", "ㆍ", "ㅡ"].includes(char)) {
        // Try to combine vowels
        let combined = char;
        let j = i + 1;
        while (j < buffer.length && ["ㅣ", "ㆍ", "ㅡ"].includes(buffer[j])) {
          const next = buffer[j];
          const seq = combined + next;
          const map: Record<string, string> = {
            "ㅣㆍ": "ㅏ",
            "ㅏㆍ": "ㅑ",
            "ㆍㅣ": "ㅓ",
            "ㅓㆍ": "ㅕ",
            "ㆍㅡ": "ㅗ",
            "ㅗㆍ": "ㅛ",
            "ㅡㆍ": "ㅜ",
            "ㅜㆍ": "ㅠ",
            "ㅏㅣ": "ㅐ",
            "ㅑㅣ": "ㅒ",
            "ㅓㅣ": "ㅔ",
            "ㅕㅣ": "ㅖ",
            "ㅗㅣ": "ㅚ",
            "ㅗㅏ": "ㅘ",
            "ㅗㅐ": "ㅙ",
            "ㅜㅣ": "ㅟ",
            "ㅜㅓ": "ㅝ",
            "ㅜㅔ": "ㅞ",
            "ㅡㅣ": "ㅢ",
          };
          if (map[seq]) {
            combined = map[seq];
            j++;
          } else {
            break;
          }
        }
        result.push(combined);
        i = j;
      } else {
        result.push(char);
        i++;
      }
    }
    return result;
  };

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
      const dx = (touch.clientX - lastTouch.current.x) * 1.5;
      const dy = (touch.clientY - lastTouch.current.y) * 1.5;
      socket?.emit("mouse-event", { sessionId, data: { type: "move", dx, dy } });
    }
    lastTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMouseClick = (button: 'left' | 'right') => {
    socket?.emit("mouse-event", { sessionId, data: { type: "click", button } });
  };

  const stopMouse = () => {
    lastTouch.current = null;
  };

  if (!sessionId) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-blue-400">연결 코드 입력</h1>
            <p className="text-slate-400">노트북 화면에 표시된 8자리 코드를 입력하세요.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="예: a1b2c3d4"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-center text-2xl font-mono focus:border-blue-500 outline-none"
            />
            <button 
              onClick={() => setSessionId(manualId)}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
            >
              연결하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Preview Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{mode === 'keyboard' ? '키보드 모드' : '터치패드 모드'}</span>
          </div>
          <button onClick={() => setTextBuffer([])} className="text-red-400 hover:text-red-300">전체 삭제</button>
          <span className="text-blue-400">{sessionId}</span>
        </div>
        <div className="h-12 bg-slate-950 rounded-lg border border-slate-800 px-3 flex items-center justify-between overflow-hidden">
          <div className="flex-1 overflow-x-auto whitespace-nowrap text-lg mr-2">
            {previewText || <span className="text-slate-700">입력 대기 중...</span>}
          </div>
          {previewText && (
            <button 
              onClick={() => navigator.clipboard.writeText(previewText)}
              className="p-2 bg-slate-800 rounded-md active:bg-slate-700"
            >
              <Copy className="w-4 h-4 text-blue-400" />
            </button>
          )}
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
                <p className="text-slate-500 font-medium">손가락을 움직여 커서를 이동하세요</p>
                <div className="flex gap-4 mt-8">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleMouseClick('left')}
                    className="w-24 h-32 bg-slate-800 rounded-xl border border-slate-700 flex items-end justify-center pb-4 text-xs font-bold text-slate-500 active:bg-blue-500/20 active:border-blue-500/50"
                  >
                    왼쪽 클릭
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleMouseClick('right')}
                    className="w-24 h-32 bg-slate-800 rounded-xl border border-slate-700 flex items-end justify-center pb-4 text-xs font-bold text-slate-500 active:bg-red-500/20 active:border-red-500/50"
                  >
                    오른쪽 클릭
                  </motion.button>
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
          <span className="text-[10px] font-bold uppercase">키보드</span>
        </button>
        <button 
          onClick={() => setMode("mouse")}
          className={`flex flex-col items-center gap-1 transition-colors ${mode === 'mouse' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <MousePointer2 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">터치패드</span>
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
        <Key label="한/영" onClick={() => onLangChange("en")} />
        <Key label="숫자" onClick={() => onLangChange("num")} />
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
          <Key label="한글" onClick={() => onLangChange("ko")} />
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
      <Key label="한글" onClick={() => onLangChange("ko")} />
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
