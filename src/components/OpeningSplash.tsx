import React, { useEffect, useState } from 'react';
import logoCapyops from '../assets/logocapyops.png';

interface Props {
  onComplete: () => void;
}

const OpeningSplash: React.FC<Props> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsExiting(true), 900);
          return 100;
        }
        return Math.min(prev + 3, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#050505] via-[#0d1117] to-[#0b1f1a] text-white transition-all duration-1000 ease-in-out ${
        isExiting ? 'pointer-events-none scale-110 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/18 blur-[140px] animate-pulse" />
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/12 blur-[110px] animate-bounce [animation-duration:3800ms]" />

        <div className="relative z-10 flex h-screen w-full flex-col items-center justify-center">
          <img
            src={logoCapyops}
            alt="CapyOps"
            className="mb-8 h-50 w-50 rounded-3xl p-2  animate-pulse md:h-70 md:w-70"
          />

          <div className="relative mt-2 h-1 w-52 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-300 transition-all duration-300 ease-out shadow-[0_0_18px_rgba(34,211,238,0.45)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-200/70 animate-pulse">
            {progress < 100 ? 'Inicializando Modulos...' : 'Sistema Pronto'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpeningSplash;
