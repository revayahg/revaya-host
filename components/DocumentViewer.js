function DocumentViewer({ file_url, file_type, file_name }) {
    try {
        if (!file_url) {
            return (
                <div className="p-4 text-center text-gray-500" data-name="no-document" data-file="components/DocumentViewer.js">
                    No document available.
                </div>
            );
        }

        // Get file type from extension if not provided
        const actualFileType = file_type || getFileTypeFromName(file_name);
        const isImage = isImageFile(file_name, actualFileType);
        const isPDF = isPDFFile(file_name, actualFileType);

        // Image preview
        if (isImage) {
            return (
                <div className="bg-white rounded-lg p-4" data-name="image-preview" data-file="components/DocumentViewer.js">
                    <div className="text-center">
                        <img 
                            src={file_url} 
                            alt={file_name || 'Document'} 
                            className="max-w-full max-h-96 mx-auto rounded shadow-lg object-contain"
                            onLoad={(e) => {
                                e.target.parentElement.querySelector('.error-fallback').style.display = 'none';
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.querySelector('.error-fallback').style.display = 'block';
                            }}
                        />
                        <div className="error-fallback hidden text-center text-red-500 mt-4">
                            <div className="icon-image-off text-4xl text-gray-400 mb-2"></div>
                            <p>Failed to load image.</p>
                            <a href={file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                                Open in new tab
                            </a>
                        </div>
                        {file_name && (
                            <p className="text-sm text-gray-500 mt-2">{file_name}</p>
                        )}
                    </div>
                </div>
            );
        }

        // PDF preview
        if (isPDF) {
            return (
                <div className="bg-gray-50 rounded-lg overflow-hidden" data-name="pdf-preview" data-file="components/DocumentViewer.js">
                    <iframe
                        src={file_url}
                        width="100%"
                        height="600"
                        title={file_name || 'PDF Document'}
                        className="border-none"
                    />
                </div>
            );
        }

        // Fallback for unsupported file types
        return (
            <div className="text-center p-8 bg-gray-50 rounded-lg" data-name="unsupported-preview" data-file="components/DocumentViewer.js">
                <div className="mb-4">
                    <div className="icon-file-text text-4xl text-gray-400 mb-4"></div>
                    <p className="text-gray-600 mb-2">This file type can't be previewed. Please download to view.</p>
                    <p className="text-sm text-gray-500 mb-4">
                        File: {file_name}
                    </p>
                </div>
                <a 
                    href={file_url} 
                    download={file_name}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    <div className="icon-download text-sm mr-2"></div>
                    Download Document
                </a>
            </div>
        );

    } catch (error) {
        return (
            <div className="text-center p-4 text-red-500" data-name="error-state" data-file="components/DocumentViewer.js">
                Error loading document viewer
            </div>
        );
    }
}

// Helper functions for file type detection
function getFileTypeFromName(file_name) {
    try {
        if (!file_name) return '';
        const ext = file_name.split('.').pop().toLowerCase();
        
        const typeMap = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg', 
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        };
        
        return typeMap[ext] || '';
    } catch (error) {
        return '';
    }
}

function isImageFile(file_name, file_type) {
    try {
        if (file_type && file_type.startsWith('image/')) return true;
        if (!file_name) return false;
        const ext = file_name.split('.').pop()?.toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        return imageExtensions.includes(ext);
    } catch (error) {
        return false;
    }
}

function isPDFFile(file_name, file_type) {
    if (file_type === 'application/pdf') return true;
    if (!file_name) return false;
    return file_name.toLowerCase().endsWith('.pdf');
}
