function KnowledgeBaseContent({ 
  events, 
  activeEventId, 
  setActiveEventId, 
  documents, 
  uploading, 
  setUploading, 
  loadingEvents, 
  loadEventDocuments,
  handleFileUpload
}) {
  try {
    // Add preview state at the top
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [previewDoc, setPreviewDoc] = React.useState(null);
    const [pdfLoading, setPdfLoading] = React.useState(false);
    const canvasRef = React.useRef(null);

    const handleDeleteDocument = async (doc) => {
      if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

      try {
        await window.knowledgeBaseAPI.deleteDocument(doc.id, doc.storage_path);
        window.showToast?.('Document deleted successfully', 'success');
        await loadEventDocuments(activeEventId);
      } catch (err) {
        window.showToast?.(`Failed to delete document: ${err.message}`, 'error');
        reportError(err);
      }
    };

    const handlePreviewDocument = async (doc) => {
      
      if (!doc.storage_path) {
        window.showToast?.('Document storage path not available', 'error');
        return;
      }

      try {
        setPdfLoading(true);
        setPreviewDoc(doc);
        
        // Generate signed URL
        const { data, error } = await window.supabaseClient.storage
          .from('knowledge')
          .createSignedUrl(doc.storage_path, 300);
        
        if (error) throw new Error(`Failed to generate URL: ${error.message}`);
        
        // Fetch and create blob URL
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        setPreviewUrl(blobUrl);
        window.showToast?.('Document loaded successfully', 'success');
      } catch (err) {
        window.showToast?.(`Unable to load document: ${err.message}`, 'error');
        setPdfLoading(false);
      }
    };

    // PDF.js rendering effect
    React.useEffect(() => {
      if (previewUrl && canvasRef.current && window.pdfjsLib) {
        window.pdfjsLib.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        window.pdfjsLib.getDocument(previewUrl).promise
          .then(pdf => {
            return pdf.getPage(1);
          })
          .then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            return page.render(renderContext).promise;
          })
          .then(() => {
            setPdfLoading(false);
          })
          .catch(err => {
            setPdfLoading(false);
            window.showToast?.('Failed to render PDF preview', 'error');
          });
      }
    }, [previewUrl]);

    const closePreview = () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPreviewDoc(null);
      setPdfLoading(false);
    };

    if (loadingEvents) {
      return React.createElement('div', { className: 'container mx-auto px-4 py-8' },
        React.createElement('div', { className: 'text-center' },
          React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mx-auto' }),
          React.createElement('p', { className: 'mt-2' }, 'Loading events...')
        )
      );
    }


    if (events.length === 0 && !loadingEvents) {
      return React.createElement('div', { className: 'container mx-auto px-4 py-8' },
        React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Knowledge Base'),
        React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 text-center' },
          React.createElement('p', { className: 'text-gray-500 mb-4' }, 'No events found. Create an event to access documents.'),
          React.createElement('button', {
            onClick: () => window.location.hash = '#/event-form',
            className: 'px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700'
          }, 'Create Event')
        )
      );
    }

    const activeEvent = events.find(e => e.id === activeEventId);

    return React.createElement('div', {
      'data-name': 'knowledge-base-content',
      className: 'container mx-auto px-4 py-8'
    },
      React.createElement('div', { className: 'flex justify-between items-center mb-6' },
        React.createElement('h1', { className: 'text-2xl font-bold' }, 'Knowledge Base'),
        React.createElement('button', {
          onClick: () => loadEventDocuments(activeEventId),
          className: 'px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600'
        },
          React.createElement('i', { className: 'fas fa-refresh mr-1' }),
          'Refresh'
        )
      ),
      window.EventTabsSection ? React.createElement(window.EventTabsSection, {
        events,
        activeEventId,
        setActiveEventId,
        activeEvent,
        handleFileUpload,
        uploading
      }) : null,
      window.DocumentsListSection ? React.createElement(window.DocumentsListSection, {
        documents,
        handleDeleteDocument,
        onPreviewDocument: handlePreviewDocument
      }) : null,
      
      // PDF Preview with PDF.js canvas rendering
      previewUrl && React.createElement('div', { className: 'mt-6 bg-white rounded-lg shadow p-4' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold' }, 
            previewDoc ? `Preview: ${previewDoc.file_name}` : 'Document Preview'
          ),
          React.createElement('button', {
            onClick: closePreview,
            className: 'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200'
          }, 'Close Preview')
        ),
        
        pdfLoading && React.createElement('div', { className: 'text-center py-8' },
          React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mx-auto mb-2' }),
          React.createElement('p', { className: 'text-gray-600' }, 'Loading PDF...')
        ),
        
        React.createElement('div', { className: 'text-center' },
          React.createElement('canvas', {
            ref: canvasRef,
            className: 'border rounded shadow-sm mx-auto',
            style: { maxWidth: '100%', height: 'auto' }
          })
        ),
        
        React.createElement('div', { className: 'mt-4 text-center' },
          React.createElement('a', {
            href: previewUrl,
            download: previewDoc?.file_name || 'document.pdf',
            className: 'inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
          },
            React.createElement('i', { className: 'fas fa-download mr-2' }),
            'Download PDF'
          )
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.KnowledgeBaseContent = KnowledgeBaseContent;
