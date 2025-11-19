
import React, { useState } from 'react';
import RawMaterialsManager from './RawMaterialsManager';
import ReprintLogViewer from './ReprintLogViewer';
import RecipeManager from './RecipeManager';
import BatchHistory from '../BatchHistory';
import type { CurrentUser } from '../App';

type AdminView = 'materials' | 'recipes' | 'reprints' | 'history';

interface AdminPanelProps {
    currentUser: CurrentUser;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [activeView, setActiveView] = useState<AdminView>('materials');
    
    const btnClass = (view: AdminView) => `px-4 py-2 rounded ${activeView === view ? 'bg-blue-600 text-white' : 'bg-gray-200'}`;

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-6">Административен панел</h2>
            <div className="flex gap-2 mb-6 border-b pb-4">
                 <button onClick={() => setActiveView('materials')} className={btnClass('materials')}>Суровини</button>
                 <button onClick={() => setActiveView('recipes')} className={btnClass('recipes')}>Рецепти</button>
                 <button onClick={() => setActiveView('history')} className={btnClass('history')}>История</button>
                 <button onClick={() => setActiveView('reprints')} className={btnClass('reprints')}>Log Препечатки</button>
            </div>
            {activeView === 'materials' && <RawMaterialsManager />}
            {activeView === 'recipes' && <RecipeManager />}
            {activeView === 'history' && <BatchHistory currentUser={currentUser} />}
            {activeView === 'reprints' && <ReprintLogViewer />}
        </div>
    );
};

export default AdminPanel;
