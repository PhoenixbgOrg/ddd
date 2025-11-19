
import React, { useState, useEffect } from 'react';
import type { ReprintLog } from '../../domain/types';
import { storageService } from '../../services/storageService';

const ReprintLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<ReprintLog[]>([]);

    useEffect(() => {
        setLogs(storageService.getReprintLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, []);

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">Дневник Препечатки</h3>
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100"><tr><th className="p-2">Дата</th><th className="p-2">Продукт</th><th className="p-2">Партида</th><th className="p-2">Служител</th><th className="p-2">Причина</th></tr></thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id} className="border-b">
                            <td className="p-2">{new Date(l.timestamp).toLocaleString()}</td>
                            <td className="p-2">{l.productName}</td>
                            <td className="p-2">{l.batchCode}</td>
                            <td className="p-2">{l.reprintedBy}</td>
                            <td className="p-2">{l.reason}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReprintLogViewer;
