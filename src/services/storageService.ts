
import { Batch, RawMaterialDefinition, RawMaterialLot, Recipe, ReprintLog } from '../domain/types';
import { ensureDefaultRawMaterialsAndLots } from '../config/dataDefaults';

// Interface defining the contract for any storage provider
export interface IStorageService {
    // Raw Materials
    getRawMaterials(): RawMaterialDefinition[];
    saveRawMaterials(definitions: RawMaterialDefinition[]): void;

    // Lots
    getRawMaterialLots(): RawMaterialLot[];
    saveRawMaterialLots(lots: RawMaterialLot[]): void;

    // Recipes
    getRecipes(): Recipe[];
    saveRecipes(recipes: Recipe[]): void;

    // Batches
    getBatches(): Batch[];
    saveBatches(batches: Batch[]): void;

    // Logs
    getReprintLogs(): ReprintLog[];
    saveReprintLogs(logs: ReprintLog[]): void;
    
    // Init
    initializeDefaults(): void;
}

// LocalStorage Implementation
class LocalStorageService implements IStorageService {
    private KEYS = {
        DEFINITIONS: 'ddd_raw_material_definitions',
        LOTS: 'ddd_raw_material_lots',
        RECIPES: 'ddd_recipes',
        BATCHES: 'ddd_batches',
        LOGS: 'ddd_reprint_logs',
        COUNTER: 'ddd_batch_counter'
    };

    initializeDefaults(): void {
        try {
            const defs = localStorage.getItem(this.KEYS.DEFINITIONS);
            if (!defs || JSON.parse(defs).length === 0) {
                const { definitions, lots } = ensureDefaultRawMaterialsAndLots();
                this.saveRawMaterials(definitions);
                this.saveRawMaterialLots(lots);
            }
        } catch (e) {
            console.error("Failed to init defaults", e);
        }
    }

    getRawMaterials(): RawMaterialDefinition[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.DEFINITIONS) || '[]');
        } catch { return []; }
    }

    saveRawMaterials(definitions: RawMaterialDefinition[]): void {
        localStorage.setItem(this.KEYS.DEFINITIONS, JSON.stringify(definitions));
        window.dispatchEvent(new StorageEvent('storage', { key: this.KEYS.DEFINITIONS }));
    }

    getRawMaterialLots(): RawMaterialLot[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.LOTS) || '[]');
        } catch { return []; }
    }

    saveRawMaterialLots(lots: RawMaterialLot[]): void {
        localStorage.setItem(this.KEYS.LOTS, JSON.stringify(lots));
        window.dispatchEvent(new StorageEvent('storage', { key: this.KEYS.LOTS }));
    }

    getRecipes(): Recipe[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.RECIPES) || '[]');
        } catch { return []; }
    }

    saveRecipes(recipes: Recipe[]): void {
        localStorage.setItem(this.KEYS.RECIPES, JSON.stringify(recipes));
        window.dispatchEvent(new StorageEvent('storage', { key: this.KEYS.RECIPES }));
    }

    getBatches(): Batch[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.BATCHES) || '[]');
        } catch { return []; }
    }

    saveBatches(batches: Batch[]): void {
        localStorage.setItem(this.KEYS.BATCHES, JSON.stringify(batches));
        window.dispatchEvent(new StorageEvent('storage', { key: this.KEYS.BATCHES }));
    }

    getReprintLogs(): ReprintLog[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.LOGS) || '[]');
        } catch { return []; }
    }

    saveReprintLogs(logs: ReprintLog[]): void {
        localStorage.setItem(this.KEYS.LOGS, JSON.stringify(logs));
        window.dispatchEvent(new StorageEvent('storage', { key: this.KEYS.LOGS }));
    }

    // Helper for Batch ID generation
    getNextBatchId(currentBatches: Batch[]): string {
        const storedCounter = localStorage.getItem(this.KEYS.COUNTER);
        let counter = storedCounter ? parseInt(storedCounter, 10) : 0;
        
        if (counter === 0 && currentBatches.length > 0) {
             const maxId = Math.max(...currentBatches.map(b => parseInt(b.id, 10) || 0));
             counter = maxId;
        }
        
        const next = counter + 1;
        localStorage.setItem(this.KEYS.COUNTER, next.toString());
        return next.toString().padStart(7, '0');
    }
}

export const storageService = new LocalStorageService();
