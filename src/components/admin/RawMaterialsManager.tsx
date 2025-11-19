
import React, { useState, useEffect, useCallback } from 'react';
import type { RawMaterialDefinition, RawMaterialLot, CompanySettings } from '../../domain/types';
import { storageService } from '../../services/storageService';

const RawMaterialsManager: React.FC = () => {
    const [definitions, setDefinitions] = useState<RawMaterialDefinition[]>([]);
    const [lots, setLots] = useState<RawMaterialLot[]>([]);
    const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
    const [settings, setSettings] = useState<CompanySettings | null>(null);

    const loadData = useCallback(() => {
        try {
            setDefinitions(storageService.getRawMaterials());
            setLots(storageService.getRawMaterialLots());
            setSettings(storageService.getCompanySettings());
        } catch (error) {
            console.error("Failed to load raw materials data", error);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const displayedLots = selectedDefinitionId ? lots.filter(lot => lot.definitionId === selectedDefinitionId) : [];

    const saveDefinitions = (newDefs: RawMaterialDefinition[]) => {
        storageService.saveRawMaterials(newDefs);
        setDefinitions(newDefs);
    }
    const saveLots = (newLots: RawMaterialLot[]) => {
        storageService.saveRawMaterialLots(newLots);
        setLots(newLots);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DefinitionManager 
                definitions={definitions}
                saveDefinitions={saveDefinitions}
                selectedDefinitionId={selectedDefinitionId}
                setSelectedDefinitionId={setSelectedDefinitionId}
                allLots={lots}
                saveLots={saveLots}
            />
            <LotManager 
                lots={displayedLots}
                allLots={lots}
                saveLots={saveLots}
                selectedDefinitionId={selectedDefinitionId}
                selectedDefinitionName={definitions.find(d => d.id === selectedDefinitionId)?.name}
                settings={settings}
            />
        </div>
    );
};


// Sub-component for Definitions
interface DefinitionManagerProps {
    definitions: RawMaterialDefinition[];
    saveDefinitions: (defs: RawMaterialDefinition[]) => void;
    selectedDefinitionId: string | null;
    setSelectedDefinitionId: (id: string | null) => void;
    allLots: RawMaterialLot[];
    saveLots: (lots: RawMaterialLot[]) => void;
}
const DefinitionManager: React.FC<DefinitionManagerProps> = ({ definitions, saveDefinitions, selectedDefinitionId, setSelectedDefinitionId, allLots, saveLots }) => {
    const [form, setForm] = useState<Omit<RawMaterialDefinition, 'id'>>({ name: '', isAllergen: false, activeHoursPerGram: 0 });
    const [isEditing, setIsEditing] = useState<string|null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!form.name) return;

        if(isEditing) {
            saveDefinitions(definitions.map(d => d.id === isEditing ? {...form, id: isEditing} : d));
        } else {
            const newDef: RawMaterialDefinition = { ...form, id: `def-${Date.now()}` };
            saveDefinitions([...definitions, newDef]);
            
            // Auto-create a default 200g lot for the new material
            const newLot: RawMaterialLot = {
                id: `${newDef.id}-default-lot`,
                definitionId: newDef.id,
                lotNumber: 'DEFAULT',
                supplier: 'System',
                receivedDate: new Date().toISOString().split('T')[0],
                expiryDate: '2099-12-31',
                initialGrams: 200,
                availableGrams: 200,
                pricePerKg: 0,
            };
            saveLots([...allLots, newLot]);
        }
        setForm({ name: '', isAllergen: false, activeHoursPerGram: 0 });
        setIsEditing(null);
    }
    
    const handleEdit = (def: RawMaterialDefinition) => {
        setIsEditing(def.id);
        setForm({name: def.name, isAllergen: def.isAllergen, activeHoursPerGram: def.activeHoursPerGram});
    }
    
    const handleDelete = (id: string) => {
        if(window.confirm('Сигурни ли сте? Това ще изтрие дефиницията и всички свързани с нея партиди!')) {
            saveDefinitions(definitions.filter(d => d.id !== id));
        }
    }

    return (
        <div className="space-y-4">
            <div className="border border-gray-300 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">{isEditing ? 'Редакция на дефиниция' : 'Нова дефиниция на суровина'}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                     <input type="text" placeholder="Име на суровина" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                     <input type="number" step="0.01" placeholder="Активни часове / грам" value={form.activeHoursPerGram} onChange={e => setForm({...form, activeHoursPerGram: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                     <label className="flex items-center gap-2"><input type="checkbox" checked={form.isAllergen} onChange={e => setForm({...form, isAllergen: e.target.checked})} /> Потенциален алерген</label>
                     <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{isEditing ? 'Запази' : 'Добави'}</button>
                     {isEditing && <button type="button" onClick={() => {setIsEditing(null); setForm({name:'', isAllergen: false, activeHoursPerGram: 0})}} className="ml-2 px-4 py-2 bg-gray-200 rounded-md">Отказ</button>}
                </form>
            </div>
            <div>
                 <h3 className="text-xl font-semibold mb-2">Списък с дефиниции</h3>
                 <ul className="space-y-2">
                     {definitions.map(def => (
                         <li key={def.id} onClick={() => setSelectedDefinitionId(def.id)}
                            className={`p-3 rounded-md cursor-pointer border ${selectedDefinitionId === def.id ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-50'}`}>
                             <div className="flex justify-between items-center">
                                 <span className="font-medium">{def.name}</span>
                                 <div className="space-x-2">
                                     <button onClick={(e) => {e.stopPropagation(); handleEdit(def)}} className="text-sm text-blue-600">Редакция</button>
                                     <button onClick={(e) => {e.stopPropagation(); handleDelete(def.id)}} className="text-sm text-red-600">Изтрий</button>
                                 </div>
                             </div>
                         </li>
                     ))}
                 </ul>
            </div>
        </div>
    );
}

// Sub-component for Lots
interface LotManagerProps {
    lots: RawMaterialLot[];
    allLots: RawMaterialLot[];
    saveLots: (lots: RawMaterialLot[]) => void;
    selectedDefinitionId: string | null;
    selectedDefinitionName?: string;
    settings: CompanySettings | null;
}
const LotManager: React.FC<LotManagerProps> = ({ lots, allLots, saveLots, selectedDefinitionId, selectedDefinitionName, settings }) => {
    const defaultFormState = { lotNumber: '', supplier: '', receivedDate: new Date().toISOString().split('T')[0], expiryDate: '', initialGrams: 0, priceDisplay: 0 };
    const [form, setForm] = useState(defaultFormState);
    const [isEditing, setIsEditing] = useState<string|null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedDefinitionId || !form.lotNumber || form.initialGrams <= 0) {
            alert("Моля, попълнете LOT номер и начално количество (>0).");
            return;
        }
        
        // Logic: The internal 'pricePerKg' of RawMaterialLot is always NET.
        // If settings.rawPricesIncludeVat is true, the input 'priceDisplay' is Gross, so we convert.
        // If settings.rawPricesIncludeVat is false, input is Net, so we store as is.
        let netPrice = form.priceDisplay;
        if (settings && settings.rawPricesIncludeVat) {
            netPrice = form.priceDisplay / (1 + settings.vatRate);
        }

        if(isEditing) {
            saveLots(allLots.map(l => l.id === isEditing ? {
                ...l, ...form, 
                initialGrams: Number(form.initialGrams), 
                pricePerKg: Number(netPrice) 
            } : l));
        } else {
            saveLots([...allLots, { 
                ...form, 
                id: `lot-${Date.now()}`,
                definitionId: selectedDefinitionId,
                initialGrams: Number(form.initialGrams),
                availableGrams: Number(form.initialGrams),
                pricePerKg: Number(netPrice)
            }]);
        }
        setForm(defaultFormState);
        setIsEditing(null);
    }
    
    const handleEdit = (lot: RawMaterialLot) => {
        setIsEditing(lot.id);
        // When editing, we must convert the stored Net price back to displayed price (Net or Gross)
        let displayPrice = lot.pricePerKg;
        if (settings && settings.rawPricesIncludeVat) {
            displayPrice = lot.pricePerKg * (1 + settings.vatRate);
        }
        
        setForm({
            lotNumber: lot.lotNumber, 
            supplier: lot.supplier, 
            receivedDate: lot.receivedDate, 
            expiryDate: lot.expiryDate, 
            initialGrams: lot.initialGrams, 
            priceDisplay: parseFloat(displayPrice.toFixed(2))
        });
    }

    const handleDelete = (id: string) => {
        if(window.confirm('Сигурни ли сте, че искате да изтриете тази партида суровина?')) {
            saveLots(allLots.filter(l => l.id !== id));
        }
    }

    if (!selectedDefinitionId) {
        return <div className="flex items-center justify-center h-full text-gray-500">Моля, изберете дефиниция на суровина, за да видите/добавите партиди.</div>
    }
    
    const priceLabel = settings?.rawPricesIncludeVat ? "Цена (с ДДС) лв/кг" : "Цена (без ДДС) лв/кг";

    return (
        <div className="space-y-4">
            <div style={{borderColor: 'red'}} className="border-2 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-red-700">{isEditing ? 'Редакция на партида' : `Нова партида за "${selectedDefinitionName}"`}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="LOT номер" value={form.lotNumber} onChange={e => setForm({...form, lotNumber: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        <input type="text" placeholder="Доставчик" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        <input type="number" step="0.01" placeholder="Количество (g)" value={form.initialGrams} onChange={e => setForm({...form, initialGrams: Number(e.target.value)})} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">{priceLabel}</label>
                            <input type="number" step="0.01" placeholder="0.00" value={form.priceDisplay} onChange={e => setForm({...form, priceDisplay: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        
                        <div><label className="text-sm">Дата на получаване:</label><input type="date" value={form.receivedDate} onChange={e => setForm({...form, receivedDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"/></div>
                        <div><label className="text-sm">Срок на годност:</label><input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"/></div>
                    </div>
                     <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md">{isEditing ? 'Запази' : 'Добави партида'}</button>
                     {isEditing && <button type="button" onClick={() => {setIsEditing(null); setForm(defaultFormState)}} className="ml-2 px-4 py-2 bg-gray-200 rounded-md">Отказ</button>}
                </form>
            </div>
            <div>
                 <h3 className="text-xl font-semibold mb-2">Налични партиди за "{selectedDefinitionName}"</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-2 py-2">LOT#</th>
                                <th className="px-2 py-2">Наличност</th>
                                <th className="px-2 py-2">Цена (Нетна)</th>
                                <th className="px-2 py-2">Годно до</th>
                                <th className="px-2 py-2">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.map(lot => (
                                <tr key={lot.id} className="border-b">
                                    <td className="px-2 py-1 font-medium">{lot.lotNumber}</td>
                                    <td className="px-2 py-1">{lot.availableGrams.toFixed(2)} / {lot.initialGrams.toFixed(2)} g</td>
                                    <td className="px-2 py-1">{lot.pricePerKg.toFixed(2)} лв/кг</td>
                                    <td className="px-2 py-1">{lot.expiryDate}</td>
                                    <td className="px-2 py-1 space-x-2">
                                        <button onClick={() => handleEdit(lot)} className="text-sm text-blue-600">Ред.</button>
                                        <button onClick={() => handleDelete(lot.id)} className="text-sm text-red-600">Изтр.</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
}

export default RawMaterialsManager;
