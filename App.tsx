import React, { useState } from 'react';
import LabelGenerator from './components/LabelGenerator';
import MixCalculator from './components/MixCalculator';
import AdminPanel from './components/admin/AdminPanel';
import BatchHistory from './components/BatchHistory';

type View = 'label' | 'mix' | 'admin' | 'history';
export type UserRole = 'Служител' | 'Администратор';
export interface CurrentUser {
    name: string;
    role: UserRole;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('mix');
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ name: 'Иван Петров', role: 'Служител'});
  const [batchToLoad, setBatchToLoad] = useState<string | null>(null);

  const handleLoadBatchFromHistory = (batchId: string) => {
    setBatchToLoad(batchId);
    setActiveView('mix');
  };

  const navButtonClasses = (view: View) =>
    `px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
      activeView === view
        ? 'bg-white text-indigo-600 border-b-2 border-indigo-500'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold text-gray-800">DDD Manufacturing Tools</h1>
          <p className="text-lg text-gray-600 mt-2">Your integrated solution for production needs.</p>
           <div style={{borderColor: 'red'}} className="absolute top-0 right-0 border-2 rounded-md p-2">
                <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1 text-red-700">Влез като:</label>
                <select
                    id="user-role"
                    value={currentUser.role}
                    onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        setCurrentUser(prev => ({...prev, role: newRole}));
                        // If switching away from admin, make sure the admin view is not active
                        if (newRole === 'Служител' && activeView === 'admin') {
                            setActiveView('mix');
                        }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option>Служител</option>
                    <option>Администратор</option>
                </select>
            </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="border-b border-gray-300 flex justify-center space-x-2">
            <button
              onClick={() => setActiveView('mix')}
              className={navButtonClasses('mix')}
            >
              Калкулатор за смеси
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={navButtonClasses('history')}
            >
              История на партидите
            </button>
            <button
              onClick={() => setActiveView('label')}
              className={navButtonClasses('label')}
            >
              Генератор на етикети
            </button>
             {currentUser.role === 'Администратор' && (
               <button
                  onClick={() => setActiveView('admin')}
                  className={navButtonClasses('admin')}
                >
                  Админ Панел
                </button>
             )}
          </div>

          <main className="mt-[-1px]">
            {activeView === 'mix' && <MixCalculator currentUser={currentUser} batchToLoadId={batchToLoad} onBatchLoaded={() => setBatchToLoad(null)} />}
            {activeView === 'history' && <BatchHistory onLoadBatch={handleLoadBatchFromHistory} currentUser={currentUser} />}
            {activeView === 'label' && <LabelGenerator currentUser={currentUser} />}
            {activeView === 'admin' && currentUser.role === 'Администратор' && <AdminPanel currentUser={currentUser} />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
