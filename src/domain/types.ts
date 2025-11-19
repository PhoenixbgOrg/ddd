
export interface RawMaterialDefinition {
    id: string;
    name: string; // Bulgarian name used on the label
    isAllergen: boolean;
    activeHoursPerGram: number; // Used for active hours calculation
}

export interface RawMaterialLot {
    id: string;
    definitionId: string; // FK to RawMaterialDefinition.id
    lotNumber: string;
    supplier: string;
    receivedDate: string;
    expiryDate: string;
    initialGrams: number;
    availableGrams: number;
    pricePerKg: number;
}

export interface RecipeIngredient {
    rawMaterialId: string;
    grams: number; // Grams per tablet in the recipe
}

export interface Recipe {
    id: string;
    name: string; // Bulgarian name (e.g. "Гръцка рецепта")
    recipe: RecipeIngredient[];
    hazardPictograms: string[];
    labelDurationMinutesPerTablet?: number; // Default burn time per tablet in minutes
    labelVariantNameEn?: string; // Base English name (e.g. "Greek Recipe")
}

export interface BatchIngredient {
    id: number; // Unique ID for the ingredient line in the batch (e.g. timestamp)
    rawMaterialLotId: string;
    definitionId: string;
    name: string; // Snapshot of definition name
    grams: number; // Grams used from this specific lot
    price: number; // Cost of the grams used
    isAllergen: boolean;
}

export type Checklist = {
    [key: string]: boolean;
};

export interface BatchEditLog {
    timestamp: string;
    user: string;
    reason: string;
}

export interface Batch {
    id: string; // Sequential string ID (e.g. "0000001")
    recipeId: string;
    
    batchName: string; // Human readable code (same as id usually)
    batchType: string; // Product name / variant name at time of creation
    
    tabletCount: number;
    tabletWeight: number; // Actual target weight in grams
    
    ingredients: BatchIngredient[]; // The actual lots used
    recipeIngredients: RecipeIngredient[]; // Snapshot of recipe structure
    
    // Financials
    totalCost: number;
    costPerTablet: number;
    costPer25gPackage: number;
    recommendedSellPrice: number;
    
    // Stats
    totalActiveHours: number;
    
    // Meta
    status: string; // 'Планирана' | 'В процес' | 'Готова' | 'Брак' ...
    createdAt: string;
    
    // Production flow
    operator: string;
    approvedBy: string;
    
    checklist: Checklist;
    ingredientChecklist?: Checklist;
    notes?: string;
    
    // Inventory
    isInventoryDeducted?: boolean;
    
    // Safety & Labeling
    hazardPictograms: string[];
    ufi: string;
    formulationNumber: number;
    
    // Label Duration Logic
    labelDurationMinutesPerTablet?: number;          // Snapshot from recipe
    labelDurationMinutesPerTabletOverride?: number;  // Manual override
    
    // Test Batch Logic
    isTestBatch?: boolean;
    testApprovalOrderNumber?: string;
    testApprovedBy?: string;
    testApprovedAt?: string;
    
    editHistory?: BatchEditLog[];
}

export interface ReprintLog {
    id: string;
    timestamp: string;
    productName: string;
    batchCode: string;
    reprintedBy: string;
    reason: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    barcode: string;
    labelType: string;
}

// Helper type for Mix Calculator results
export interface CalculationResult {
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