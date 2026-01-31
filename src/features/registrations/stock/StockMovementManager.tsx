import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { listProducts, logStockMovement, updateProduct } from '../../../lib/db';
import type { Product } from '../../../lib/types';

export default function StockMovementManager() {
    const [products, setProducts] = useState<Product[]>([]);
    const [type, setType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        const p = await listProducts();
        setProducts(p);
    }

    async function handleSubmit() {
        if (!selectedProductId || !quantity) return;
        setLoading(true);
        try {
            const product = products.find(p => p.id === selectedProductId);
            if (!product) return;

            let newStock = product.stock;
            if (type === 'IN') newStock += quantity;
            if (type === 'OUT') newStock -= quantity;
            if (type === 'ADJUST') newStock = quantity; // Absolute set

            // 1. Log movement
            await logStockMovement({
                product_id: selectedProductId,
                type,
                quantity: type === 'ADJUST' ? Math.abs(newStock - product.stock) : quantity,
                previous_stock: product.stock,
                new_stock: newStock,
                notes,
            });

            // 2. Update product
            await updateProduct(selectedProductId, { stock: newStock });

            alert('Movimentação registrada com sucesso!');
            setQuantity(0);
            setNotes('');
            load(); // Refresh products to get new stock
        } catch (e) {
            alert('Erro ao registrar movimentação.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm border dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                {type === 'IN' && <ArrowDown className="text-green-500" />}
                {type === 'OUT' && <ArrowUp className="text-red-500" />}
                {type === 'ADJUST' && <RefreshCw className="text-blue-500" />}
                Movimentação de Estoque
            </h3>

            <div className="flex gap-4 mb-6 justify-center">
                <button onClick={() => setType('IN')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'IN' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}> Entrada </button>
                <button onClick={() => setType('ADJUST')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'ADJUST' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}> Ajuste / Balanço </button>
                <button onClick={() => setType('OUT')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'OUT' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}> Baixa / Perda </button>
            </div>

            <div className="grid gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Produto</label>
                    <select className="input" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                        <option value="">Selecione um produto...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {p.variant} (Atual: {p.stock})</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                        {type === 'ADJUST' ? 'Nova Quantidade Total' : 'Quantidade para Movimentar'}
                    </label>
                    <input
                        type="number"
                        className="input"
                        value={quantity || ''}
                        onChange={e => setQuantity(Number(e.target.value))}
                        placeholder="0"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Observações / Motivo</label>
                    <textarea
                        className="input min-h-[80px]"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Nota Fiscal 123, Contagem cíclica, Avaria..."
                    />
                </div>

                {type === 'ADJUST' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
                        <AlertTriangle size={16} />
                        <span>Atenção: O Ajuste definirá o estoque EXATAMENTE para o valor informado, ignorando o valor atual.</span>
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!selectedProductId || loading}
                    className={`btn-primary w-full mt-2 flex justify-center py-3 ${loading ? 'opacity-50' : ''}`}
                >
                    {loading ? 'Processando...' : 'Confirmar Movimentação'}
                </button>
            </div>
        </div>
    );
}
