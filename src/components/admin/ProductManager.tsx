
import React, { useState, useEffect } from 'react';
import type { Product } from '../../domain/types';
import { storageService } from '../../services/storageService';

const ProductManager: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    
    // Form state uses strings to allow flexible input (e.g. "12,50") before validation
    const [form, setForm] = useState({
        id: '',
        name: '',
        price: '',
        barcode: '',
        labelType: ''
    });

    useEffect(() => {
        setProducts(storageService.getProducts());
    }, []);

    const handleSelect = (p: Product) => {
        setForm({
            id: p.id,
            name: p.name,
            // Display price as string formatted to 2 decimals
            price: p.price.toFixed(2), 
            barcode: p.barcode,
            labelType: p.labelType
        });
    };

    const clearForm = () => {
        setForm({
            id: '',
            name: '',
            price: '',
            barcode: '',
            labelType: ''
        });
    };

    const saveRecord = () => {
        // Validation logic from Python script
        if (!form.name.trim() || !form.price.trim()) {
            alert("Внимание: Името и Цената са задължителни.");
            return;
        }

        // Validate price is a number (handling comma as in Python logic)
        const normalizedPrice = form.price.replace(',', '.');
        const priceNum = parseFloat(normalizedPrice);

        if (isNaN(priceNum)) {
            alert("Грешка: Цената трябва да е число!");
            return;
        }

        let updatedProducts: Product[];
        let msg = "";
        
        if (form.id) {
            // UPDATE
            updatedProducts = products.map(p => p.id === form.id ? {
                ...p,
                name: form.name,
                price: priceNum,
                barcode: form.barcode,
                labelType: form.labelType
            } : p);
            msg = "Обновено!";
        } else {
            // INSERT
            const newProduct: Product = {
                id: Date.now().toString(),
                name: form.name,
                price: priceNum,
                barcode: form.barcode,
                labelType: form.labelType
            };
            updatedProducts = [...products, newProduct];
            msg = "Добавено!";
        }

        storageService.saveProducts(updatedProducts);
        setProducts(updatedProducts);
        clearForm();
        alert(msg);
    };

    const deleteRecord = () => {
        if (!form.id) return;
        if (window.confirm("Потвърждение: Да изтрия ли този запис?")) {
            const updated = products.filter(p => p.id !== form.id);
            storageService.saveProducts(updated);
            setProducts(updated);
            clearForm();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* LEFT COLUMN: Form */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 flex flex-col h-full">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Редакция на продукт</h3>
                
                <div className="space-y-4 flex-1">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID:</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded bg-gray-200 text-gray-500 text-sm" 
                            readOnly 
                            value={form.id} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Име на продукт:</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Цена (€):</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={form.price}
                            onChange={e => setForm({...form, price: e.target.value})}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Баркод:</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={form.barcode}
                            onChange={e => setForm({...form, barcode: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Инфо/Етикет:</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={form.labelType}
                            onChange={e => setForm({...form, labelType: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <button 
                        onClick={saveRecord}
                        className="w-full py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                    >
                        <span>💾</span> ЗАПАЗИ
                    </button>
                    <button 
                        onClick={clearForm}
                        className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded shadow-sm hover:bg-gray-100 transition-colors flex justify-center items-center gap-2"
                    >
                        <span>🧹</span> ИЗЧИСТИ
                    </button>
                    <button 
                        onClick={deleteRecord}
                        className="w-full py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition-colors mt-2 flex justify-center items-center gap-2"
                        disabled={!form.id}
                    >
                        <span>🗑</span> ИЗТРИЙ
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: Table */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b w-16">ID</th>
                                <th className="p-3 border-b">Име</th>
                                <th className="p-3 border-b w-24">Цена (€)</th>
                                <th className="p-3 border-b">Баркод</th>
                                <th className="p-3 border-b">Инфо</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.map(p => (
                                <tr 
                                    key={p.id} 
                                    onClick={() => handleSelect(p)}
                                    className={`cursor-pointer transition-colors ${form.id === p.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="p-3 text-xs text-gray-500 font-mono">{p.id.slice(-4)}</td>
                                    <td className="p-3 font-medium text-gray-900">{p.name}</td>
                                    <td className="p-3 font-semibold whitespace-nowrap">{p.price.toFixed(2)} €</td>
                                    <td className="p-3 text-gray-600">{p.barcode}</td>
                                    <td className="p-3 text-gray-600">{p.labelType}</td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                                        Няма налични продукти.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductManager;
