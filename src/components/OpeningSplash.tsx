import React, { useEffect, useState } from 'react';
import { BadgeDollarSign, BarChart3, Receipt, ShoppingCart, Store } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const ICONS = [ShoppingCart, Receipt, BarChart3, BadgeDollarSign, Store];

const OpeningSplash: React.FC<Props> = ({ onComplete }) => {
  const [currentIcon, setCurrentIcon] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => {
        if (prev === ICONS.length - 1) {
          clearInterval(interval);
          setTimeout(() => setIsExiting(true), 1200);
          return prev;
        }
        return prev + 1;
      });
    }, 550);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  const Icon = ICONS[currentIcon];
  const progress = ((currentIcon + 1) / ICONS.length) * 100;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] text-white transition-all duration-1000 ease-in-out ${
        isExiting ? 'pointer-events-none scale-110 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-[120px] animate-pulse" />
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-[90px] animate-bounce [animation-duration:3000ms]" />

        <div className="relative z-10 flex h-screen w-full flex-col items-center justify-center">
          <div className="flex h-24 items-center justify-center md:h-32">
            <div
              key={currentIcon}
              className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all duration-300 md:h-28 md:w-28"
            >
              <Icon className="h-10 w-10 text-white/90 md:h-14 md:w-14" />
            </div>
          </div>

          <div className="relative mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/5">
            <div
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 transition-all duration-300 ease-out shadow-[0_0_18px_rgba(34,211,238,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.4em] text-cyan-300/60 animate-pulse">
            {currentIcon < ICONS.length - 1 ? 'Inicializando Modulos...' : 'Sistema Pronto'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpeningSplash;
