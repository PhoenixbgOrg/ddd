
import React, { useState, useEffect } from 'react';
import type { Recipe, RawMaterialDefinition } from '../../domain/types';
import { storageService } from '../../services/storageService';

const RecipeManager: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [materials, setMaterials] = useState<RawMaterialDefinition[]>([]);
    const [editing, setEditing] = useState<Recipe | null>(null);

    useEffect(() => {
        setRecipes(storageService.getRecipes());
        setMaterials(storageService.getRawMaterials());
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        const updated = recipes.some(r => r.id === editing.id) 
            ? recipes.map(r => r.id === editing.id ? editing : r)
            : [...recipes, editing];
            
        storageService.saveRecipes(updated);
        setRecipes(updated);
        setEditing(null);
    };

    const createNew = () => {
        setEditing({
            id: `recipe-${Date.now()}`, name: 'New Recipe', recipe: [], hazardPictograms: [], 
            labelDurationMinutesPerTablet: 90, labelVariantNameEn: 'New Variant'
        });
    };

    return (
        <div>
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-bold">Рецепти</h3>
                <button onClick={createNew} className="bg-green-600 text-white px-3 py-1 rounded">Нова рецепта</button>
            </div>

            {editing ? (
                <form onSubmit={handleSave} className="border p-4 rounded bg-gray-50 mb-6">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="Име (BG)" className="border p-2 rounded"/>
                        <input value={editing.labelVariantNameEn || ''} onChange={e => setEditing({...editing, labelVariantNameEn: e.target.value})} placeholder="Name (EN)" className="border p-2 rounded"/>
                        <input type="number" value={editing.labelDurationMinutesPerTablet || 0} onChange={e => setEditing({...editing, labelDurationMinutesPerTablet: parseFloat(e.target.value)})} placeholder="Minutes/Tablet" className="border p-2 rounded"/>
                    </div>
                    
                    <h4 className="font-bold mt-4">Съставки</h4>
                    {editing.recipe.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <select value={ing.rawMaterialId} onChange={e => {
                                const newRecipe = [...editing.recipe];
                                newRecipe[idx].rawMaterialId = e.target.value;
                                setEditing({...editing, recipe: newRecipe});
                            }} className="border p-1 flex-1">
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input type="number" value={ing.grams} onChange={e => {
                                const newRecipe = [...editing.recipe];
                                newRecipe[idx].grams = parseFloat(e.target.value);
                                setEditing({...editing, recipe: newRecipe});
                            }} className="border p-1 w-24" />
                            <button type="button" onClick={() => {
                                setEditing({...editing, recipe: editing.recipe.filter((_, i) => i !== idx)});
                            }} className="text-red-600">X</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setEditing({...editing, recipe: [...editing.recipe, { rawMaterialId: materials[0]?.id || '', grams: 0 }]})} className="text-sm text-blue-600">+ Add Ingredient</button>

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setEditing(null)} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                    </div>
                </form>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="text-left"><th>Име</th><th>EN Variant</th><th>Мин/Табл</th><th>Действия</th></tr></thead>
                    <tbody>
                        {recipes.map(r => (
                            <tr key={r.id} className="border-b">
                                <td className="p-2">{r.name}</td>
                                <td className="p-2">{r.labelVariantNameEn}</td>
                                <td className="p-2">{r.labelDurationMinutesPerTablet}</td>
                                <td className="p-2">
                                    <button onClick={() => setEditing(r)} className="text-blue-600 mr-2">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RecipeManager;
