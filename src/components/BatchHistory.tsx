
import React, { useState, useEffect, useCallback } from 'react';
import type { Batch } from '../domain/types';
import type { CurrentUser } from './App';
import { storageService } from '../services/storageService';
import { csvService } from '../services/csvService';

interface BatchHistoryProps {
    onLoadBatch?: (batchId: string) => void;
    currentUser: CurrentUser;
}

const BatchHistory: React.FC<BatchHistoryProps> = ({ onLoadBatch, currentUser }) => {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [approvalOrder, setApprovalOrder] = useState('');
    
    const loadBatches = useCallback(() => {
        setBatches(storageService.getBatches().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, []);

    useEffect(() => {
        loadBatches();
        window.addEventListener('storage', loadBatches);
        return () => window.removeEventListener('storage', loadBatches);
    }, [loadBatches]);

    const handleExport = () => {
        csvService.exportToCsv(batches.map(b => ({
            ID: b.id, Type: b.batchType, Date: b.createdAt, Status: b.status, 
            Count: b.tabletCount, Cost: b.totalCost
        })), 'batches.csv');
    };
    
    const handleSaveTest = () => {
        if (!editingBatch) return;
        const updated = batches.map(b => b.id === editingBatch.id ? {
            ...b, isTestBatch: true, testApprovalOrderNumber: approvalOrder, testApprovedBy: currentUser.name
        } : b);
        storageService.saveBatches(updated);
        setBatches(updated);
        setEditingBatch(null);
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">История</h2>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">Export CSV</button>
            </div>
            {editingBatch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded w-96">
                        <h3>Одобрение Тестова Партида</h3>
                        <input value={approvalOrder} onChange={e => setApprovalOrder(e.target.value)} className="border p-2 w-full my-4" placeholder="Заповед №" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingBatch(null)} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                            <button onClick={handleSaveTest} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Дата</th><th className="p-2">ID</th><th className="p-2">Тип</th><th className="p-2">Статус</th><th className="p-2">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.map(b => (
                            <tr key={b.id} className="border-b hover:bg-gray-50">
                                <td className="p-2">{new Date(b.createdAt).toLocaleDateString()}</td>
                                <td className="p-2 font-mono">{b.batchName}</td>
                                <td className="p-2">{b.batchType}</td>
                                <td className="p-2">{b.status} {b.isTestBatch && <span className="text-red-500 font-bold">(TEST)</span>}</td>
                                <td className="p-2 space-x-2">
                                    {onLoadBatch && <button onClick={() => onLoadBatch(b.id)} className="text-blue-600">Зареди</button>}
                                    {currentUser.role === 'Администратор' && <button onClick={() => setEditingBatch(b)} className="text-green-600">Одобри</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchHistory;
