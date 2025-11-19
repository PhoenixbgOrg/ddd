import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Batch, RawMaterialDefinition, RawMaterialLot, Recipe, RecipeIngredient, Checklist, BatchIngredient, BatchEditLog } from '../types';
import type { CurrentUser } from '../App';
import { ensureDefaultRawMaterialsAndLots } from '../dataDefaults';

const GHS_PICTOGRAMS: Record<string, { label: string; svg: string }> = {
    GHS02: {
      label: 'Запалимо',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M63.3 31.5c-2.3-5.2-6.2-7.8-11.8-7.8-5.5 0-9.5 2.6-11.8 7.8-2 4.5-2.2 9.5-.7 14.8 2.2 7.7 7.7 11.6 12.5 11.6s10.3-3.9 12.5-11.6c1.5-5.3 1.3-10.3-.7-14.8zm-1.8 13.3c-1.8 6.4-6 9.6-10.7 9.6-4.7 0-8.9-3.2-10.7-9.6-1.3-4.5-1-8.5.5-12.2 1.8-4.1 5-6.2 10.2-6.2s8.4 2.1 10.2 6.2c1.5 3.7 1.8 7.7.5 12.2zM50 55.4c-8.8 0-14.5-7.3-14.5-15.6 0-5.6 3.3-10.4 8.7-13.4-2.2 5-1.4 11.2 2.3 15.6 3.1 3.7 7.3 5.6 11.9 5.6 2.4 0 4.6-.6 6.5-1.9-2.6 5.8-7.9 9.7-14.9 9.7z" fill="black"/></svg>`,
    },
    GHS07: {
      label: 'Дразнещо',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M45.8 21.3h8.4v37.5h-8.4V21.3zm4.2 51.9c-2.9 0-5.3-2.4-5.3-5.3s2.4-5.3 5.3-5.3 5.3 2.4 5.3 5.3-2.4 5.3-5.3 5.3z" fill="black"/></svg>`,
    },
    GHS08: {
      label: 'Опасност за здравето',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M50 25c-9.2 0-17.3 4.5-2.2.4 11.6-1.5 2.1-2.8 4.4-3.8 6.9L38.3 58l-5.6 5.6-14.1-14.1c-1.1 2.5-1.9 5.1-2.2 7.9h11.1v8H12.1c.3 2.7 1.1 5.4 2.2 7.9l14.1-14.1 5.6 5.6-14.5 14.5c4.6 6.8 12.3 11.3 20.9 11.3s16.3-4.5 20.9-11.3L61.7 65.1l5.6-5.6 14.1 14.1c1.1-2.5 1.9 5.1 2.2-7.9H72.5v-8h11.1c-.3-2.7-1.1-5.4-2.2-7.9L67.3 58l-5.6-5.6 14.5-14.5c-5.1-7.1-13.2-11.6-22.4-11.6zM50 33c3.8 0 7.3 1.2 10.2 3.4l-7.1 7.1-8.5-8.5v-10c2.1.7 4.1 1.2 6.4 1.2zm-12.7 7.7L42.9 46l-7.1 7.1c-2.2-2.9-3.4-6.4-3.4-10.2 0-2.3.5-4.5 1.2-6.4l-6.4 6.4zm22.9 1.1l-10-10 10-10v20zm-15.6 4.1l8.5 8.5L42.9 65c-3.8 0-7.3-1.2-10.2-3.4l7.1-7.1 8.5-8.5z" fill="black"/></svg>`,
    },
    GHS09: {
      label: 'Опасно за околната среда',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M60.1 23.3L48.2 45.4 39.9 23.3h-19l17.2 46.7-6.2-1.9-3.1 6.3 11.2 3.4 11.2-3.4-3.1-6.3-6.2 1.9L69.1 23.3zM25.9 76.7l10.7-3.4c-2.3-1-4.3-2.4-6-4.2l-4.7 1.5zm16.5-19.4c.5-1 .8-2 .8-3.1s-.3-2.1-.8-3.1l-4.2 1.3c.3.8.5 1.7.5 2.5s-.2 1.7-.5 2.5zM71.4 68.9L66.7 72c-1.7 1.8-3.8 3.2-6 4.2l10.7 3.4z" fill="black"/><path d="M48.2 61.9c-2.1-4.7-2.1-10.1 0-14.8l-1.9-.6c-2.3 5.1-2.3 11.2 0 16.3zM54.7 47.1c2.1 4.7 2.1 10.1 0 14.8l1.9.6c2.3-5.1 2.3-11.2 0-16.3z" fill="black"/></svg>`,
    },
};

const CHECKLIST_ITEMS = {
    mixing: 'Смесване',
    pressing: 'Пресоване',
    drying: 'Сушене',
    packaging: 'Опаковане',
    labeling: 'Етикетиране',
};

const DEFAULT_UFI = 'GWF2-21D4-PKJ6-VKNW';
const DEFAULT_FORMULATION_NUMBER = 189123930;
const BATCH_ID_PADDING = 7;

interface MixCalculatorProps {
    currentUser: CurrentUser;
    batchToLoadId: string | null;
    onBatchLoaded: () => void;
}

interface CalculationResult {
    ingredients: BatchIngredient[];
    totalCost: number;
    costPerTablet: number;
    costPer25gPackage: number;
    recommendedSellPrice: number;
    totalActiveHours: number;
    limitMessage: string;
    availabilityIssues: { definition: RawMaterialDefinition; needed: number; available: number }[];
    totalTabletWeight: number;
    recipeIngredients: RecipeIngredient[];
}

const MixCalculator: React.FC<MixCalculatorProps> = ({ currentUser, batchToLoadId, onBatchLoaded }) => {
  const [batchName, setBatchName] = useState('');
  const [batchType, setBatchType] = useState('');
  const [status, setStatus] = useState('Планирана');
  const [tabletCount, setTabletCount] = useState(10);
  const [targetTabletWeight, setTargetTabletWeight] = useState(10);

  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [savedBatches, setSavedBatches] = useState<Batch[]>([]);
  const [materialDefinitions, setMaterialDefinitions] = useState<RawMaterialDefinition[]>([]);
  const [materialLots, setMaterialLots] = useState<RawMaterialLot[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  
  const [hazardPictograms, setHazardPictograms] = useState<string[]>([]);
  const [loadedBatch, setLoadedBatch] = useState<Batch | null>(null);

  const [operator, setOperator] = useState(currentUser.name);
  const [approvedBy, setApprovedBy] = useState('');
  const [checklist, setChecklist] = useState<Checklist>({});
  const [ingredientChecklist, setIngredientChecklist] = useState<Checklist>({});
  const [notes, setNotes] = useState('');
  const [isTestBatch, setIsTestBatch] = useState(false);
  
  const [isLocked, setIsLocked] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    setOperator(currentUser.name);
  }, [currentUser.name]);
  
  const getNextBatchId = (batches: Batch[]): string => {
      const storedCounter = localStorage.getItem('ddd_batch_counter');
      let counter = storedCounter ? parseInt(storedCounter, 10) : 0;
      if (counter === 0 && batches.length > 0) {
           const maxId = Math.max(...batches.map(b => parseInt(b.id, 10) || 0));
           counter = maxId;
      }
      return (counter + 1).toString().padStart(BATCH_ID_PADDING, '0');
  }

  const loadDataFromStorage = useCallback(() => {
    try {
        let storedBatches: Batch[] = JSON.parse(localStorage.getItem('ddd_batches') || '[]');
        let batchesNeedUpdate = false;
        storedBatches = storedBatches.map(b => {
            if (b.ufi === undefined || b.formulationNumber === undefined) {
                batchesNeedUpdate = true;
                return { ...b, ufi: DEFAULT_UFI, formulationNumber: DEFAULT_FORMULATION_NUMBER };
            }
            return b;
        });

        if (batchesNeedUpdate) {
            localStorage.setItem('ddd_batches', JSON.stringify(storedBatches));
        }
        setSavedBatches(storedBatches);
        
        const { definitions, lots } = ensureDefaultRawMaterialsAndLots();
        setMaterialDefinitions(definitions);
        setMaterialLots(lots);
        
        let storedRecipes = JSON.parse(localStorage.getItem('ddd_recipes') || '[]');
        if (storedRecipes.length === 0) {
            console.log("No recipes found. Creating default 'Greek Recipe'.");
            const defaultRecipe: Recipe = {
                id: 'default-greek-recipe', name: 'Гръцка рецепта', hazardPictograms: ['GHS07'],
                recipe: [
                    { rawMaterialId: 'def-mat-wood-charcoal-powder', grams: 5.8 }, { rawMaterialId: 'def-mat-coconut-charcoal-granules', grams: 3.2 },
                    { rawMaterialId: 'def-mat-sage', grams: 1.4 }, { rawMaterialId: 'def-mat-lemongrass', grams: 1.4 }, { rawMaterialId: 'def-mat-catnip', grams: 1.8 },
                    { rawMaterialId: 'def-mat-clove', grams: 0.5 }, { rawMaterialId: 'def-mat-cinnamon', grams: 0.3 }, { rawMaterialId: 'def-mat-rosemary', grams: 0.35 },
                    { rawMaterialId: 'def-mat-lmm-mix', grams: 1.2 }, { rawMaterialId: 'def-mat-colophony-powder', grams: 1.2 }, { rawMaterialId: 'def-mat-colophony-granules', grams: 1.0 },
                    { rawMaterialId: 'def-mat-corn-starch', grams: 2.0 }, { rawMaterialId: 'def-mat-tapioca', grams: 0.8 }, { rawMaterialId: 'def-mat-gum-arabic', grams: 0.7 },
                    { rawMaterialId: 'def-mat-xanthan-gum', grams: 0.22 },
                ]
            };
            localStorage.setItem('ddd_recipes', JSON.stringify([defaultRecipe]));
            storedRecipes = [defaultRecipe];
        }
        setRecipes(storedRecipes);
        setBatchName(getNextBatchId(storedBatches));

    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    }
  }, []);
  
  const handleRecipeSelect = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setCalculationResult(null);
    const recipe = recipes.find(p => p.id === recipeId);
    if (recipe) {
        setBatchType(recipe.name);
        setHazardPictograms(recipe.hazardPictograms);
        setChecklist(Object.keys(CHECKLIST_ITEMS).reduce((acc, key) => ({...acc, [key]: false}), {}));
        setIngredientChecklist({});
    } else {
        setBatchType('');
        setHazardPictograms([]);
        setChecklist({});
        setIngredientChecklist({});
    }
  }, [recipes]);

  useEffect(() => {
    loadDataFromStorage();
    const handleStorageUpdate = (event: StorageEvent) => {
        if (['ddd_batches', 'ddd_raw_material_definitions', 'ddd_raw_material_lots', 'ddd_recipes'].includes(event.key || '')) {
            loadDataFromStorage();
        }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
        window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadDataFromStorage]);
  
  const activeRecipe = useMemo((): RecipeIngredient[] => {
    if (loadedBatch) return loadedBatch.recipeIngredients;
    
    const selectedRecipe = recipes.find(p => p.id === selectedRecipeId);
    if (!selectedRecipe?.recipe?.length) return [];

    const baseRecipeIngredients = selectedRecipe.recipe;
    const baseTotalWeight = baseRecipeIngredients.reduce((sum, ing) => sum + ing.grams, 0);

    if (baseTotalWeight === 0) return baseRecipeIngredients;
    
    return baseRecipeIngredients.map(ing => ({
        ...ing,
        grams: (ing.grams / baseTotalWeight) * targetTabletWeight
    }));
  }, [selectedRecipeId, recipes, loadedBatch, targetTabletWeight]);

  const performCalculation = useCallback((): CalculationResult | null => {
    const currentRecipe = activeRecipe;
    if (!currentRecipe || currentRecipe.length === 0) return null;

    const totalTabletWeight = currentRecipe.reduce((sum, ing) => sum + ing.grams, 0);
    if (totalTabletWeight <= 0 || tabletCount <= 0) return null;
    
    let calculatedTotalCost = 0, calculatedActiveHours = 0;
    const availabilityIssues: { definition: RawMaterialDefinition; needed: number; available: number }[] = [];
    const usedIngredients: BatchIngredient[] = [];

    for (const recipeIng of currentRecipe) {
        const definition = materialDefinitions.find(d => d.id === recipeIng.rawMaterialId);
        if (!definition) continue;

        let neededGrams = recipeIng.grams * tabletCount;
        calculatedActiveHours += recipeIng.grams * (definition.activeHoursPerGram || 0);

        const availableLots = materialLots.filter(l => l.definitionId === definition.id && l.availableGrams > 0).sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
        const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.availableGrams, 0);
        if (totalAvailable < neededGrams) availabilityIssues.push({ definition, needed: neededGrams, available: totalAvailable });

        for (const lot of availableLots) {
            if (neededGrams <= 0) break;
            const toTake = Math.min(neededGrams, lot.availableGrams);
            calculatedTotalCost += (toTake / 1000) * lot.pricePerKg;
            usedIngredients.push({ id: Date.now() + Math.random(), rawMaterialLotId: lot.id, definitionId: definition.id, name: definition.name, grams: toTake, price: (toTake / 1000) * lot.pricePerKg, isAllergen: definition.isAllergen });
            neededGrams -= toTake;
        }
    }

    const costPerTablet = tabletCount > 0 ? calculatedTotalCost / tabletCount : 0;
    const tabletsPer25g = totalTabletWeight > 0 ? 25 / totalTabletWeight : 0;
    const costPer25gPackage = costPerTablet * tabletsPer25g;
    const recommendedSellPrice = costPer25gPackage * (1 + 30 / 100);

    return { ingredients: usedIngredients, totalCost: calculatedTotalCost, costPerTablet, costPer25gPackage, recommendedSellPrice, totalActiveHours: calculatedActiveHours, limitMessage: '', availabilityIssues, totalTabletWeight, recipeIngredients: currentRecipe };
  }, [tabletCount, materialDefinitions, materialLots, activeRecipe]);

  const loadBatchToView = useCallback((batchId: string) => {
    const batchToLoad = savedBatches.find(b => b.id === batchId);
    if (batchToLoad) {
        setBatchName(batchToLoad.batchName);
        setBatchType(batchToLoad.batchType);
        setStatus(batchToLoad.status);
        setTabletCount(batchToLoad.tabletCount);
        setTargetTabletWeight(batchToLoad.tabletWeight);
        setHazardPictograms(batchToLoad.hazardPictograms || []);
        setOperator(batchToLoad.operator || '');
        setApprovedBy(batchToLoad.approvedBy || '');
        setChecklist(batchToLoad.checklist || {});
        setIngredientChecklist(batchToLoad.ingredientChecklist || {});
        setNotes(batchToLoad.notes || '');
        setIsTestBatch(batchToLoad.isTestBatch || false);
        setSelectedRecipeId(''); // It will be loaded from batch data
        setLoadedBatch(batchToLoad);

        if (batchToLoad.status === 'Готова' || batchToLoad.status === 'Брак') {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    } else {
        console.error(`Batch with ID ${batchId} not found.`);
        handleNewBatch();
    }
  }, [savedBatches]);

  useEffect(() => {
    if (batchToLoadId) {
        loadBatchToView(batchToLoadId);
        onBatchLoaded();
    }
  }, [batchToLoadId, onBatchLoaded, loadBatchToView]);

  useEffect(() => {
    if (!loadedBatch && recipes.length === 1 && !selectedRecipeId) {
        handleRecipeSelect(recipes[0].id);
    }
  }, [recipes, loadedBatch, selectedRecipeId, handleRecipeSelect]);
  
  // Auto-calculate when a batch is loaded
  useEffect(() => {
    if (loadedBatch) {
        const result = performCalculation();
        setCalculationResult(result);
    }
  }, [loadedBatch, performCalculation]);

  const handleCalculateClick = () => {
    const result = performCalculation();
    setCalculationResult(result);
  };

  const calculatedTabletWeight = useMemo(() => activeRecipe.reduce((sum, ing) => sum + ing.grams, 0), [activeRecipe]);
  
  const handlePictogramChange = (pictogramId: string, checked: boolean) => setHazardPictograms(prev => checked ? [...prev, pictogramId] : prev.filter(p => p !== pictogramId));
  const handleChecklistChange = (key: string) => setChecklist(prev => ({...prev, [key]: !prev[key]}));
  const handleIngredientChecklistChange = (key: string) => setIngredientChecklist(prev => ({...prev, [key]: !prev[key]}));

  const saveBatch = () => {
    if (!batchName.trim() || !operator.trim()) return alert('Моля, въведете име на партидата и име на оператор.');
    if (!calculationResult) return alert('Няма валидно изчисление за запис.');
    
    const isNew = !loadedBatch;
    let inventoryDeducted = loadedBatch?.isInventoryDeducted || false;
    if (status === 'Готова' && !inventoryDeducted) {
        if (window.confirm('Статусът е "Готова". Искате ли да изпишете суровините от склада?')) {
            let currentLots = [...materialLots];
            calculationResult.ingredients.forEach(ing => {
                const lotIndex = currentLots.findIndex(l => l.id === ing.rawMaterialLotId);
                if (lotIndex > -1) currentLots[lotIndex].availableGrams -= ing.grams;
            });
            localStorage.setItem('ddd_raw_material_lots', JSON.stringify(currentLots));
            setMaterialLots(currentLots);
            inventoryDeducted = true;
        }
    }
    
    let currentEditHistory = loadedBatch?.editHistory || [];
    if (loadedBatch && isLocked && editReason) {
        currentEditHistory.push({ timestamp: new Date().toISOString(), user: currentUser.name, reason: editReason });
    }

    const newBatch: Batch = {
        // Core fields
        id: batchName.trim(), batchName: batchName.trim(), batchType, status,
        tabletWeight: calculatedTabletWeight, tabletCount, ingredients: calculationResult.ingredients, 
        recipeIngredients: calculationResult.recipeIngredients, totalCost: calculationResult.totalCost, 
        costPerTablet: calculationResult.costPerTablet, costPer25gPackage: calculationResult.costPer25gPackage,
        recommendedSellPrice: calculationResult.recommendedSellPrice, totalActiveHours: calculationResult.totalActiveHours, 
        createdAt: loadedBatch?.createdAt || new Date().toISOString(), hazardPictograms, isInventoryDeducted: inventoryDeducted,
        operator: operator.trim(), approvedBy: approvedBy.trim(), recipeId: selectedRecipeId || loadedBatch?.recipeId || '',
        checklist, ingredientChecklist, notes: notes.trim(), editHistory: currentEditHistory,
        ufi: DEFAULT_UFI, formulationNumber: DEFAULT_FORMULATION_NUMBER,
        // Test batch fields are preserved from loaded batch, not editable here
        isTestBatch: loadedBatch?.isTestBatch || false,
        testApprovalOrderNumber: loadedBatch?.testApprovalOrderNumber,
        testApprovedBy: loadedBatch?.testApprovedBy,
        testApprovedAt: loadedBatch?.testApprovedAt,
    };

    const updatedBatches = [...savedBatches.filter(b => b.id !== newBatch.id), newBatch];
    localStorage.setItem('ddd_batches', JSON.stringify(updatedBatches));
    setSavedBatches(updatedBatches);

    if (isNew) {
        localStorage.setItem('ddd_batch_counter', newBatch.id);
        alert(`Партида "${newBatch.id}" е създадена.`);
        setLoadedBatch(newBatch); // Load the new batch for further interaction
    } else {
        setLoadedBatch(newBatch);
        setEditReason('');
        setIsLocked(newBatch.status === 'Готова' || newBatch.status === 'Брак');
        alert(`Партида "${newBatch.id}" е обновена.`);
    }
  };
  
  const handleNewBatch = useCallback(() => {
    setLoadedBatch(null);
    setCalculationResult(null);
    setBatchType('');
    setStatus('Планирана');
    setTabletCount(10);
    setTargetTabletWeight(10);
    setHazardPictograms([]);
    setOperator(currentUser.name);
    setApprovedBy('');
    setChecklist({});
    setIngredientChecklist({});
    setNotes('');
    setIsTestBatch(false);
    setIsLocked(false);
    setEditReason('');
    setBatchName(getNextBatchId(savedBatches));
    if (recipes.length === 1) {
        handleRecipeSelect(recipes[0].id);
    } else {
        setSelectedRecipeId('');
    }
  }, [currentUser.name, savedBatches, recipes, handleRecipeSelect]);
  
  const handleUnlock = () => {
    if(!editReason.trim()) return alert('Моля, въведете причина за отключване.');
    setIsLocked(false);
    setShowEditModal(false);
  }

  const ingredientsForDisplay = useMemo(() => {
    if (!calculationResult) return [];

    type UniqueIngredientDisplay = {
        definitionId: string;
        name: string;
        isAllergen: boolean;
        totalGrams: number;
        gramsPerTablet: number;
    };

    const unique = calculationResult.ingredients.reduce((acc: Record<string, UniqueIngredientDisplay>, ing) => {
        if (!acc[ing.definitionId]) {
            acc[ing.definitionId] = {
                definitionId: ing.definitionId,
                name: ing.name,
                isAllergen: ing.isAllergen,
                totalGrams: 0,
                gramsPerTablet: 0,
            };
        }
        acc[ing.definitionId].totalGrams += ing.grams;
        return acc;
    }, {} as Record<string, UniqueIngredientDisplay>);
    
    // FIX: Explicitly type the result of Object.values() to UniqueIngredientDisplay[] to prevent TypeScript from inferring it as `unknown[]`.
    const uniqueValues = Object.values(unique) as UniqueIngredientDisplay[];

    uniqueValues.forEach(uniqueIng => {
        const recipeIng = activeRecipe.find(r => r.rawMaterialId === uniqueIng.definitionId);
        if (recipeIng) {
            uniqueIng.gramsPerTablet = recipeIng.grams;
        }
    });

    return uniqueValues;
  }, [calculationResult, activeRecipe]);


  const allIngredientsChecked = useMemo(() => {
    if (!calculationResult || ingredientsForDisplay.length === 0) {
        return true; 
    }
    return ingredientsForDisplay.every(ing => ingredientChecklist[ing.definitionId]);
  }, [calculationResult, ingredientsForDisplay, ingredientChecklist]);


  return (
    <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow-lg">
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Отключване на партида за редакция</h3>
                <p className="text-sm mb-4">Моля, въведете причина за редакция на заключена партида (статус: {loadedBatch?.status}). Тази информация ще бъде записана в дневника на партидата.</p>
                <textarea value={editReason} onChange={e => setEditReason(e.target.value)} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" rows={3} placeholder="Напр. Корекция на бройка, добавяне на бележка..."></textarea>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Отказ</button>
                    <button onClick={handleUnlock} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Отключи</button>
                </div>
            </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Код на партида</label>
                <input type="text" readOnly value={batchName} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 font-mono" />
            </div>
            <div className="flex flex-col">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Действия</label>
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={handleNewBatch} 
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 w-full disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={calculationResult && !allIngredientsChecked}
                        title={calculationResult && !allIngredientsChecked ? 'Отметнете всички съставки, за да продължите' : 'Започни нова партида'}
                    >
                        Нова партида
                    </button>
                    {isLocked && loadedBatch && <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 w-full">Отключи за редакция</button>}
                 </div>
            </div>
            {isLocked && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded-r-lg text-center self-center"><p className="font-bold">Партидата е заключена</p><p className="text-sm">Статус: {loadedBatch?.status}</p></div>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Избери рецепта</label>
            <select onChange={e => handleRecipeSelect(e.target.value)} value={selectedRecipeId} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200" disabled={!!loadedBatch || recipes.length <= 1 || isLocked}>
              <option value="">-- Избери рецепта за ново производство --</option>
              {recipes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Тип партида / вариант" value={batchType} onChange={e => setBatchType(e.target.value)} disabled={isLocked} className="self-end w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Брой таблетки</label>
                <input type="number" value={tabletCount} onChange={e => {setTabletCount(parseInt(e.target.value)); setCalculationResult(null);}} disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тегло/табл.</label>
                <select value={targetTabletWeight} onChange={e => {setTargetTabletWeight(Number(e.target.value)); setCalculationResult(null);}} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200" disabled={!!loadedBatch || isLocked}>
                    {[10, 15, 20, 25, 30, 35, 40].map(w => <option key={w} value={w}>{w} g</option>)}
                </select>
            </div>
             <select value={status} onChange={e => setStatus(e.target.value)} disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 self-end">
                {['Планирана', 'В процес', 'Сушене', 'Опаковане', 'Готова', 'Брак'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Оператор" value={operator} onChange={e => setOperator(e.target.value)} disabled={isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" placeholder="Проверил/Одобрил" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} disabled={currentUser.role !== 'Администратор' || isLocked} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="flex justify-center mt-4">
            <button onClick={handleCalculateClick} disabled={!activeRecipe.length || isLocked} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-lg disabled:bg-gray-400">
                Изчисли смес
            </button>
        </div>
        
        {calculationResult ? (
             <div className="bg-gray-50 p-4 rounded-lg space-y-4 mt-6">
                {calculationResult.availabilityIssues.length > 0 && (<div className="border-2 border-red-500 bg-red-50 p-3 rounded-lg text-center space-y-2"><p className="font-semibold text-red-700">Внимание: Недостатъчна наличност!</p><ul className="text-sm text-red-600">{calculationResult.availabilityIssues.map(issue => (<li key={issue.definition.id}>"{issue.definition.name}": нужни {issue.needed.toFixed(2)}g, налични {issue.available.toFixed(2)}g</li>))}</ul></div>)}
                
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Съставки за претегляне</h3>
                        <div className="border-2 border-red-500 rounded-lg p-3 text-center">
                            <div className="font-semibold text-red-700">Тегло на 1 табл.: <span className="text-red-600 font-bold">{calculatedTabletWeight.toFixed(3)} g</span></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto border-2 border-indigo-300 bg-indigo-50 rounded-lg p-4">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-indigo-100">
                          <tr>
                            <th className="px-4 py-2 w-12">Готово</th>
                            <th className="px-4 py-2">Съставка</th>
                            <th className="px-4 py-2 text-right">Грамаж/табл.</th>
                            <th className="px-4 py-2 text-right font-bold bg-indigo-200">Общо грамове за партида</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientsForDisplay.map((ing) => (
                            <tr key={ing.definitionId} className="border-b border-indigo-200 hover:bg-indigo-100">
                               <td className="px-4 py-2 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={!!ingredientChecklist[ing.definitionId]}
                                        onChange={() => handleIngredientChecklistChange(ing.definitionId)}
                                        disabled={isLocked}
                                        className="h-6 w-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                               </td>
                               <td className="px-4 py-2 font-medium text-gray-900">{ing.name} {ing.isAllergen && <span className="text-red-500" title="Потенциален алерген">*</span>}</td>
                               <td className="px-4 py-2 text-right">{ing.gramsPerTablet.toFixed(3)} g</td>
                               <td className="px-4 py-2 text-right font-bold text-indigo-700 text-base bg-indigo-100">{ing.totalGrams.toFixed(2)} g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
            </div>
        ) : (
             activeRecipe.length > 0 && (
                <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-dashed mt-6">
                    <p className="text-gray-600">Настройте брой таблетки и тегло, след което натиснете "Изчисли смес", за да видите необходимите количества.</p>
                </div>
            )
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {(selectedRecipeId || loadedBatch) && <div className="border-2 border-gray-300 rounded-lg p-4 space-y-2">
                <h3 className="text-lg font-semibold text-gray-700">Производствен чеклист</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(CHECKLIST_ITEMS).map(([key, label]) => (
                        <label key={key} className={`flex items-center space-x-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input type="checkbox" checked={!!checklist[key]} onChange={() => handleChecklistChange(key)} disabled={isLocked} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <span className="text-sm font-medium">{label}</span>
                        </label>
                    ))}
                </div>
            </div>}
            <div><textarea placeholder="Бележки към партидата..." value={notes} onChange={e => setNotes(e.target.value)} disabled={isLocked} className="w-full h-full p-3 border border-gray-300 rounded-md disabled:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={5}></textarea></div>
        </div>
        <div className="border-2 border-gray-300 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Информация за безопасност (ЕС CLP Регламент)</h3>
             <div className="flex items-center space-x-8">
                <div className="bg-gray-100 p-2 rounded text-center"><p className="text-sm font-medium text-gray-700">UFI: <span className="font-bold text-gray-900">{DEFAULT_UFI}</span></p></div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Предупредителни пиктограми</label>
                    <div className="flex space-x-4 items-center flex-wrap">
                        {Object.entries(GHS_PICTOGRAMS).map(([key, { label, svg }]) => (
                            <label key={key} title={label} className={`flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <div dangerouslySetInnerHTML={{ __html: svg }} />
                                <input type="checkbox" checked={hazardPictograms.includes(key)} onChange={e => handlePictogramChange(key, e.target.checked)} disabled={isLocked} className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            </label>
                        ))}
                    </div>
                </div>
                 <div className="bg-red-50 border border-red-200 p-2 rounded text-center self-center">
                    <p className="text-sm font-medium text-red-700">
                        Тестова партида: <span className="font-bold">{isTestBatch ? 'Да' : 'Не'}</span>
                    </p>
                    {isTestBatch && loadedBatch?.testApprovalOrderNumber &&
                      <p className="text-xs text-gray-600 mt-1">Заповед №: {loadedBatch.testApprovalOrderNumber}</p>
                    }
                </div>
            </div>
        </div>
        <div className="flex flex-wrap justify-end items-center pt-4 gap-3">
          <button onClick={saveBatch} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400" disabled={!calculationResult || isLocked}>Запази партида</button>
        </div>
      </div>
    </div>
  );
};

export default MixCalculator;