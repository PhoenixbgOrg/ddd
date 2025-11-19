import React, { useState, useEffect, useCallback } from 'react';
import type { ReprintLog } from '../../types';

const ReprintLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<ReprintLog[]>([]);

    const loadLogs = useCallback(() => {
        try {
            const stored = localStorage.getItem('ddd_reprint_logs');
            if (stored) {
                // Sort logs by newest first
                setLogs(JSON.parse(stored).sort((a: ReprintLog, b: ReprintLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            }
        } catch (error) {
            console.error("Failed to load reprint logs", error);
        }
    }, []);

    useEffect(() => {
        loadLogs();
        const handleStorageUpdate = (event: StorageEvent) => {
            if (event.key === 'ddd_reprint_logs') {
                loadLogs();
            }
        };
        window.addEventListener('storage', handleStorageUpdate);
        return () => {
            window.removeEventListener('storage', handleStorageUpdate);
        };
    }, [loadLogs]);

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Дневник на препечатките</h3>
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Дата и час</th>
                            <th className="px-4 py-3">Име на продукт</th>
                            <th className="px-4 py-3">Партида (LOT)</th>
                            <th className="px-4 py-3">Служител</th>
                            <th className="px-4 py-3">Причина</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? logs.map(log => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString('bg-BG')}</td>
                                <td className="px-4 py-2 font-medium text-gray-900">{log.productName}</td>
                                <td className="px-4 py-2">{log.batchCode}</td>
                                <td className="px-4 py-2">{log.reprintedBy}</td>
                                <td className="px-4 py-2">{log.reason}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-4">Няма записи в дневника.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReprintLogViewer;
