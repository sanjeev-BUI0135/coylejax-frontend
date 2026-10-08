import { useState } from 'react';
import MasterDataTable from '../components/MasterData/MasterDataTable';
import { tabs, baseColumns, config } from '../config/masterDataConfig';
import MarkupSettings from '../components/MasterData/MarkupSettings';

const MasterDataManagement = () => {
  const [activeTab, setActiveTab] = useState('locations');

  const tableConfig = config[activeTab];
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const permissions = user.permissions || [];
  const masterDataPerm = permissions.find(p => p.module === 'Settings') || {};

  const canView = masterDataPerm.canView ?? true;
  const canAdd = masterDataPerm.canAdd ?? true;
  const canUpdate = masterDataPerm.canUpdate ?? true;
  const canDelete = masterDataPerm.canDelete ?? true;

  return (
    <div>
      <div>
        <div className="mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Master Data Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system-wide reference data</p>
        </div>

        <div className="flex overflow-x-auto gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'markup' ? (
          <MarkupSettings canUpdate={canUpdate} />
        ) : (
          <MasterDataTable
            key={activeTab}
            type={activeTab}
            title={tableConfig.title}
            columns={baseColumns}
            showHourlyRate={tableConfig.showHourlyRate}
            canView={canView}
            canAdd={canAdd}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        )}
      </div>
    </div>
  );
};

export default MasterDataManagement;
