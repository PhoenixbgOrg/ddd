import React, { useState } from 'react';
import RawMaterialsManager from './RawMaterialsManager';
import ReprintLogViewer from './ReprintLogViewer';
import RecipeManager from './RecipeManager';
import BatchHistory from '../BatchHistory';
import type { CurrentUser } from '../../App';

type AdminView = 'materials' | 'recipes' | 'reprints' | 'history';

interface AdminPanelProps {
    currentUser: CurrentUser;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [activeView, setActiveView] = useState<AdminView>('materials');
    
    const tabButtonClasses = (view: AdminView) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
      activeView === view
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;


    return (
        <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow-lg">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Административен панел</h2>
                <div className="flex space-x-4 border-b pb-2 flex-wrap gap-y-2">
                     <button onClick={() => setActiveView('materials')} className={tabButtonClasses('materials')}>
                        Управление на суровини
                     </button>
                     <button onClick={() => setActiveView('recipes')} className={tabButtonClasses('recipes')}>
                        Управление на рецепти
                     </button>
                     <button onClick={() => setActiveView('history')} className={tabButtonClasses('history')}>
                        История на партидите
                     </button>
                      <button onClick={() => setActiveView('reprints')} className={tabButtonClasses('reprints')}>
                        Дневник на препечатките
                     </button>
                </div>
                <div>
                    {activeView === 'materials' && <RawMaterialsManager />}
                    {activeView === 'recipes' && <RecipeManager />}
                    {activeView === 'history' && <BatchHistory currentUser={currentUser} />}
                    {activeView === 'reprints' && <ReprintLogViewer />}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
