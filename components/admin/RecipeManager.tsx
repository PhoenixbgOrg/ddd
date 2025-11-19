
import React, { useState, useEffect, useCallback } from 'react';
import type { RawMaterialDefinition, Recipe, RecipeIngredient } from '../../types';
import { ensureDefaultRawMaterialsAndLots } from '../../dataDefaults';

const GHS_PICTOGRAMS: Record<string, { label: string; svg: string }> = {
    GHS02: { label: 'Запалимо', svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M63.3 31.5c-2.3-5.2-6.2-7.8-11.8-7.8-5.5 0-9.5 2.6-11.8 7.8-2 4.5-2.2 9.5-.7 14.8 2.2 7.7 7.7 11.6 12.5 11.6s10.3-3.9 12.5-11.6c1.5-5.3 1.3-10.3-.7-14.8zm-1.8 13.3c-1.8 6.4-6 9.6-10.7 9.6-4.7 0-8.9-3.2-10.7-9.6-1.3-4.5-1-8.5.5-12.2 1.8-4.1 5-6.2 10.2-6.2s8.4 2.1 10.2 6.2c1.5 3.7 1.8 7.7.5 12.2zM50 55.4c-8.8 0-14.5-7.3-14.5-15.6 0-5.6 3.3-10.4 8.7-13.4-2.2 5-1.4 11.2 2.3 15.6 3.1 3.7 7.3 5.6 11.9 5.6 2.4 0 4.6-.6 6.5-1.9-2.6 5.8-7.9 9.7-14.9 9.7z" fill="black"/></svg>`},
    GHS07: { label: 'Дразнещо', svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M45.8 21.3h8.4v37.5h-8.4V21.3zm4.2 51.9c-2.9 0-5.3-2.4-5.3-5.3s2.4-5.3 5.3-5.3 5.3 2.4 5.3 5.3-2.4 5.3-5.3 5.3z" fill="black"/></svg>`},
    GHS08: { label: 'Опасност за здравето', svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M50 25c-9.2 0-17.3 4.5-22.4 11.6-1.5 2.1-2.8 4.4-3.8 6.9L38.3 58l-5.6 5.6-14.1-14.1c-1.1 2.5-1.9 5.1-2.2 7.9h11.1v8H12.1c.3 2.7 1.1 5.4 2.2 7.9l14.1-14.1 5.6 5.6-14.5 14.5c4.6 6.8 12.3 11.3 20.9 11.3s16.3-4.5 20.9-11.3L61.7 65.1l5.6-5.6 14.1 14.1c1.1-2.5 1.9 5.1 2.2-7.9H72.5v-8h11.1c-.3-2.7-1.1-5.4-2.2-7.9L67.3 58l-5.6-5.6 14.5-14.5c-5.1-7.1-13.2-11.6-22.4-11.6zM50 33c3.8 0 7.3 1.2 10.2 3.4l-7.1 7.1-8.5-8.5v-10c2.1.7 4.1 1.2 6.4 1.2zm-12.7 7.7L42.9 46l-7.1 7.1c-2.2-2.9-3.4-6.4-3.4-10.2 0-2.3.5-4.5 1.2-6.4l-6.4 6.4zm22.9 1.1l-10-10 10-10v20zm-15.6 4.1l8.5 8.5L42.9 65c-3.8 0-7.3-1.2-10.2-3.4l7.1-7.1 8.5-8.5z" fill="black"/></svg>`},
    GHS09: { label: 'Опасно за околната среда', svg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 100 100"><path d="M50 0L0 50l50 50 50-50L50 0zm0 10l40 40-40 40-40-40L50 10z" fill="red" stroke="none"/><path d="M60.1 23.3L48.2 45.4 39.9 23.3h-19l17.2 46.7-6.2-1.9-3.1 6.3 11.2 3.4 11.2-3.4-3.1-6.3-6.2 1.9L69.1 23.3zM25.9 76.7l10.7-3.4c-2.3-1-4.3-2.4-6-4.2l-4.7 1.5zm16.5-19.4c.5-1 .8-2 .8-3.1s-.3-2.1-.8-3.1l-4.2 1.3c.3.8.5 1.7.5 2.5s-.2 1.7-.5 2.5zM71.4 68.9L66.7 72c-1.7 1.8-3.8 3.2-6 4.2l10.7 3.4z" fill="black"/><path d="M48.2 61.9c-2.1-4.7-2.1-10.1 0-14.8l-1.9-.6c-2.3 5.1-2.3 11.2 0 16.3zM54.7 47.1c2.1 4.7 2.1 10.1 0 14.8l1.9.6c2.3-5.1 2.3-11.2 0-16.3z" fill="black"/></svg>`},
};

const initialFormState: Omit<Recipe, 'id' | 'recipe'> = {
    name: '',
    hazardPictograms: [],
    labelDurationMinutesPerTablet: 0,
    labelVariantNameEn: '',
};

const RecipeManager: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [materialDefinitions, setMaterialDefinitions] = useState<RawMaterialDefinition[]>([]);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [formState, setFormState] = useState(initialFormState);
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

    const loadData = useCallback(() => {
        try {
            const storedRecipes = localStorage.getItem('ddd_recipes');
            if (storedRecipes) setRecipes(JSON.parse(storedRecipes));
            
            const { definitions } = ensureDefaultRawMaterialsAndLots();
            setMaterialDefinitions(definitions);
            
            // Auto create default recipe if none exist
            if (!storedRecipes || JSON.parse(storedRecipes).length === 0) {
                 const defaultRecipe: Recipe = {
                    id: 'default-greek-recipe',
                    name: 'Гръцка рецепта',
                    hazardPictograms: ['GHS07'],
                    labelDurationMinutesPerTablet: 90,
                    labelVariantNameEn: 'Greek Recipe',
                    recipe: [
                        { rawMaterialId: 'def-mat-wood-charcoal-powder', grams: 5.8 },
                        { rawMaterialId: 'def-mat-coconut-charcoal-granules', grams: 3.2 },
                        { rawMaterialId: 'def-mat-sage', grams: 1.4 },
                        { rawMaterialId: 'def-mat-lemongrass', grams: 1.4 },
                        { rawMaterialId: 'def-mat-catnip', grams: 1.8 },
                        { rawMaterialId: 'def-mat-clove', grams: 0.5 },
                        { rawMaterialId: 'def-mat-cinnamon', grams: 0.3 },
                        { rawMaterialId: 'def-mat-rosemary', grams: 0.35 },
                        { rawMaterialId: 'def-mat-lmm-mix', grams: 1.2 },
                        { rawMaterialId: 'def-mat-colophony-powder', grams: 1.2 },
                        { rawMaterialId: 'def-mat-colophony-granules', grams: 1.0 },
                        { rawMaterialId: 'def-mat-corn-starch', grams: 2.0 },
                        { rawMaterialId: 'def-mat-tapioca', grams: 0.8 },
                        { rawMaterialId: 'def-mat-gum-arabic', grams: 0.7 },
                        { rawMaterialId: 'def-mat-xanthan-gum', grams: 0.22 },
                    ]
                 };
                 if(definitions.length > 0) {
                    const requiredIds = defaultRecipe.recipe.map(r => r.rawMaterialId);
                    const allRequiredExist = requiredIds.every(id => definitions.some(m => m.id === id));
                    if(allRequiredExist){
                       localStorage.setItem('ddd_recipes', JSON.stringify([defaultRecipe]));
                       setRecipes([defaultRecipe]);
                    }
                 }
            }

        } catch (error) { console.error("Failed to load data", error); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? (parseInt(value, 10) || 0) : value;
        setFormState(prev => ({ ...prev, [name]: val }));
    };

    const handlePictogramChange = (pictogramId: string, checked: boolean) => {
        setFormState(prev => ({
            ...prev,
            hazardPictograms: checked ? [...prev.hazardPictograms, pictogramId] : prev.hazardPictograms.filter(p => p !== pictogramId)
        }));
    };

    const handleIngredientChange = (index: number, field: 'rawMaterialId' | 'grams', value: string) => {
        const updatedRecipe = [...recipeIngredients];
        const val = field === 'grams' ? parseFloat(value) || 0 : value;
        updatedRecipe[index] = { ...updatedRecipe[index], [field]: val };
        setRecipeIngredients(updatedRecipe);
    };

    const addIngredient = () => {
        const firstMaterial = materialDefinitions[0];
        if (!firstMaterial) {
            alert("Моля, първо добавете дефиниции на суровини.");
            return;
        }
        setRecipeIngredients([...recipeIngredients, { rawMaterialId: firstMaterial.id, grams: 0 }]);
    };

    const removeIngredient = (index: number) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setFormState(initialFormState);
        setRecipeIngredients([]);
        setEditingRecipe(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name.trim() || recipeIngredients.length === 0) {
            alert("Името на рецептата и поне една съставка са задължителни.");
            return;
        }

        let updatedRecipes: Recipe[];
        const recipeData: Recipe = {
            id: editingRecipe ? editingRecipe.id : `recipe-${Date.now()}`,
            name: formState.name,
            hazardPictograms: formState.hazardPictograms,
            labelDurationMinutesPerTablet: formState.labelDurationMinutesPerTablet,
            labelVariantNameEn: formState.labelVariantNameEn,
            recipe: recipeIngredients.filter(r => r.grams > 0),
        };

        if (editingRecipe) {
            updatedRecipes = recipes.map(p => p.id === editingRecipe.id ? recipeData : p);
        } else {
            updatedRecipes = [...recipes, recipeData];
        }

        try {
            localStorage.setItem('ddd_recipes', JSON.stringify(updatedRecipes));
            setRecipes(updatedRecipes);
            resetForm();
        } catch (error) {
            console.error("Failed to save recipes", error);
            alert("Грешка при записване.");
        }
    };

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setFormState({
            name: recipe.name,
            hazardPictograms: recipe.hazardPictograms,
            labelDurationMinutesPerTablet: recipe.labelDurationMinutesPerTablet || 0,
            labelVariantNameEn: recipe.labelVariantNameEn || '',
        });
        setRecipeIngredients(recipe.recipe);
    };

    const handleDelete = (recipeId: string) => {
        if (window.confirm("Сигурни ли сте, че искате да изтриете тази рецепта?")) {
            const updated = recipes.filter(p => p.id !== recipeId);
            try {
                localStorage.setItem('ddd_recipes', JSON.stringify(updated));
                setRecipes(updated);
            } catch (error) { console.error("Failed to delete recipe", error); }
        }
    };
    
    const totalGrams = recipeIngredients.reduce((sum, ing) => sum + ing.grams, 0);

    return (
        <div className="space-y-8">
            <div style={{ borderColor: 'red' }} className="border-2 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-red-700">{editingRecipe ? 'Редакция на рецепта' : 'Добави нова рецепта'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Име на рецепта (BG)</label>
                            <input type="text" name="name" placeholder="Напр. Гръцка рецепта" value={formState.name} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                         <div>
                            <label className="block text-sm text-gray-600 mb-1">Име на варианта на английски (за етикета)</label>
                            <input type="text" name="labelVariantNameEn" placeholder="Напр. Greek Recipe" value={formState.labelVariantNameEn} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div>
                             <label className="block text-sm text-gray-600 mb-1">Ориентировъчно време на тлеене на 1 таблетка (в минути, за етикета)</label>
                             <input type="number" name="labelDurationMinutesPerTablet" placeholder="Напр. 90" value={formState.labelDurationMinutesPerTablet || ''} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Предупредителни пиктограми</label>
                        <div className="flex space-x-4 items-center flex-wrap">
                            {Object.entries(GHS_PICTOGRAMS).map(([key, { label, svg }]) => (
                                <label key={key} title={label} className="flex flex-col items-center cursor-pointer">
                                    <div dangerouslySetInnerHTML={{ __html: svg }} />
                                    <input type="checkbox" checked={formState.hazardPictograms.includes(key)} onChange={e => handlePictogramChange(key, e.target.checked)} className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-lg font-semibold">Съставки (за 1 таблетка)</h4>
                             <p className="font-bold">Общо тегло: {totalGrams.toFixed(3)} g</p>
                        </div>
                        <div className="space-y-2">
                            {recipeIngredients.map((ing, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <select value={ing.rawMaterialId} onChange={e => handleIngredientChange(index, 'rawMaterialId', e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-md">
                                        {materialDefinitions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <input type="number" step="0.001" value={ing.grams} onChange={e => handleIngredientChange(index, 'grams', e.target.value)} className="w-32 px-3 py-2 border border-gray-300 rounded-md" placeholder="Грамаж" />
                                    <button type="button" onClick={() => removeIngredient(index)} className="px-3 py-2 bg-red-500 text-white rounded-md">&times;</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addIngredient} className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm">+ Добави съставка</button>
                    </div>

                    <div className="flex items-center space-x-4 pt-4">
                        <button type="submit" className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">{editingRecipe ? 'Запази промените' : 'Запази рецепта'}</button>
                        {editingRecipe && <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Отказ</button>}
                    </div>
                </form>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-4">Списък с рецепти</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">Име на рецепта</th>
                                <th className="px-4 py-3">Етикет EN</th>
                                <th className="px-4 py-3">Съставки</th>
                                <th className="px-4 py-3 text-right">Тегло/табл.</th>
                                <th className="px-4 py-3">Време/табл.</th>
                                <th className="px-4 py-3">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipes.map(p => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-4 py-2">{p.labelVariantNameEn || '-'}</td>
                                    <td className="px-4 py-2">{p.recipe.length}</td>
                                    <td className="px-4 py-2 text-right">{p.recipe.reduce((s, i) => s + i.grams, 0).toFixed(3)} g</td>
                                    <td className="px-4 py-2">{p.labelDurationMinutesPerTablet || 'N/A'}</td>
                                    <td className="px-4 py-2 flex space-x-2">
                                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:underline">Редакция</button>
                                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Изтрий</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RecipeManager;
