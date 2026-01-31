import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h1 className="text-lg font-bold">Algo deu errado</h1>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                            Ocorreu um erro inesperado ao renderizar esta página.
                        </p>

                        {this.state.error && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-xs font-mono text-red-700 dark:text-red-300 mb-4 overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary flex items-center gap-2 flex-1 justify-center"
                            >
                                <RefreshCw size={16} /> Recarregar Página
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="btn-ghost flex-1"
                            >
                                Voltar ao Início
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
