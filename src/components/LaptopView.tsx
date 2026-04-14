import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";
import { Monitor, Smartphone, Copy, Check, MousePointer2, Keyboard as KeyboardIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LaptopView: React.FC = () => {
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [socket, setSocket] = useState<Socket | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [isConnected, setIsConnected] = useState(false);

  const refreshSession = () => {
    window.location.reload();
  };
  
  const remoteUrl = `${window.location.origin}/remote/${sessionId}`;

  useEffect(() => {
    const newSocket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Laptop connected to socket:", newSocket.id);
      newSocket.emit("join-session", sessionId);
    });

    newSocket.on("keyboard-event", (data: any) => {
      if (data.type === "text") {
        setText(data.value);
      }
    });

    newSocket.on("mouse-event", (data: any) => {
      if (data.type === "move") {
        setCursorPos((prev) => ({
          x: Math.max(0, Math.min(100, prev.x + data.dx)),
          y: Math.max(0, Math.min(100, prev.y + data.dy)),
        }));
      } else if (data.type === "click") {
        // Visual feedback for click
        const clickIndicator = document.createElement("div");
        clickIndicator.className = `absolute w-8 h-8 rounded-full border-2 ${data.button === 'right' ? 'border-red-500' : 'border-blue-500'} animate-ping pointer-events-none`;
        clickIndicator.style.left = `${cursorPos.x}%`;
        clickIndicator.style.top = `${cursorPos.y}%`;
        clickIndicator.style.transform = "translate(-50%, -50%)";
        document.getElementById("virtual-screen")?.appendChild(clickIndicator);
        setTimeout(() => clickIndicator.remove(), 1000);
      }
      setIsConnected(true);
    });

    return () => {
      newSocket.close();
    };
  }, [sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Connection Info */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              원격 제어 허브
            </h1>
            <p className="text-slate-400 text-lg">
              스마트폰으로 QR 코드를 스캔하여 타이핑과 마우스 제어를 시작하세요.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-blue-500/10 inline-block">
            <QRCodeSVG value={remoteUrl} size={200} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                <span>{isConnected ? '스마트폰 연결됨' : '연결 대기 중...'}</span>
              </div>
              <button onClick={refreshSession} className="text-xs text-blue-400 hover:underline">코드 새로고침</button>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase">연결 코드</span>
                <button onClick={handleCopy} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-3xl font-mono text-blue-400 tracking-widest text-center py-2">
                {sessionId}
              </div>
              <div className="text-[10px] text-slate-600 break-all">
                {remoteUrl}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Desktop / Text Area */}
        <div id="virtual-screen" className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Virtual Cursor */}
          <motion.div 
            className="absolute z-50 pointer-events-none"
            animate={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
          >
            <MousePointer2 className="w-6 h-6 text-white drop-shadow-lg fill-blue-500" />
          </motion.div>

          {/* Text Display Area */}
          <div className="absolute inset-0 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <KeyboardIcon className="w-4 h-4" />
              <span>원격 텍스트 입력창</span>
            </div>
            <textarea
              className="flex-1 bg-transparent border-none outline-none resize-none text-xl leading-relaxed text-slate-200 placeholder:text-slate-700"
              placeholder="핸드폰에서 입력을 시작하세요..."
              value={text}
              readOnly
            />
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '복사 완료!' : '클립보드에 복사'}
              </button>
            </div>
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-10" 
               style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 text-slate-500 text-sm text-center max-w-2xl">
        <p>
          참고: 브라우저 보안 제한으로 인해 이 앱은 OS 마우스를 직접 제어하거나 다른 앱에 직접 입력할 수 없습니다. 
          <strong>클립보드에 복사</strong> 버튼을 눌러 엑셀, 한글 등 원하는 앱에 붙여넣으세요.
        </p>
      </div>
    </div>
  );
};

export default LaptopView;
