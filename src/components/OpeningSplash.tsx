import React, { useEffect, useState } from 'react';
import logoCapyops from '../assets/logo3.png';

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[color:var(--bg)] text-[color:var(--text)] transition-all duration-700 ease-in-out ${
        isExiting ? 'pointer-events-none scale-110 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full  bg-[color:var(--surface)]/70" />

        <div className="relative z-10 flex h-screen w-full flex-col items-center justify-center">
          <img
            src={logoCapyops}
            alt="CapyOps"
            className="mb-8 h-24 w-24 rounded-3xl p-2 md:h-80 md:w-80"
          />

          <div className="relative mt-2 h-1.5 w-52 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
            <div
              className="absolute inset-0 bg-[color:var(--primary)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.35em] text-[color:var(--muted)]">
            {progress < 100 ? 'Inicializando Modulos...' : 'Sistema Pronto'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpeningSplash;
