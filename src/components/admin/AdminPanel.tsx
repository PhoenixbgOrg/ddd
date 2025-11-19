
import React, { useState } from 'react';
import RawMaterialsManager from './RawMaterialsManager';
import ReprintLogViewer from './ReprintLogViewer';
import RecipeManager from './RecipeManager';
import BatchHistory from '../BatchHistory';
import ProductManager from './ProductManager';
import type { CurrentUser } from '../App';

type AdminView = 'materials' | 'recipes' | 'reprints' | 'history' | 'products';

interface AdminPanelProps {
    currentUser: CurrentUser;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [activeView, setActiveView] = useState<AdminView>('materials');
    
    const btnClass = (view: AdminView) => `px-4 py-2 rounded font-medium transition-colors ${activeView === view ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;

    // Specialized style for the new button as requested (orange-ish attention color, though mapped to web styles)
    // The user requested "bg=#FFA500" (Orange) for this specific button in python. 
    // I'll use an orange shade for the active state or a distinct style to honor the request.
    const productBtnClass = (view: AdminView) => `px-4 py-2 rounded font-bold transition-colors ${activeView === view ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300'}`;

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Административен панел</h2>
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
                 <button onClick={() => setActiveView('materials')} className={btnClass('materials')}>Суровини</button>
                 <button onClick={() => setActiveView('recipes')} className={btnClass('recipes')}>Рецепти</button>
                 <button onClick={() => setActiveView('history')} className={btnClass('history')}>История</button>
                 <button onClick={() => setActiveView('reprints')} className={btnClass('reprints')}>Log Препечатки</button>
                 
                 {/* New Button as requested */}
                 <button onClick={() => setActiveView('products')} className={productBtnClass('products')}>
                    Редакция на Продукти/Етикети
                 </button>
            </div>
            
            <div className="animate-fade-in">
                {activeView === 'materials' && <RawMaterialsManager />}
                {activeView === 'recipes' && <RecipeManager />}
                {activeView === 'history' && <BatchHistory currentUser={currentUser} />}
                {activeView === 'reprints' && <ReprintLogViewer />}
                {activeView === 'products' && <ProductManager />}
            </div>
        </div>
    );
};

export default AdminPanel;