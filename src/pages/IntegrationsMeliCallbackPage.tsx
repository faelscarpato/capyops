import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { meliOAuthCallback } from '../lib/meliApi';

export default function IntegrationsMeliCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando conexão...');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      setStatus('error');
      setMessage('Parâmetros inválidos no callback.');
      return;
    }

    (async () => {
      try {
        await meliOAuthCallback(code, state);
        setStatus('success');
        setMessage('Conta Mercado Livre conectada com sucesso.');
        setTimeout(() => navigate('/integracoes/mercado-livre'), 1500);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message ?? 'Erro ao finalizar conexão.');
      }
    })();
  }, [params, navigate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Callback Mercado Livre" subtitle="Finalizando conexão..." />
      <SectionCard title="Status">
        <div className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
          {message}
        </div>
      </SectionCard>
    </div>
  );
}