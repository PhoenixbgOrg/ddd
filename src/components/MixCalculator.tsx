
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Batch, RawMaterialDefinition, RawMaterialLot, Recipe, Checklist, CompanySettings } from '../domain/types';
import type { CurrentUser } from './App';
import { storageService } from '../services/storageService';
import { calculateMix } from '../domain/mixDomain';

const DEFAULT_UFI = 'GWF2-21D4-PKJ6-VKNW';
const CHECKLIST_ITEMS = { mixing: 'Смесване', pressing: 'Пресоване', drying: 'Сушене', packaging: 'Опаковане', labeling: 'Етикетиране' };

interface MixCalculatorProps {
    currentUser: CurrentUser;
    batchToLoadId: string | null;
    onBatchLoaded: () => void;
}

const MixCalculator: React.FC<MixCalculatorProps> = ({ currentUser, batchToLoadId, onBatchLoaded }) => {
  const [batchName, setBatchName] = useState('');
  const [batchType, setBatchType] = useState('');
  const [status, setStatus] = useState('Планирана');
  const [tabletCount, setTabletCount] = useState(10);
  const [targetTabletWeight, setTargetTabletWeight] = useState(10);
  const [calculationResult, setCalculationResult] = useState<ReturnType<typeof calculateMix> | null>(null);
  
  const [savedBatches, setSavedBatches] = useState<Batch[]>([]);
  const [materialDefinitions, setMaterialDefinitions] = useState<RawMaterialDefinition[]>([]);
  const [materialLots, setMaterialLots] = useState<RawMaterialLot[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [hazardPictograms, setHazardPictograms] = useState<string[]>([]);
  const [loadedBatch, setLoadedBatch] = useState<Batch | null>(null);
  const [operator, setOperator] = useState(currentUser.name);
  const [approvedBy, setApprovedBy] = useState('');
  const [checklist, setChecklist] = useState<Checklist>({});
  const [notes, setNotes] = useState('');
  const [isTestBatch, setIsTestBatch] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => setOperator(currentUser.name), [currentUser.name]);

  const loadData = useCallback(() => {
      setSavedBatches(storageService.getBatches());
      setMaterialDefinitions(storageService.getRawMaterials());
      setMaterialLots(storageService.getRawMaterialLots());
      setRecipes(storageService.getRecipes());
      setSettings(storageService.getCompanySettings());
      // Async init of batch name if empty
      if(!batchName && !loadedBatch) {
          // We need to set a temporary one, real one generated on save or init
          setBatchName((storageService as any).getNextBatchId(storageService.getBatches()));
      }
  }, [batchName, loadedBatch]);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, [loadData]);

  // Load specific batch
  useEffect(() => {
    if (batchToLoadId) {
        const batch = savedBatches.find(b => b.id === batchToLoadId);
        if (batch) {
            setLoadedBatch(batch);
            setBatchName(batch.batchName);
            setBatchType(batch.batchType);
            setStatus(batch.status);
            setTabletCount(batch.tabletCount);
            setTargetTabletWeight(batch.tabletWeight);
            setHazardPictograms(batch.hazardPictograms);
            setOperator(batch.operator);
            setApprovedBy(batch.approvedBy);
            setChecklist(batch.checklist);
            setNotes(batch.notes || '');
            setIsTestBatch(batch.isTestBatch || false);
            setSelectedRecipeId(batch.recipeId);
            setIsLocked(batch.status === 'Готова' || batch.status === 'Брак');
        }
        onBatchLoaded();
    }
  }, [batchToLoadId, savedBatches, onBatchLoaded]);

  const handleCalculate = () => {
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (!recipe || !settings) return;
      
      const result = calculateMix(recipe, tabletCount, targetTabletWeight, materialDefinitions, materialLots, settings);
      setCalculationResult(result);
  };

  const handleRecipeSelect = (rid: string) => {
      setSelectedRecipeId(rid);
      const r = recipes.find(x => x.id === rid);
      if(r) {
          setBatchType(r.name);
          setHazardPictograms(r.hazardPictograms);
      }
  };

  const saveBatch = () => {
      if (!calculationResult && !loadedBatch) return alert('Моля, изчислете сместа първо.');
      if (!batchName.trim()) return alert('Липсва име на партида.');

      const ingredientsToSave = loadedBatch ? loadedBatch.ingredients : (calculationResult?.ingredients || []);
      const recipeIngs = loadedBatch ? loadedBatch.recipeIngredients : (calculationResult?.recipeIngredients || []);
      const finTotalCost = loadedBatch ? loadedBatch.totalCost : (calculationResult?.totalCost || 0);
      const finCostPerTab = loadedBatch ? loadedBatch.costPerTablet : (calculationResult?.costPerTablet || 0);
      const finCostPerPkg = loadedBatch ? loadedBatch.costPer25gPackage : (calculationResult?.costPer25gPackage || 0);
      const finSellPrice = loadedBatch ? loadedBatch.recommendedSellPrice : (calculationResult?.recommendedSellPrice || 0);

      // Inventory deduction logic
      let deduct = loadedBatch?.isInventoryDeducted || false;
      if (status === 'Готова' && !deduct) {
          if (window.confirm('Статус Готова. Изписване от склад?')) {
              const currentLots = [...materialLots];
              ingredientsToSave.forEach(ing => {
                  const l = currentLots.find(lot => lot.id === ing.rawMaterialLotId);
                  if (l) l.availableGrams -= ing.grams;
              });
              storageService.saveRawMaterialLots(currentLots);
              deduct = true;
          }
      }

      const newBatch: Batch = {
          id: batchName,
          batchName,
          batchType,
          status,
          recipeId: selectedRecipeId,
          tabletCount,
          tabletWeight: targetTabletWeight,
          ingredients: ingredientsToSave,
          recipeIngredients: recipeIngs,
          totalCost: finTotalCost,
          costPerTablet: finCostPerTab,
          costPer25gPackage: finCostPerPkg,
          recommendedSellPrice: finSellPrice,
          totalActiveHours: calculationResult?.totalActiveHours || 0,
          createdAt: loadedBatch?.createdAt || new Date().toISOString(),
          hazardPictograms,
          isInventoryDeducted: deduct,
          operator,
          approvedBy,
          checklist,
          notes,
          isTestBatch,
          testApprovalOrderNumber: loadedBatch?.testApprovalOrderNumber,
          testApprovedBy: loadedBatch?.testApprovedBy,
          testApprovedAt: loadedBatch?.testApprovedAt,
          labelDurationMinutesPerTablet: loadedBatch?.labelDurationMinutesPerTablet,
          labelDurationMinutesPerTabletOverride: loadedBatch?.labelDurationMinutesPerTabletOverride,
          ufi: DEFAULT_UFI,
          formulationNumber: 123456
      };

      // If it's a new batch, verify ID uniqueness or just save
      const all = storageService.getBatches();
      const filtered = all.filter(b => b.id !== newBatch.id);
      storageService.saveBatches([...filtered, newBatch]);
      
      alert('Партида записана.');
      setLoadedBatch(newBatch);
      setIsLocked(newBatch.status === 'Готова' || newBatch.status === 'Брак');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input value={batchName} readOnly className="p-2 border bg-gray-100 rounded" placeholder="Batch ID" />
            <div className="flex gap-2">
                <button onClick={() => {setLoadedBatch(null); setCalculationResult(null); setIsLocked(false); setBatchName(''); }} className="px-4 py-2 bg-green-600 text-white rounded w-full">Нова партида</button>
            </div>
            {isLocked && <div className="bg-yellow-100 p-2 text-center rounded text-yellow-800 font-bold">Заключена</div>}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select value={selectedRecipeId} onChange={e => handleRecipeSelect(e.target.value)} disabled={isLocked || !!loadedBatch} className="p-2 border rounded">
                <option value="">-- Избери рецепта --</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input value={batchType} onChange={e => setBatchType(e.target.value)} className="p-2 border rounded" placeholder="Тип продукт" />
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-4">
            <input type="number" value={tabletCount} onChange={e => setTabletCount(Number(e.target.value))} disabled={isLocked} className="p-2 border rounded" placeholder="Брой" />
            <select value={targetTabletWeight} onChange={e => setTargetTabletWeight(Number(e.target.value))} disabled={isLocked} className="p-2 border rounded">
                {[10, 15, 20, 25, 30].map(w => <option key={w} value={w}>{w} g</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} disabled={isLocked} className="p-2 border rounded">
                {['Планирана', 'В процес', 'Готова', 'Брак'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={operator} onChange={e => setOperator(e.target.value)} className="p-2 border rounded" placeholder="Оператор" />
        </div>

        <div className="text-center mb-6">
            <button onClick={handleCalculate} disabled={!selectedRecipeId || isLocked} className="px-8 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-400">Изчисли</button>
        </div>

        {calculationResult && (
            <div className="bg-indigo-50 p-4 rounded mb-4 border border-indigo-100">
                <h3 className="font-bold mb-2 text-indigo-800">Резултати (Себестойност: {calculationResult.totalCost.toFixed(2)} лв)</h3>
                {calculationResult.availabilityIssues.length > 0 && <div className="text-red-600 mb-2 font-bold">Внимание: Недостатъчни наличности!</div>}
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left"><th className="p-1">Съставка</th><th className="text-right p-1">Грамаж</th><th className="text-right p-1">Цена</th></tr>
                    </thead>
                    <tbody>
                        {calculationResult.ingredients.map(ing => (
                            <tr key={ing.id} className="border-b border-indigo-200">
                                <td className="p-1">{ing.name}</td>
                                <td className="text-right p-1">{ing.grams.toFixed(2)} g</td>
                                <td className="text-right p-1">{ing.price.toFixed(3)} лв</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-2 text-right text-xs text-gray-500">
                    * Цените са НЕТНИ (без ДДС)
                </div>
            </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
            <div className="border p-4 rounded">
                <h4 className="font-bold mb-2">Чеклист</h4>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CHECKLIST_ITEMS).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2">
                            <input type="checkbox" checked={!!checklist[k]} onChange={() => setChecklist(p => ({...p, [k]: !p[k]}))} disabled={isLocked} />
                            <span className="text-sm">{l}</span>
                        </label>
                    ))}
                </div>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="p-2 border rounded w-full h-full" placeholder="Бележки..." />
        </div>
        
        <div className="flex justify-between items-center mt-6">
             <label className="flex items-center gap-2">
                 <input type="checkbox" checked={isTestBatch} onChange={e => setIsTestBatch(e.target.checked)} disabled={isLocked} />
                 <span className="font-bold text-sm">Тестова партида</span>
             </label>
             <button onClick={saveBatch} disabled={!calculationResult && !loadedBatch} className="px-6 py-2 bg-blue-600 text-white rounded">Запази</button>
        </div>
    </div>
  );
};

export default MixCalculator;
