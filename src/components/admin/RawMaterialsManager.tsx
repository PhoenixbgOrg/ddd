
import React, { useState, useEffect } from 'react';
import type { RawMaterialDefinition, RawMaterialLot } from '../../domain/types';
import { storageService } from '../../services/storageService';
import { csvService } from '../../services/csvService';

const RawMaterialsManager: React.FC = () => {
    const [definitions, setDefinitions] = useState<RawMaterialDefinition[]>([]);
    const [lots, setLots] = useState<RawMaterialLot[]>([]);
    const [selDefId, setSelDefId] = useState<string | null>(null);

    useEffect(() => {
        setDefinitions(storageService.getRawMaterials());
        setLots(storageService.getRawMaterialLots());
    }, []);

    const handleExport = () => csvService.exportToCsv(definitions, 'materials.csv');
    const handleImport = () => {
        const text = prompt("Paste CSV content here:");
        if(!text) return;
        const imported = csvService.importFromCsv<RawMaterialDefinition>(text, row => ({
            id: row.id || `def-${Date.now()}`,
            name: row.name,
            isAllergen: row.isAllergen === 'true',
            activeHoursPerGram: parseFloat(row.activeHoursPerGram) || 0
        }));
        if(imported.length > 0) {
            storageService.saveRawMaterials([...definitions, ...imported]);
            setDefinitions(prev => [...prev, ...imported]);
            alert(`Imported ${imported.length} items.`);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Дефиниции</h3>
                    <div className="space-x-2">
                        <button onClick={handleImport} className="text-xs bg-gray-200 px-2 py-1 rounded">Import</button>
                        <button onClick={handleExport} className="text-xs bg-gray-200 px-2 py-1 rounded">Export</button>
                    </div>
                </div>
                <ul className="space-y-2 h-96 overflow-y-auto border p-2 rounded">
                    {definitions.map(d => (
                        <li key={d.id} onClick={() => setSelDefId(d.id)} className={`p-2 cursor-pointer rounded ${selDefId === d.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                            {d.name}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="text-lg font-bold mb-4">Партиди (LOTs)</h3>
                {selDefId ? (
                    <table className="w-full text-sm">
                        <thead><tr><th className="text-left">Lot#</th><th>Qty</th><th>Actions</th></tr></thead>
                        <tbody>
                            {lots.filter(l => l.definitionId === selDefId).map(lot => (
                                <tr key={lot.id} className="border-b">
                                    <td>{lot.lotNumber}</td>
                                    <td>{lot.availableGrams} / {lot.initialGrams}</td>
                                    <td><button className="text-red-600">X</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <div className="text-gray-500">Select a material definition</div>}
            </div>
        </div>
    );
};

export default RawMaterialsManager;
