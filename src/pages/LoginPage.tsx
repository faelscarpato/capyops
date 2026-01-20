import { useState } from 'react';
import { Boxes } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, signInWithPassword, signUpWithPassword, signInMagicLink } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'signin') await signInWithPassword(email, password);
      if (mode === 'signup') await signUpWithPassword(email, password);
      if (mode === 'magic') {
        await signInMagicLink(email);
        setMsg('Link de acesso enviado para seu e-mail.');
      }
    } catch (err: any) {
      setMsg(err?.message ?? 'Erro ao autenticar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 dark:bg-[#050505]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-soft dark:border-white/10 dark:bg-[#0b0b0b]">
            <Boxes className="w-6 h-6 text-gray-800 dark:text-white/80" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">CapyOps ML</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/70">Painel operacional privado para sua loja (Normal-first).</p>
        </div>

        <div className="card p-5">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={mode === 'signin' ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
              onClick={() => setMode('signin')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
              onClick={() => setMode('signup')}
            >
              Criar conta
            </button>
            <button
              type="button"
              className={mode === 'magic' ? 'btn-primary flex-1' : 'btn-ghost flex-1'}
              onClick={() => setMode('magic')}
            >
              Magic link
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <div className="label mb-1">E-mail</div>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>

            {mode !== 'magic' && (
              <div>
                <div className="label mb-1">Senha</div>
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  required
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-white/60">
                  Dica: use uma senha forte. Isso é um painel privado.
                </div>
              </div>
            )}

            {msg && (
              <div className="text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                {msg}
              </div>
            )}

            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Processando...' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
            </button>

            <div className="text-xs text-gray-500 dark:text-white/60">
              Se estiver usando Magic Link, abra o e-mail no mesmo navegador em que o app está aberto.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
