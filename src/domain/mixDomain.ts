
import { 
    BatchIngredient, 
    CalculationResult, 
    RawMaterialDefinition, 
    RawMaterialLot, 
    Recipe, 
    RecipeIngredient 
} from './types';

/**
 * Scales recipe ingredients to match target tablet weight and count,
 * then allocates actual lots from inventory.
 */
export function calculateMix(
    recipe: Recipe,
    tabletCount: number,
    targetTabletWeight: number,
    definitions: RawMaterialDefinition[],
    lots: RawMaterialLot[]
): CalculationResult | null {

    if (!recipe.recipe || recipe.recipe.length === 0) return null;
    
    const baseTotalWeight = recipe.recipe.reduce((sum, ing) => sum + ing.grams, 0);
    if (baseTotalWeight <= 0 || tabletCount <= 0) return null;

    // 1. Scale recipe to target weight
    const scaledRecipeIngredients: RecipeIngredient[] = recipe.recipe.map(ing => ({
        ...ing,
        grams: (ing.grams / baseTotalWeight) * targetTabletWeight
    }));

    const totalTabletWeight = scaledRecipeIngredients.reduce((sum, ing) => sum + ing.grams, 0);

    let calculatedTotalCost = 0;
    let calculatedActiveHours = 0;
    const availabilityIssues: { definition: RawMaterialDefinition; needed: number; available: number }[] = [];
    const usedIngredients: BatchIngredient[] = [];

    // 2. Allocate Lots
    for (const recipeIng of scaledRecipeIngredients) {
        const definition = definitions.find(d => d.id === recipeIng.rawMaterialId);
        if (!definition) continue;

        let neededGrams = recipeIng.grams * tabletCount;
        calculatedActiveHours += recipeIng.grams * (definition.activeHoursPerGram || 0);

        // Filter valid lots and sort by FIFO (receivedDate)
        const availableLots = lots
            .filter(l => l.definitionId === definition.id && l.availableGrams > 0)
            .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

        const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.availableGrams, 0);
        
        if (totalAvailable < neededGrams) {
            availabilityIssues.push({ definition, needed: neededGrams, available: totalAvailable });
        }

        // Consume lots
        for (const lot of availableLots) {
            if (neededGrams <= 0) break;
            
            const toTake = Math.min(neededGrams, lot.availableGrams);
            const costForPortion = (toTake / 1000) * lot.pricePerKg;
            
            calculatedTotalCost += costForPortion;
            
            usedIngredients.push({
                id: Date.now() + Math.random(),
                rawMaterialLotId: lot.id,
                definitionId: definition.id,
                name: definition.name,
                grams: toTake,
                price: costForPortion,
                isAllergen: definition.isAllergen
            });
            
            neededGrams -= toTake;
        }
    }

    // 3. Calculate Financials
    const costPerTablet = tabletCount > 0 ? calculatedTotalCost / tabletCount : 0;
    const tabletsPer25g = totalTabletWeight > 0 ? 25 / totalTabletWeight : 0;
    const costPer25gPackage = costPerTablet * tabletsPer25g;
    const recommendedSellPrice = costPer25gPackage * 1.30; // +30% margin

    return {
        ingredients: usedIngredients,
        totalCost: calculatedTotalCost,
        costPerTablet,
        costPer25gPackage,
        recommendedSellPrice,
        totalActiveHours: calculatedActiveHours,
        limitMessage: '',
        availabilityIssues,
        totalTabletWeight,
        recipeIngredients: scaledRecipeIngredients
    };
}
