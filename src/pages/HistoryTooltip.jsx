import React, { useState } from 'react';
import { UisHistory } from '@iconscout/react-unicons-solid';
import { X } from 'lucide-react';

const HistoryTooltip = ({ changeHistory, entryDetails }) => {
  const [showHistory, setShowHistory] = useState(false);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day}-${year} ${hours}:${minutes}`;
  };

  const formatFieldName = (field) => {
    const fieldMap = {
      'project': 'Project Name',
      'project_id': 'Project',
      'date': 'Date',
      'start_time': 'Start Time',
      'end_time': 'End Time',
      'description': 'Work Description',
      'total_hours': 'Total Hours',
      'employee_name': 'Employee Name',
      'status': 'Ticket Status'
    };
    return fieldMap[field] ||
      field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const flattenedHistory = changeHistory?.flatMap(group =>
    group.changes.map(change => ({
      dateTime: group.changedAt,
      updatedBy: group.changed_by_name || group.changedBy || "N/A",
      columnName: formatFieldName(change.field),
      oldValue: change.from,
      newValue: change.to,
      action: group.action || (change.field === 'assigned_user' ? 'CREATE' : 'UPDATE'),
    }))
  ).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)) || [];

  return (
  <>
    <div className="relative inline-block">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="p-1 text-gray-600temp hover:text-gray-800temp transition-colors"
        title="View change history"
      >
        <UisHistory size="16" />
      </button>
    </div>

    {showHistory && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl border dark:bg-gray-900 dark:border-gray-700 shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col m-2">
          
          <div className="bg-white dark:bg-gray-800 border-b px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800temp truncate dark:text-white">
                Change History Details
              </h3>
              {entryDetails && (
                <p className="text-xs sm:text-sm text-gray-600temp mt-1 truncate">
                  {entryDetails.employeeName} • {entryDetails.projectName} • {entryDetails.date} • {entryDetails.hoursWorked}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-600temp hover:text-gray-900temp transition-colors p-1 sm:p-2 rounded-full hover:bg-gray-200 ml-2 flex-shrink-0"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-3 sm:p-6">
              {flattenedHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <UisHistory size={24} className="text-gray-400temp sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-gray-500temp text-xs sm:text-sm">
                      No changes recorded for this entry.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sm:hidden space-y-3">
                    {flattenedHistory.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-500temp">Date & Time</p>
                              <p className="text-sm font-semibold">{formatDateTime(item.dateTime)}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              item.action === 'CREATE' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              {item.action}
                            </span>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500temp">Updated By</p>
                            <p className="text-sm">{item.updatedBy || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500temp">Column Name</p>
                            <p className="text-sm font-medium">{item.columnName}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500temp">Old Value</p>
                              <p className="text-sm text-gray-500temp break-words">{item.oldValue || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500temp">New Value</p>
                              <p className="text-sm text-gray-500temp break-words">{item.newValue || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block border rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray50-temp">
                        <tr>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider whitespace-nowrap">
                            Date & Time
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider whitespace-nowrap">
                            Updated By
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider">
                            Column Name
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider">
                            Old Value
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider">
                            New Value
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-bold text-gray-500temp uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {flattenedHistory.map((item, index) => (
                          <tr key={index} className="hover:bg-gray50-temp">
                            <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-900temp">
                              {formatDateTime(item.dateTime)}
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-900temp">
                              {item.updatedBy || 'N/A'}
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900temp">
                              {item.columnName}
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-500temp max-w-xs break-words">
                              {item.oldValue || '—'}
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-500temp max-w-xs break-words">
                              {item.newValue || '—'}
                            </td>
                            <td
                              className={`px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-bold ${
                                item.action === 'CREATE'
                                  ? 'text-blue-600'
                                  : 'text-yellow-600'
                              }`}
                            >
                              {item.action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-gray50-temp border-t px-4 py-3 sm:px-6 sm:py-3 flex-shrink-0">
            <div className="flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    )}
  </>
);
};

export default HistoryTooltip;