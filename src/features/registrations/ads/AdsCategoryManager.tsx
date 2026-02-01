import { useState, useEffect } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { listProducts } from '../../../lib/db';
import type { Product } from '../../../lib/types';

export default function AdsCategoryManager() {
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const prods = await listProducts();
        const cats = Array.from(new Set(prods.map(p => p.category).filter(Boolean))) as string[];
        setCategories(cats.sort());
        setLoading(false);
    }

    return (
        <div className="space-y-4">
            <div className="card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-4">
                    <Tag size={18} /> Categorias Detectadas (Baseado em Produtos)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    Estas categorias são extraídas automaticamente dos produtos cadastrados. Para adicionar novas, cadastre um produto com uma nova categoria.
                </p>

                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <div key={cat} className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm border border-cyan-100 flex items-center gap-2">
                            {cat}
                        </div>
                    ))}
                    {categories.length === 0 && !loading && <span className="text-gray-400 text-sm">Nenhuma categoria encontrada.</span>}
                </div>
            </div>
        </div>
    );
}

