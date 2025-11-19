
import { Batch, RawMaterialDefinition, Recipe } from './types';

// --- Configuration Constants ---
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
    'def-mat-wood-charcoal-powder': 'Wood charcoal (powder)',
    'def-mat-coconut-charcoal-granules': 'Coconut charcoal (granules)',
    'def-mat-corn-starch': 'Corn starch',
    'def-mat-catnip': 'Catnip',
    'def-mat-sage': 'Sage',
    'def-mat-lemongrass': 'Lemongrass',
    'def-mat-lmm-mix': 'LMM blend (Lavender, Mint, Lemon balm)',
    'def-mat-colophony-powder': 'Colophony (powder)',
    'def-mat-colophony-granules': 'Colophony (granules)',
    'def-mat-tapioca': 'Tapioca',
    'def-mat-gum-arabic': 'Gum arabic',
    'def-mat-clove': 'Clove',
    'def-mat-rosemary': 'Rosemary',
    'def-mat-cinnamon': 'Cinnamon',
    'def-mat-xanthan-gum': 'Xanthan gum',
    'def-mat-wood-charcoal-granules': 'Wood charcoal (granules)',
    'def-mat-coconut-charcoal-powder': 'Coconut charcoal (powder)',
    'def-mat-melissa': 'Lemon balm',
    'def-mat-mint': 'Mint',
    'def-mat-lavender': 'Lavender',
    'def-mat-basil': 'Basil',
    'def-mat-hemp-wick': 'Hemp wick',
    'def-mat-water-alcohol': 'Water/Alcohol',
};

export interface LabelInfo {
    title: string;
    quantityText: string;
    durationText: string;
    totalDurationText?: string;
    ingredientsText: string;
    hasAllergens: boolean;
}

/**
 * Formats the ingredients list for the label.
 * Handles translation to English and marking allergens with '⚠'.
 */
export function formatIngredients(
    batch: Batch, 
    definitions: RawMaterialDefinition[], 
    language: 'bg' | 'en'
): { text: string; hasAllergens: boolean } {
    if (!batch.recipeIngredients || batch.recipeIngredients.length === 0) {
        return { text: '', hasAllergens: false };
    }

    const sortedIngredients = [...batch.recipeIngredients].sort((a, b) => b.grams - a.grams);
    let hasAllergens = false;

    const parts = sortedIngredients.map(ing => {
        const definition = definitions.find(def => def.id === ing.rawMaterialId);
        if (!definition) return null;

        if (definition.isAllergen) {
            hasAllergens = true;
        }

        let name: string;
        if (language === 'en') {
            name = INGREDIENT_TRANSLATIONS[definition.id] || definition.name;
        } else {
            name = definition.name;
        }

        return definition.isAllergen ? `⚠ ${name}` : name;
    }).filter(Boolean);

    return { text: parts.join(', '), hasAllergens };
}

/**
 * Core logic to determine the burn time texts and titles based on override/default rules.
 */
export function getLabelInfo(
    batch: Batch, 
    recipe: Recipe | undefined, 
    language: 'bg' | 'en'
): LabelInfo {
    // 1. Determine minutes per tablet
    const override = batch.labelDurationMinutesPerTabletOverride;
    const batchDefault = batch.labelDurationMinutesPerTablet;
    const recipeDefault = recipe?.labelDurationMinutesPerTablet;

    let minutes = 0;
    if (override && override > 0) {
        minutes = override;
    } else if (batchDefault && batchDefault > 0) {
        minutes = batchDefault;
    } else if (recipeDefault && recipeDefault > 0) {
        minutes = recipeDefault;
    }

    // 2. Determine Base Names
    const baseNameBg = recipe?.name || batch.batchType;
    // Fallback if English name is missing
    const baseNameEn = recipe?.labelVariantNameEn || (recipe?.name === 'Гръцка рецепта' ? 'Greek Recipe' : 'Incense Tablets');

    // 3. Build Title
    let title = '';
    if (language === 'bg') {
        title = minutes > 0 
            ? `Таблетки за ароматен дим за открито – „${baseNameBg} ${minutes}“`
            : `Таблетки за ароматен дим за открито – „${baseNameBg}“`;
    } else {
        title = minutes > 0 
            ? `Outdoor incense tablets – "${baseNameEn} ${minutes}"`
            : `Outdoor incense tablets – "${baseNameEn}"`;
    }

    // 4. Build Duration Texts
    let durationText = '';
    let totalDurationText = '';

    if (minutes > 0) {
        const mins = Math.floor(minutes);
        const hours = mins / 60;
        // Formatting: BG uses comma, EN uses dot. 1 decimal place.
        const hoursTextBg = hours.toFixed(1).replace('.', ',');
        const hoursTextEn = hours.toFixed(1);

        if (language === 'en') {
            durationText = `Approximate duration of effect: about ${mins} minutes (approximately ${hoursTextEn} hours) per tablet under normal conditions (no strong wind).`;
        } else {
            durationText = `Ориентировъчна продължителност на действие: около ${mins} минути (приблизително ${hoursTextBg} часа) на таблетка при нормални условия (без силен вятър).`;
        }

        // Total package duration (only if qty > 1)
        if (batch.tabletCount > 1) {
            const totalMinutes = mins * batch.tabletCount;
            const totalHours = totalMinutes / 60;
            const totalHoursTextBg = totalHours.toFixed(1).replace('.', ',');
            const totalHoursTextEn = totalHours.toFixed(1);

            if (language === 'bg') {
                totalDurationText = `Общо потенциално време на тлеене при последователно използване: около ${totalMinutes} минути (приблизително ${totalHoursTextBg} часа) за цялата опаковка.`;
            } else {
                totalDurationText = `Total potential burn time when used consecutively: about ${totalMinutes} minutes (approximately ${totalHoursTextEn} hours) for the whole package.`;
            }
        }
    } else {
        // Generic text if no time defined
        if (language === 'en') {
            durationText = "Approximate duration of effect: depends on usage conditions.";
        } else {
            durationText = "Ориентировъчна продължителност на действие: зависи от условията на употреба.";
        }
    }

    // 5. Build Quantity Text
    let quantityText = '';
    const count = batch.tabletCount;
    
    if (language === 'bg') {
        if (count === 1) {
            quantityText = `Количество: 1 бр. таблетка`;
        } else {
            quantityText = `Количество: ${count} бр. таблетки`;
        }
    } else {
        if (count === 1) {
            quantityText = `Quantity: 1 tablet`;
        } else {
            quantityText = `Quantity: ${count} tablets`;
        }
    }

    return {
        title,
        durationText,
        totalDurationText,
        quantityText,
        ingredientsText: '', // To be filled by caller using formatIngredients
        hasAllergens: false // To be filled by caller
    };
}
