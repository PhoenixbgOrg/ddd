
import React, { useState, useEffect } from 'react';
import type { Product, CompanySettings } from '../../domain/types';
import { storageService } from '../../services/storageService';

const FIXED_RATE = 1.95583;

const ProductManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<CompanySettings>({ companyName: '', companyEmail: '', companyPhone: '' });
    
    // Product Form State
    const [form, setForm] = useState({
        id: '',
        name: '',
        priceBgn: '', // Input is text to allow decimals during typing
        barcode: '',
        labelInfo: ''
    });
    const [liveEur, setLiveEur] = useState<string>('0.00');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setProducts(storageService.getProducts());
        setSettings(storageService.getCompanySettings());
    }, []);

    // Live Currency Calc
    useEffect(() => {
        if (!form.priceBgn) {
            setLiveEur('0.00');
            return;
        }
        // Handle both dot and comma
        const val = parseFloat(form.priceBgn.replace(',', '.'));
        if (!isNaN(val)) {
            setLiveEur((val / FIXED_RATE).toFixed(2));
        } else {
            setLiveEur('Invalid');
        }
    }, [form.priceBgn]);

    const handleProductSelect = (p: Product) => {
        setForm({
            id: p.id,
            name: p.name,
            priceBgn: p.price.toFixed(2),
            barcode: p.barcode,
            labelInfo: p.labelType
        });
    };

    const clearProductForm = () => {
        setForm({ id: '', name: '', priceBgn: '', barcode: '', labelInfo: '' });
    };

    const saveProduct = () => {
        if (!form.name.trim() || !form.priceBgn.trim()) {
            alert("Моля, попълнете име и цена.");
            return;
        }
        const priceNum = parseFloat(form.priceBgn.replace(',', '.'));
        if (isNaN(priceNum)) {
            alert("Невалиден формат за цена.");
            return;
        }

        let updated: Product[];
        if (form.id) {
            updated = products.map(p => p.id === form.id ? {
                ...p, name: form.name, price: priceNum, barcode: form.barcode, labelType: form.labelInfo
            } : p);
        } else {
            updated = [...products, {
                id: Date.now().toString(),
                name: form.name,
                price: priceNum,
                barcode: form.barcode,
                labelType: form.labelInfo
            }];
        }
        storageService.saveProducts(updated);
        setProducts(updated);
        if (!form.id) clearProductForm();
        alert("Записано успешно!");
    };

    const deleteProduct = () => {
        if (!form.id) return;
        if (window.confirm("Сигурни ли сте?")) {
            const updated = products.filter(p => p.id !== form.id);
            storageService.saveProducts(updated);
            setProducts(updated);
            clearProductForm();
        }
    };

    const saveSettings = () => {
        storageService.saveCompanySettings(settings);
        alert("Настройките са запазени.");
    };

    const handlePrintLabel = () => {
        const printWindow = window.open('', '', 'width=600,height=800');
        if (!printWindow) {
            alert("Pop-up блокиран. Моля, разрешете изскачащи прозорци.");
            return;
        }

        const priceVal = parseFloat(form.priceBgn.replace(',', '.'));
        const priceDisplay = isNaN(priceVal) ? '0.00' : priceVal.toFixed(2);
        
        const styles = `
            <style>
                @page { size: 100mm 150mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; width: 100mm; height: 150mm; box-sizing: border-box; -webkit-print-color-adjust: exact; }
                .container { 
                    width: 100mm; height: 150mm; 
                    display: flex; flex-direction: column; align-items: center; text-align: center;
                    padding: 5mm; box-sizing: border-box;
                    position: relative;
                }
                .header { width: 100%; border-bottom: 2px solid #ccc; padding-bottom: 3mm; margin-bottom: 4mm; }
                .company-name { font-size: 14pt; font-weight: bold; color: #333; text-transform: uppercase; }
                
                .product-name { font-size: 22pt; font-weight: 900; color: #000; line-height: 1.1; margin-bottom: 4mm; width: 100%; word-wrap: break-word; }
                
                .info { font-style: italic; font-size: 11pt; margin-bottom: 6mm; width: 100%; border-bottom: 1px dashed #ccc; padding-bottom: 3mm;}
                
                .price-box { 
                    border: 3px solid #000; padding: 4mm; width: 85%; margin-bottom: auto; margin-top: 2mm;
                }
                .price-label { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2mm; color: #555; }
                .price-main { font-size: 38pt; font-weight: 900; color: #000; line-height: 1; }
                .price-sub { font-size: 18pt; font-weight: bold; color: #444; margin-top: 2mm; }
                
                .barcode-box { margin-bottom: 5mm; width: 100%; margin-top: 5mm; }
                .barcode-lines { height: 12mm; background: repeating-linear-gradient(90deg, black, black 2px, white 2px, white 4px); width: 70%; margin: 0 auto 1mm auto; }
                .barcode-text { font-family: monospace; font-size: 12pt; letter-spacing: 2px; }
                
                .footer { width: 100%; border-top: 1px solid #ccc; pt: 2mm; font-size: 8pt; color: #555; margin-top: 3mm;}
            </style>
        `;
        
        const html = `
            <html>
            <head><title>Print Label - ${form.name}</title>${styles}</head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="company-name">${settings.companyName || 'COMPANY NAME'}</div>
                    </div>
                    
                    <div class="product-name">${form.name}</div>
                    
                    ${form.labelInfo ? `<div class="info">${form.labelInfo}</div>` : ''}
                    
                    <div class="price-box">
                        <div class="price-label">ЦЕНА / PRICE</div>
                        <div class="price-main">${priceDisplay} <span style="font-size: 20pt;">ЛВ.</span></div>
                        <div class="price-sub">${liveEur} EUR</div>
                    </div>
                    
                    ${form.barcode ? `
                    <div class="barcode-box">
                        <div class="barcode-lines"></div>
                        <div class="barcode-text">${form.barcode}</div>
                    </div>
                    ` : ''}
                    
                    <div class="footer">
                        ${settings.companyEmail ? `Email: ${settings.companyEmail}` : ''}
                        ${settings.companyEmail && settings.companyPhone ? ' | ' : ''}
                        ${settings.companyPhone ? `Tel: ${settings.companyPhone}` : ''}
                    </div>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    // Tab Button Styles
    const tabClass = (tab: 'products' | 'settings') => 
        `px-4 py-2 font-medium rounded-t-lg transition-colors border-t border-x ${
            activeTab === tab ? 'bg-white text-blue-600 border-gray-200 -mb-px' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
        }`;

    const getSafePriceDisplay = () => {
        const val = parseFloat(form.priceBgn.replace(',', '.'));
        return isNaN(val) ? '0.00' : val.toFixed(2);
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
            {/* TAB HEADER */}
            <div className="flex border-b bg-gray-50 px-4 pt-4 gap-2">
                <button onClick={() => setActiveTab('products')} className={tabClass('products')}>
                    ПРОДУКТИ / PRODUCTS
                </button>
                <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>
                    НАСТРОЙКИ НА ФИРМА / SETTINGS
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'products' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* LEFT: Form */}
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Детайли за продукта</h4>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Име / Name</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Цена / Price (BGN)</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={form.priceBgn} onChange={e => setForm({...form, priceBgn: e.target.value})} placeholder="0.00" />
                                    <p className="text-blue-600 text-sm font-bold mt-1 text-right">≈ {liveEur} EUR</p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Баркод / Barcode</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Инфо / Label Info</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={form.labelInfo} onChange={e => setForm({...form, labelInfo: e.target.value})} />
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <button onClick={saveProduct} className="w-full py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 flex justify-center items-center gap-2 transition-colors">
                                    <span>💾</span> ЗАПАЗИ / SAVE
                                </button>
                                <button onClick={clearProductForm} className="w-full py-2 bg-white border text-gray-700 font-semibold rounded hover:bg-gray-100 flex justify-center items-center gap-2 transition-colors">
                                    <span>🧹</span> ИЗЧИСТИ / CLEAR
                                </button>
                                <button onClick={deleteProduct} disabled={!form.id} className="w-full py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-colors">
                                    <span>❌</span> ИЗТРИЙ / DELETE
                                </button>
                                
                                <hr className="my-4"/>
                                
                                <button onClick={() => setShowPreview(true)} disabled={!form.name || !form.priceBgn} className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-colors">
                                    <span>🏷️</span> ПРЕГЛЕД И ПЕЧАТ
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Table */}
                        <div className="lg:col-span-2 border rounded overflow-hidden flex flex-col h-full">
                            <div className="bg-gray-100 p-2 font-bold text-gray-600 text-sm border-b">Налични продукти</div>
                            <div className="overflow-auto flex-1 max-h-[500px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 sticky top-0 border-b">
                                        <tr>
                                            <th className="p-2 font-bold text-gray-700">Product</th>
                                            <th className="p-2 font-bold text-gray-700 text-right">BGN</th>
                                            <th className="p-2 font-bold text-gray-700 text-right">EUR</th>
                                            <th className="p-2 font-bold text-gray-700">Barcode</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => {
                                            const eur = (p.price / FIXED_RATE).toFixed(2);
                                            return (
                                                <tr key={p.id} onClick={() => handleProductSelect(p)} className={`cursor-pointer border-b hover:bg-blue-50 transition-colors ${form.id === p.id ? 'bg-blue-100' : ''}`}>
                                                    <td className="p-2 font-medium text-gray-800">{p.name}</td>
                                                    <td className="p-2 text-right font-mono">{p.price.toFixed(2)}</td>
                                                    <td className="p-2 text-right text-gray-500 font-mono">{eur}</td>
                                                    <td className="p-2 text-gray-500 font-mono text-xs">{p.barcode}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto bg-gray-50 p-8 rounded border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Данни за фирмата / Company Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Име на фирма / Company Name</label>
                                <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Имейл / Email</label>
                                <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={settings.companyEmail} onChange={e => setSettings({...settings, companyEmail: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Телефон / Phone</label>
                                <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={settings.companyPhone} onChange={e => setSettings({...settings, companyPhone: e.target.value})} />
                            </div>
                            <div className="pt-4 text-right">
                                <button onClick={saveSettings} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors">
                                    ЗАПАЗИ НАСТРОЙКИТЕ / SAVE SETTINGS
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
                    <div className="bg-white shadow-2xl rounded overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPreview(false)} className="absolute top-2 right-2 bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 z-10">&times;</button>
                        
                        {/* LABEL PREVIEW CANVAS MIMIC */}
                        <div className="flex-1 overflow-auto bg-gray-200 p-8 flex justify-center">
                            <div className="bg-white text-black relative flex flex-col items-center p-6 text-center shadow-lg" 
                                style={{ width: '400px', height: '600px', border: '1px solid black' }}> 
                                
                                {/* 1. Header: Company */}
                                <div className="w-full border-b border-gray-400 pb-2 mb-4">
                                    <h2 className="text-xl font-bold text-gray-800 uppercase">{settings.companyName || 'Company Name'}</h2>
                                </div>

                                {/* 2. Product Name */}
                                <h1 className="text-3xl font-extrabold text-blue-900 mb-4 leading-tight w-full break-words">
                                    {form.name}
                                </h1>

                                {/* 3. Info */}
                                {form.labelInfo && (
                                    <p className="italic text-gray-600 mb-6 text-lg border-b border-dashed w-full pb-4">
                                        Info: {form.labelInfo}
                                    </p>
                                )}

                                {/* 4. Price Box */}
                                <div className="border-4 border-gray-800 p-4 w-4/5 mb-auto mt-2 bg-white">
                                    <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">ЦЕНА / PRICE</div>
                                    <div className="text-5xl font-black text-red-600 mb-1 leading-none">
                                        {getSafePriceDisplay()} <span className="text-2xl align-top">ЛВ.</span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        ({liveEur} €)
                                    </div>
                                </div>

                                {/* 5. Barcode Simulation */}
                                {form.barcode && (
                                    <div className="mb-6 w-full mt-4">
                                        <div className="h-12 w-3/4 mx-auto bg-[repeating-linear-gradient(90deg,black,black_2px,white_2px,white_4px)] mb-1"></div>
                                        <div className="font-mono text-xl tracking-widest">{form.barcode}</div>
                                    </div>
                                )}

                                {/* 6. Footer */}
                                <div className="w-full border-t border-gray-400 pt-2 mt-2 text-gray-600 text-sm">
                                    {settings.companyEmail ? `Email: ${settings.companyEmail}` : ''} 
                                    {settings.companyEmail && settings.companyPhone ? ' | ' : ''}
                                    {settings.companyPhone ? `Tel: ${settings.companyPhone}` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-100 p-4 border-t flex justify-between items-center">
                            <div className="text-xs text-gray-500">Preview Scale: 100mm x 150mm</div>
                            <button onClick={handlePrintLabel} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md flex items-center gap-2">
                                <span>🖨️</span> PRINT LABEL / ПЕЧАТ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManager;
