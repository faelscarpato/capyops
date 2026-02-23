const DEFAULT_TIMEOUT_MS = 15_000;

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  actionLabel?: string;
};

function toFriendlyNetworkError(actionLabel: string): Error {
  return new Error(`Sem conexão ou serviço instável ao ${actionLabel}. Tente novamente em instantes.`);
}

function mapHttpError(status: number, fallback: string): string {
  if (status === 431) return 'Cabeçalhos muito grandes na requisição. Limpe os dados do site, faça login novamente e tente outra vez.';
  if (status === 408 || status === 504) return 'Tempo esgotado. O serviço está instável, tente novamente.';
  if (status === 429) return 'Muitas tentativas em sequência. Aguarde alguns segundos e tente novamente.';
  if (status >= 500) return 'Serviço instável no momento. Tente novamente em instantes.';
  return fallback;
}

async function readErrorBody(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      return json?.message || json?.error || text;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

export async function requestJson<T>(input: RequestInfo | URL, options: RequestOptions): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, actionLabel = 'processar a requisição', ...init } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const inputValue = String(input);
  const isApiRoute = inputValue.startsWith('/api/');

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      const apiMessage = await readErrorBody(response);
      throw new Error(mapHttpError(response.status, apiMessage || `Falha ao ${actionLabel}.`));
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
    }
    if (error instanceof TypeError) {
      if (isApiRoute) {
        throw new Error(
          `Sem conexão ou serviço instável ao ${actionLabel}. Em ambiente local, confirme as envs do Wrangler (.dev.vars) e limpe os dados do site.`
        );
      }
      throw toFriendlyNetworkError(actionLabel);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestBlob(input: RequestInfo | URL, options: RequestOptions): Promise<Blob> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, actionLabel = 'baixar o arquivo', ...init } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const inputValue = String(input);
  const isApiRoute = inputValue.startsWith('/api/');

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      const apiMessage = await readErrorBody(response);
      throw new Error(mapHttpError(response.status, apiMessage || `Falha ao ${actionLabel}.`));
    }
    return await response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
    }
    if (error instanceof TypeError) {
      if (isApiRoute) {
        throw new Error(
          `Sem conexão ou serviço instável ao ${actionLabel}. Em ambiente local, confirme as envs do Wrangler (.dev.vars) e limpe os dados do site.`
        );
      }
      throw toFriendlyNetworkError(actionLabel);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
