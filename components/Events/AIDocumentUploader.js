/**
 * AI Document Uploader Component
 * File: components/Events/AIDocumentUploader.js
 */

function AIDocumentUploader({ eventId, onUploadComplete, onError }) {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [documentLimit, setDocumentLimit] = React.useState(5);
    const [documents, setDocuments] = React.useState([]);

    // Load document limit and existing documents
    React.useEffect(() => {
        const loadData = async () => {
            try {
                const [limit, docs] = await Promise.all([
                    window.aiDocumentAPI.getDocumentLimit(eventId),
                    window.aiDocumentAPI.getDocuments(eventId)
                ]);
                setDocumentLimit(limit);
                setDocuments(docs);
            } catch (error) {
                console.error('Failed to load document data:', error);
            }
        };
        loadData();
    }, [eventId]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleFileUpload = async (file) => {
        if (documentLimit <= 0) {
            window.showToast('Document limit reached (5 documents per event)', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const document = await window.aiDocumentAPI.uploadDocument(eventId, file);
            
            clearInterval(progressInterval);
            setUploadProgress(100);

            // Add to documents list
            setDocuments(prev => [document, ...prev]);
            setDocumentLimit(prev => prev - 1);

            // Process with AI
            setTimeout(async () => {
                try {
                    const suggestions = await window.aiDocumentAPI.processDocument(document.id, eventId);
                    
                    if (onUploadComplete) {
                        onUploadComplete(document, suggestions);
                    }
                    
                    window.showToast('Document analyzed successfully!', 'success');
                } catch (error) {
                    console.error('AI processing error:', error);
                    window.showToast('Document uploaded but AI analysis failed', 'warning');
                }
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            window.showToast(error.message || 'Upload failed', 'error');
            if (onError) {
                onError(error);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteDocument = async (documentId) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await window.aiDocumentAPI.deleteDocument(documentId);
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
            setDocumentLimit(prev => prev + 1);
            window.showToast('Document deleted successfully', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            window.showToast('Failed to delete document', 'error');
        }
    };

    const getFileTypeIcon = (fileType) => {
        if (fileType === 'application/pdf') return 'fas fa-file-pdf text-red-500';
        if (fileType.includes('word') || fileType.includes('document') || fileType === 'application/msword') return 'fas fa-file-word text-blue-500';
        if (fileType.includes('excel') || fileType.includes('sheet') || fileType === 'application/vnd.ms-excel') return 'fas fa-file-excel text-green-500';
        if (fileType === 'text/plain' || fileType === 'text/rtf' || fileType === 'text/csv') return 'fas fa-file-alt text-yellow-500';
        if (fileType.startsWith('image/')) return 'fas fa-file-image text-purple-500';
        return 'fas fa-file text-gray-500';
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
            processing: { color: 'bg-blue-100 text-blue-800', text: 'Analyzing...' },
            completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
            error: { color: 'bg-red-100 text-red-800', text: 'Error' }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        return React.createElement('span', {
            className: `px-2 py-1 text-xs rounded-full ${config.color}`
        }, config.text);
    };

    return React.createElement('div', {
        className: 'space-y-4'
    }, [
        // Upload Zone
        React.createElement('div', {
            key: 'upload-zone',
            className: `ai-document-upload-zone border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                isDragOver 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`
        }, [
            React.createElement('div', {
                key: 'upload-content',
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
                onClick: () => !isUploading && document.getElementById('ai-document-upload').click()
            }, [
                // Upload Icon
                React.createElement('div', {
                    key: 'upload-icon',
                    className: 'mb-4'
                }, React.createElement('i', {
                    className: `ai-document-upload-icon fas fa-cloud-upload-alt text-4xl ${
                        isDragOver ? 'text-indigo-500' : 'text-gray-400'
                    }`
                })),
                
                // Upload Text
                React.createElement('h3', {
                    key: 'upload-title',
                    className: 'ai-document-upload-title text-lg font-medium text-gray-900 mb-2'
                }, 'Upload Document for AI Analysis'),
                
                React.createElement('p', {
                    key: 'upload-description',
                    className: 'ai-document-upload-description text-sm text-gray-600 mb-4'
                }, 'Drag and drop a file here, or click to select'),
                
                // File Type Badges
                React.createElement('div', {
                    key: 'file-types',
                    className: 'ai-document-file-badges flex flex-wrap justify-center gap-2 mb-4'
                }, [
                    React.createElement('span', {
                        key: 'pdf-badge',
                        className: 'px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full'
                    }, 'PDF'),
                    React.createElement('span', {
                        key: 'word-badge',
                        className: 'px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full'
                    }, 'Word (.doc, .docx)'),
                    React.createElement('span', {
                        key: 'excel-badge',
                        className: 'px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full'
                    }, 'Excel (.xls, .xlsx)'),
                    React.createElement('span', {
                        key: 'text-badge',
                        className: 'px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full'
                    }, 'Text (.txt, .rtf, .csv)'),
                    React.createElement('span', {
                        key: 'image-badge',
                        className: 'px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full'
                    }, 'Images')
                ]),
                
                // Document Counter
                React.createElement('div', {
                    key: 'document-counter',
                    className: 'text-sm text-gray-500'
                }, `${documents.length}/5 documents uploaded`),
                
                // Progress Bar
                isUploading && React.createElement('div', {
                    key: 'progress-bar',
                    className: 'mt-4'
                }, [
                    React.createElement('div', {
                        key: 'progress-bg',
                        className: 'w-full bg-gray-200 rounded-full h-2'
                    }, React.createElement('div', {
                        key: 'progress-fill',
                        className: 'bg-indigo-500 h-2 rounded-full transition-all duration-300',
                        style: { width: `${uploadProgress}%` }
                    })),
                    React.createElement('p', {
                        key: 'progress-text',
                        className: 'text-xs text-gray-600 mt-1'
                    }, 'Uploading document...')
                ])
            ]),
            
            // Hidden File Input
            React.createElement('input', {
                key: 'file-input',
                id: 'ai-document-upload',
                type: 'file',
                accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,.csv,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/rtf,text/csv',
                onChange: handleFileSelect,
                className: 'hidden'
            })
        ]),

        // Documents List
        documents.length > 0 && React.createElement('div', {
            key: 'documents-list',
            className: 'space-y-2'
        }, [
            React.createElement('h4', {
                key: 'documents-title',
                className: 'text-sm font-medium text-gray-900'
            }, 'Uploaded Documents'),
            
            // Processing Message
            documents.some(doc => doc.processing_status === 'pending') && React.createElement('div', {
                key: 'processing-message',
                className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'
            }, [
                React.createElement('div', {
                    key: 'processing-content',
                    className: 'flex items-center space-x-3'
                }, [
                    React.createElement('div', {
                        key: 'spinner',
                        className: 'animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent'
                    }),
                    React.createElement('div', {
                        key: 'processing-text',
                        className: 'flex-1'
                    }, [
                        React.createElement('p', {
                            key: 'processing-title',
                            className: 'text-sm font-medium text-blue-900'
                        }, 'AI Analysis in Progress'),
                        React.createElement('p', {
                            key: 'processing-description',
                            className: 'text-xs text-blue-700 mt-1'
                        }, 'Please wait a few moments while we analyze your document and generate task suggestions...'),
                        React.createElement('div', {
                            key: 'processing-docs',
                            className: 'mt-2 space-y-1'
                        }, [
                            ...documents
                                .filter(doc => doc.processing_status === 'pending')
                                .map(doc => React.createElement('div', {
                                    key: `processing-${doc.id}`,
                                    className: 'flex items-center space-x-2 text-xs text-blue-600'
                                }, [
                                    React.createElement('i', {
                                        key: 'doc-icon',
                                        className: getFileTypeIcon(doc.file_type)
                                    }),
                                    React.createElement('span', {
                                        key: 'doc-name'
                                    }, doc.file_name)
                                ]))
                        ])
                    ])
                ])
            ]),
            
            ...documents.map(doc => React.createElement('div', {
                key: doc.id,
                className: 'ai-document-item flex items-center justify-between p-3 bg-gray-50 rounded-lg'
            }, [
                React.createElement('div', {
                    key: 'doc-info',
                    className: 'flex items-center space-x-3'
                }, [
                    React.createElement('i', {
                        key: 'doc-icon',
                        className: getFileTypeIcon(doc.file_type)
                    }),
                    React.createElement('div', {
                        key: 'doc-details'
                    }, [
                        React.createElement('p', {
                            key: 'doc-name',
                            className: 'ai-document-item-name text-sm font-medium text-gray-900'
                        }, doc.file_name),
                        React.createElement('div', {
                            key: 'doc-meta',
                            className: 'flex items-center space-x-2 text-xs text-gray-500'
                        }, [
                            React.createElement('span', {
                                key: 'doc-size'
                            }, `${(doc.file_size / 1024 / 1024).toFixed(1)}MB`),
                            React.createElement('span', {
                                key: 'doc-date'
                            }, new Date(doc.uploaded_at).toLocaleDateString()),
                            getStatusBadge(doc.processing_status)
                        ])
                    ])
                ]),
                
                React.createElement('div', {
                    key: 'doc-actions',
                    className: 'ai-document-item-actions flex items-center'
                }, React.createElement('button', {
                    key: 'delete-btn',
                    onClick: () => handleDeleteDocument(doc.id),
                    className: 'text-gray-400 hover:text-red-500 transition-colors',
                    disabled: doc.processing_status === 'processing'
                }, React.createElement('i', {
                    className: 'fas fa-trash text-sm'
                })))
            ]))
        ])
    ]);
}

window.AIDocumentUploader = AIDocumentUploader;
