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
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-white/10 dark:bg-[#0b0b0b]">
                <Boxes className="h-6 w-6 text-gray-800 dark:text-white/80" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CapyOps</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/70">
                Painel operacional privado para sua loja.
              </p>
            </div>

            <div className="card p-6">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-2 text-sm dark:bg-white/5">
                <button
                  type="button"
                  className={mode === 'signin' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
                  onClick={() => setMode('signin')}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className={mode === 'signup' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
                  onClick={() => setMode('signup')}
                >
                  Criar conta
                </button>
                <button
                  type="button"
                  className={mode === 'magic' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
                  onClick={() => setMode('magic')}
                >
                  Magic link
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
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
                  </div>
                )}

                {msg && (
                  <div className="text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                    {msg}
                  </div>
                )}

                {mode === 'signup' ? (
                  <div className="text-[11px] text-gray-400">
                    Ao criar uma conta você aceita os termos de uso e política de privacidade.
                  </div>
                ) : null}

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

        <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-b from-white via-indigo-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 lg:flex">
          <div className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-indigo-100 blur-3xl dark:bg-cyan-500/10" />
          <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-indigo-200 blur-3xl dark:bg-cyan-500/10" />
          <div className="relative z-10 flex w-[70%] max-w-md flex-col items-center gap-6 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-indigo-200 text-indigo-600 dark:border-cyan-400/40 dark:text-cyan-200">
              ✓
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800 dark:text-slate-100">Bem vindo ao CapyOps</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-slate-300">Acompanhe metas, estoque e vendas em um só lugar.</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-950">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Acesso seguro</div>
                <div className="mt-1 text-gray-400">Auth Supabase</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-950">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Visao unificada</div>
                <div className="mt-1 text-gray-400">Vendas + estoque</div>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-950">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Operacao diaria</div>
                <div className="mt-1 text-gray-400">Checklists reais</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-950">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Relatorios</div>
                <div className="mt-1 text-gray-400">Dados vivos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
