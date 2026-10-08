const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg w-[450px] overflow-hidden shadow-xl">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900temp">{title}</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-700temp">{message}</p>
          {type === 'detail' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Warning:</strong> This will include all pricing details including unit prices and quantities.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray50-temp">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700temp bg-white border border-gray-300 rounded-lg hover:bg-gray50-temp focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;