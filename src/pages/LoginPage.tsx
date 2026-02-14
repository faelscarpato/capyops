import { useState } from 'react';
import { Boxes } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';
import InstallAppCard from '../components/InstallAppCard';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';

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
    <div className="min-h-screen bg-app">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-default bg-surface shadow-card">
                <Boxes className="h-6 w-6 text-fg" />
              </div>
              <h1 className="text-2xl font-semibold text-fg">CapyOps</h1>
              <p className="mt-1 text-sm text-muted">
                Painel operacional privado para sua loja.
              </p>
            </div>

            <InstallAppCard />
            <div className="card p-6">
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-default bg-surface-2 p-2 text-sm">
                <Button type="button" variant={mode === 'signin' ? 'primary' : 'ghost'} size="sm" className="w-full" onClick={() => setMode('signin')}>Entrar</Button>
                <Button type="button" variant={mode === 'signup' ? 'primary' : 'ghost'} size="sm" className="w-full" onClick={() => setMode('signup')}>Criar conta</Button>
                <Button type="button" variant={mode === 'magic' ? 'primary' : 'ghost'} size="sm" className="w-full" onClick={() => setMode('magic')}>Magic link</Button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />

                {mode !== 'magic' && (
                  <Input
                    label="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                )}

                {msg && (
                  <div className="rounded-lg border border-default bg-surface-2 px-3 py-2 text-sm text-fg">
                    {msg}
                  </div>
                )}

                {mode === 'signup' ? (
                  <div className="text-[11px] text-muted-2">
                    Ao criar uma conta você aceita os termos de uso e política de privacidade.
                  </div>
                ) : null}

                <Button className="w-full" variant="primary" loading={busy} disabled={busy}>
                  {busy ? 'Processando...' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
                </Button>

                <div className="text-xs text-muted">
                  Se estiver usando Magic Link, abra o e-mail no mesmo navegador em que o app está aberto.
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-center bg-surface-2 px-8 lg:flex">
          <div className="flex w-[70%] max-w-md flex-col items-center gap-6 rounded-xl border border-default bg-surface p-6 shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-default text-[color:var(--primary)]">
              ✓
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-fg">Bem vindo ao CapyOps</div>
              <div className="mt-1 text-sm text-muted">Acompanhe metas, estoque e vendas em um só lugar.</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-default bg-surface-2 p-4">
                <div className="text-sm font-semibold text-fg">Acesso seguro</div>
                <div className="mt-1 text-muted-2">Auth Supabase</div>
              </div>
              <div className="rounded-lg border border-default bg-surface-2 p-4">
                <div className="text-sm font-semibold text-fg">Visão unificada</div>
                <div className="mt-1 text-muted-2">Vendas + estoque</div>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-default bg-surface-2 p-4">
                <div className="text-sm font-semibold text-fg">Operação diária</div>
                <div className="mt-1 text-muted-2">Checklists reais</div>
              </div>
              <div className="rounded-lg border border-default bg-surface-2 p-4">
                <div className="text-sm font-semibold text-fg">Relatórios</div>
                <div className="mt-1 text-muted-2">Dados vivos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

