
// Represents a type of raw material, e.g., "Mint"
export interface RawMaterialDefinition {
    id: string;
    name: string;
    isAllergen: boolean;
    activeHoursPerGram: number;
}

// Represents a specific batch/lot of a raw material, e.g., "Mint from Supplier X, LOT #123"
export interface RawMaterialLot {
    id: string;
    definitionId: string; // Links to RawMaterialDefinition
    lotNumber: string;
    supplier: string;
    receivedDate: string;
    expiryDate: string;
    initialGrams: number;
    availableGrams: number;
    pricePerKg: number;
}

// Represents an ingredient within a calculated batch, linked to a specific lot
export interface BatchIngredient {
  id: number;
  rawMaterialLotId: string;
  definitionId: string;
  name: string; // For display, copied from definition
  grams: number; // Grams used from this specific lot for the whole batch
  price: number; // Cost of the grams used from this lot
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
  id: string; // Same as batchName, sequential number
  batchName: string;
  batchType: string;
  status: string;
  tabletWeight: number; // Weight of a single tablet
  tabletCount: number;
  ingredients: BatchIngredient[]; // Detailed list of lots used
  recipeIngredients: RecipeIngredient[]; // The recipe composition (grams per tablet)
  totalCost: number;
  costPerTablet: number;

  costPer25gPackage: number;
  recommendedSellPrice: number;
  totalActiveHours: number;
  createdAt: string;
  hazardPictograms: string[];
  isInventoryDeducted?: boolean;
  // Traceability & Production Flow
  operator: string;
  approvedBy: string;
  recipeId: string;
  checklist: Checklist;
  ingredientChecklist?: Checklist; // To track added ingredients during mixing
  // New fields
  notes?: string;
  isTestBatch?: boolean;
  editHistory?: BatchEditLog[];
  // UFI fields are now mandatory
  formulationNumber: number;
  ufi: string;
  // Test batch approval fields
  testApprovalOrderNumber?: string;
  testApprovedBy?: string;
  testApprovedAt?: string;
  
  // Label specific fields
  labelDurationMinutesPerTablet?: number;          // Snapshot from recipe at creation (or added later)
  labelDurationMinutesPerTabletOverride?: number;  // Manual override for this specific batch
}

export interface ReprintLog {
    id: string;
    timestamp: string;
    productName: string;
    batchCode: string;
    reprintedBy: string;
    reason: string;
}

export interface RecipeIngredient {
    rawMaterialId: string; // Links to RawMaterialDefinition
    grams: number;
}

export interface Recipe {
    id: string;
    name: string;
    recipe: RecipeIngredient[];
    hazardPictograms: string[];
    labelDurationMinutesPerTablet?: number; // Default burn time per tablet (minutes)
    labelVariantNameEn?: string;            // English variant name base (e.g. "Greek Recipe")
}
