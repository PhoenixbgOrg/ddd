import type { RawMaterialDefinition, RawMaterialLot } from './types';

export const DEFAULT_RAW_MATERIALS: RawMaterialDefinition[] = [
    // From new recipe
    { id: 'def-mat-wood-charcoal-powder', name: 'Дървени въглища ПРАХ', isAllergen: false, activeHoursPerGram: 0.1 },
    { id: 'def-mat-coconut-charcoal-granules', name: 'Кокосови въглища ГРАНУЛИ', isAllergen: false, activeHoursPerGram: 0.2 },
    { id: 'def-mat-sage', name: 'Салвия', isAllergen: false, activeHoursPerGram: 1.0 },
    { id: 'def-mat-lemongrass', name: 'Лимонена трева', isAllergen: false, activeHoursPerGram: 0.5 },
    { id: 'def-mat-catnip', name: 'Коча билка', isAllergen: false, activeHoursPerGram: 0.8 },
    { id: 'def-mat-clove', name: 'Карамфил', isAllergen: true, activeHoursPerGram: 2.0 },
    { id: 'def-mat-cinnamon', name: 'Канела', isAllergen: true, activeHoursPerGram: 0.5 },
    { id: 'def-mat-rosemary', name: 'Розмарин', isAllergen: false, activeHoursPerGram: 1.1 },
    { id: 'def-mat-lmm-mix', name: 'ЛММ Микс (Лавандула + Мента + Маточина)', isAllergen: true, activeHoursPerGram: 1.3 },
    { id: 'def-mat-colophony-powder', name: 'Колофон ПРАХ', isAllergen: true, activeHoursPerGram: 0.3 },
    { id: 'def-mat-colophony-granules', name: 'Колофон ГРАНУЛИ', isAllergen: true, activeHoursPerGram: 0.3 },
    { id: 'def-mat-corn-starch', name: 'Царевично нишесте', isAllergen: false, activeHoursPerGram: 0 },
    { id: 'def-mat-tapioca', name: 'Тапиока', isAllergen: false, activeHoursPerGram: 0 },
    { id: 'def-mat-gum-arabic', name: 'Гума арабика', isAllergen: false, activeHoursPerGram: 0 },
    { id: 'def-mat-xanthan-gum', name: 'Ксантанова гума', isAllergen: false, activeHoursPerGram: 0 },
    // Others that might be useful, kept from old list
    { id: 'def-mat-wood-charcoal-granules', name: 'Дървени въглища гранули', isAllergen: false, activeHoursPerGram: 0.1 },
    { id: 'def-mat-coconut-charcoal-powder', name: 'Кокосови въглища прах', isAllergen: false, activeHoursPerGram: 0.2 },
    { id: 'def-mat-melissa', name: 'Маточина', isAllergen: false, activeHoursPerGram: 1.2 },
    { id: 'def-mat-mint', name: 'Мента', isAllergen: true, activeHoursPerGram: 1.0 },
    { id: 'def-mat-lavender', name: 'Лавандула', isAllergen: false, activeHoursPerGram: 1.8 },
    { id: 'def-mat-basil', name: 'Босилек', isAllergen: false, activeHoursPerGram: 0.7 },
    { id: 'def-mat-hemp-wick', name: 'Фитил от сърцевина коноп, напоен с восък', isAllergen: false, activeHoursPerGram: 0 },
    { id: 'def-mat-water-alcohol', name: 'Вода, алкохол съотношение', isAllergen: false, activeHoursPerGram: 0 },
];

export const ensureDefaultRawMaterialsAndLots = (): { definitions: RawMaterialDefinition[]; lots: RawMaterialLot[] } => {
    try {
        const storedDefsRaw = localStorage.getItem('ddd_raw_material_definitions');
        const storedLotsRaw = localStorage.getItem('ddd_raw_material_lots');

        let definitions: RawMaterialDefinition[];
        let lots: RawMaterialLot[];

        // Handle Definitions
        if (storedDefsRaw && JSON.parse(storedDefsRaw).length > 0) {
            definitions = JSON.parse(storedDefsRaw);
        } else {
            definitions = DEFAULT_RAW_MATERIALS;
            localStorage.setItem('ddd_raw_material_definitions', JSON.stringify(definitions));
        }

        // Handle Lots
        if (storedLotsRaw && JSON.parse(storedLotsRaw).length > 0) {
            lots = JSON.parse(storedLotsRaw);
        } else {
            lots = definitions.map(def => ({
                id: `${def.id}-default-lot`,
                definitionId: def.id,
                lotNumber: 'DEFAULT',
                supplier: 'System',
                receivedDate: new Date().toISOString().split('T')[0],
                expiryDate: '2099-12-31',
                initialGrams: 200,
                availableGrams: 200,
                pricePerKg: 0,
            }));
            localStorage.setItem('ddd_raw_material_lots', JSON.stringify(lots));
        }
        
        return { definitions, lots };
    } catch (error) {
        console.error("Error ensuring default raw materials and lots:", error);
        return { definitions: [], lots: [] };
    }
};
