function DocumentsListSection({ documents, handleDeleteDocument, onPreviewDocument }) {
  try {
    const [loading, setLoading] = React.useState(false);
    const [loadingDocId, setLoadingDocId] = React.useState(null);

    const handleViewDocument = async (doc) => {
      if (!onPreviewDocument) {
        return;
      }

      setLoading(true);
      setLoadingDocId(doc.id);
      try {
        await onPreviewDocument(doc);
      } catch (err) {
      } finally {
        setLoading(false);
        setLoadingDocId(null);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Documents ({documents.length})</h2>
        </div>
        {documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fas fa-folder-open text-4xl mb-4 text-gray-300"></i>
            <p>No documents found for this event.</p>
            <p className="text-sm">Upload your first document above.</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.file_name}</h3>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                      {doc.file_size && ` • ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Type: {doc.file_type || 'Unknown'} • Path: {doc.storage_path ? 'Available' : 'Missing'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDocument(doc)}
                      disabled={loading && loadingDocId === doc.id}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50"
                    >
                      <i className="fas fa-eye mr-1"></i>
                      {loading && loadingDocId === doc.id ? 'Loading...' : 'View'}
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      <i className="fas fa-trash mr-1"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.DocumentsListSection = DocumentsListSection;
