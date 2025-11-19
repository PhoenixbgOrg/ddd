import React, { useState, useEffect, useCallback } from 'react';
import type { Batch } from '../types';
import type { CurrentUser } from '../App';

const DEFAULT_UFI = 'GWF2-21D4-PKJ6-VKNW';
const DEFAULT_FORMULATION_NUMBER = 189123930;

interface BatchHistoryProps {
    onLoadBatch?: (batchId: string) => void;
    currentUser: CurrentUser;
}

const BatchHistory: React.FC<BatchHistoryProps> = ({ onLoadBatch, currentUser }) => {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [isTest, setIsTest] = useState(false);
    const [approvalOrder, setApprovalOrder] = useState('');
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    const loadBatches = useCallback(() => {
        try {
            const stored = localStorage.getItem('ddd_batches');
            if (stored) {
                let loadedBatches: Batch[] = JSON.parse(stored);
                let needsUpdate = false;
                
                loadedBatches = loadedBatches.map(b => {
                    if (b.ufi === undefined || b.formulationNumber === undefined) {
                        needsUpdate = true;
                        return { ...b, ufi: DEFAULT_UFI, formulationNumber: DEFAULT_FORMULATION_NUMBER };
                    }
                    return b;
                });

                if (needsUpdate) {
                    localStorage.setItem('ddd_batches', JSON.stringify(loadedBatches));
                }
                
                setBatches(loadedBatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
        } catch (error) {
            console.error("Failed to load batches", error);
        }
    }, []);

    useEffect(() => {
        loadBatches();
        const handleStorageUpdate = (event: StorageEvent) => {
            if (event.key === 'ddd_batches') {
                loadBatches();
            }
        };
        window.addEventListener('storage', handleStorageUpdate);
        return () => {
            window.removeEventListener('storage', handleStorageUpdate);
        };
    }, [loadBatches]);
    
    const exportToCsv = () => {
        if(batches.length === 0) return;

        let headers = [
            'Дата', 'Код на партида', 'Тип', 'Брой таблетки', 'Тегло на таблетка (g)', 
            'Статус', 'Оператор', 'Одобрил', 'UFI', 'Бележки', 'Брой редакции',
            'Тестова', 'Заповед за тест', 'Одобрил тест', 'Дата на одобрение'
        ];
        
        if (currentUser.role === 'Администратор') {
            headers.splice(9, 0, 'Себестойност', 'Себестойност/таблетка');
        }
        
        const rows = batches.map(b => {
            let row = [
                `"${new Date(b.createdAt).toLocaleString('bg-BG')}"`,
                `"${b.batchName}"`,
                `"${b.batchType}"`,
                b.tabletCount,
                b.tabletWeight.toFixed(3),
                `"${b.status}"`,
                `"${b.operator}"`,
                `"${b.approvedBy}"`,
                `"${b.ufi}"`,
                `"${(b.notes || '').replace(/"/g, '""')}"`,
                b.editHistory?.length || 0,
                b.isTestBatch ? 'Да' : 'Не',
                `"${b.testApprovalOrderNumber || ''}"`,
                `"${b.testApprovedBy || ''}"`,
                b.testApprovedAt ? `"${new Date(b.testApprovedAt).toLocaleString('bg-BG')}"` : '""',
            ];
            
            if (currentUser.role === 'Администратор') {
                row.splice(9, 0, b.totalCost.toFixed(2), b.costPerTablet.toFixed(4));
            }
            return row.join(',');
        });
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // \uFEFF for BOM to support Cyrillic in Excel
            + headers.join(',') + "\n" 
            + rows.join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `batch_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenManageModal = (batch: Batch) => {
        setEditingBatch(batch);
        setIsTest(batch.isTestBatch || false);
        setApprovalOrder(batch.testApprovalOrderNumber || '');
    };

    const handleSaveTestStatus = () => {
        if (!editingBatch) return;

        if (isTest && !approvalOrder.trim()) {
            alert('Моля, въведете номер на заповед за одобрение на тестова партида.');
            return;
        }

        const updatedBatches = batches.map(b => {
            if (b.id === editingBatch.id) {
                if (isTest) {
                    return {
                        ...b,
                        isTestBatch: true,
                        testApprovalOrderNumber: approvalOrder.trim(),
                        testApprovedBy: currentUser.name,
                        testApprovedAt: new Date().toISOString(),
                    };
                } else {
                    const { testApprovalOrderNumber, testApprovedBy, testApprovedAt, ...rest } = b;
                    return { ...rest, isTestBatch: false };
                }
            }
            return b;
        });

        localStorage.setItem('ddd_batches', JSON.stringify(updatedBatches));
        setBatches(updatedBatches);
        setEditingBatch(null);
    };

    const toggleExpand = (batchId: string) => {
        setExpandedBatchId(prev => prev === batchId ? null : batchId);
    };


    const isAdmin = currentUser.role === 'Администратор';
    const colSpan = isAdmin ? 12 : 10;

    return (
        <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow-lg">
             {editingBatch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingBatch(null)}>
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">Управление на партида: <span className="font-mono">{editingBatch.id}</span></h3>
                        <p className="text-sm mb-4 text-gray-600">Промяната на статуса на тестова партида се записва с вашето име и текуща дата.</p>
                        
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isTest}
                                    onChange={e => setIsTest(e.target.checked)}
                                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="font-medium text-gray-800">Маркирай като тестова партида</span>
                            </label>

                            <div>
                                <label htmlFor="approvalOrder" className={`block text-sm font-medium mb-1 ${isTest ? 'text-gray-700' : 'text-gray-400'}`}>
                                    Номер на заповед за одобрение (задължително)
                                </label>
                                <input
                                    id="approvalOrder"
                                    type="text"
                                    value={approvalOrder}
                                    onChange={e => setApprovalOrder(e.target.value)}
                                    disabled={!isTest}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={isTest ? 'Напр. ЗП-123/24.01.2024' : ''}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setEditingBatch(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Отказ</button>
                            <button onClick={handleSaveTestStatus} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Запази</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">История на партидите</h2>
                <button 
                    onClick={exportToCsv} 
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    disabled={batches.length === 0}
                >
                    Експорт в CSV
                </button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Дата</th>
                            <th className="px-4 py-3">Код на партида</th>
                            <th className="px-4 py-3">Тип</th>
                            <th className="px-4 py-3">Брой</th>
                            <th className="px-4 py-3">Статус</th>
                            <th className="px-4 py-3">Тестова</th>
                            <th className="px-4 py-3">Оператор</th>
                            <th className="px-4 py-3">Одобрил</th>
                            {isAdmin && (
                                <>
                                    <th className="px-4 py-3">Себестойност</th>
                                    <th className="px-4 py-3">Себестойност/табл.</th>
                                </>
                            )}
                            <th className="px-4 py-3">UFI</th>
                            <th className="px-4 py-3">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.length > 0 ? batches.map(batch => (
                            <React.Fragment key={batch.id}>
                                <tr className={`border-b hover:bg-gray-50 ${expandedBatchId === batch.id ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-4 py-2">{new Date(batch.createdAt).toLocaleString('bg-BG')}</td>
                                    <td className="px-4 py-2 font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            {batch.batchName}
                                            {batch.editHistory && batch.editHistory.length > 0 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(batch.id); }}
                                                    className="focus:outline-none rounded-full hover:bg-yellow-100 p-1 transition-colors"
                                                    title={`Редактирана ${batch.editHistory.length} пъти. Натисни за детайли.`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">{batch.batchType}</td>
                                    <td className="px-4 py-2">{batch.tabletCount} бр.</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            batch.status === 'Готова' ? 'bg-green-100 text-green-800' :
                                            batch.status === 'Брак' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                     <td className="px-4 py-2">
                                        {batch.isTestBatch ? (
                                            <span className="text-red-600 font-semibold" title={`Заповед № ${batch.testApprovalOrderNumber}`}>Да</span>
                                        ) : (
                                            <span>Не</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{batch.operator}</td>
                                    <td className="px-4 py-2">{batch.approvedBy}</td>
                                    {isAdmin && (
                                        <>
                                            <td className="px-4 py-2">{batch.totalCost.toFixed(2)} лв.</td>
                                            <td className="px-4 py-2">{batch.costPerTablet.toFixed(4)} лв.</td>
                                        </>
                                    )}
                                    <td className="px-4 py-2 font-mono text-xs">{batch.ufi}</td>
                                    <td className="px-4 py-2 space-x-2">
                                        {onLoadBatch && (
                                            <button 
                                                onClick={() => onLoadBatch(batch.id)} 
                                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                            >
                                                Зареди
                                            </button>
                                        )}
                                         {isAdmin && (
                                            <button 
                                                onClick={() => handleOpenManageModal(batch)} 
                                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                            >
                                                Управление
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {expandedBatchId === batch.id && batch.editHistory && batch.editHistory.length > 0 && (
                                    <tr className="bg-gray-50 animate-fade-in">
                                        <td colSpan={colSpan} className="px-4 py-3 border-b border-gray-200 shadow-inner">
                                            <div className="pl-4 md:pl-10">
                                                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                    </svg>
                                                    История на редакциите
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left text-gray-600">
                                                        <thead>
                                                            <tr className="border-b border-gray-200">
                                                                <th className="py-1 pr-4 font-semibold">Дата</th>
                                                                <th className="py-1 pr-4 font-semibold">Потребител</th>
                                                                <th className="py-1 font-semibold">Причина</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batch.editHistory.map((edit, idx) => (
                                                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                                    <td className="py-1 pr-4 whitespace-nowrap">{new Date(edit.timestamp).toLocaleString('bg-BG')}</td>
                                                                    <td className="py-1 pr-4 font-medium text-blue-700 whitespace-nowrap">{edit.user}</td>
                                                                    <td className="py-1 italic">{edit.reason}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )) : (
                            <tr>
                                <td colSpan={colSpan} className="text-center py-4">Няма запазени партиди.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchHistory;