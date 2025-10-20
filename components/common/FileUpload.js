function FileUpload({ 
  type, 
  resourceType, 
  onUploadComplete, 
  maxFiles = 1,
  accept,
  className 
}) {
  try {
    const [files, setFiles] = React.useState([]);
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [progress, setProgress] = React.useState(0);
    const [previewUrls, setPreviewUrls] = React.useState([]);

    // Cleanup preview URLs on unmount or when files change
    React.useEffect(() => {
      return () => {
        previewUrls.forEach(url => revokePreviewUrl(url));
      };
    }, [previewUrls]);

    const handleFileSelect = async (event) => {
      try {
        setError(null);
        const selectedFiles = Array.from(event.target.files);

        if (selectedFiles.length > maxFiles) {
          setError(`Maximum ${maxFiles} files allowed`);
          return;
        }

        // Clean up previous preview URLs
        previewUrls.forEach(url => revokePreviewUrl(url));

        // Validate each file and create preview URLs
        const newPreviewUrls = [];
        for (const file of selectedFiles) {
          try {
            await validateFile(file, type);
            
            // Create preview URL for images
            if (file.type.startsWith('image/')) {
              const previewUrl = createPreviewUrl(file);
              if (previewUrl) {
                newPreviewUrls.push(previewUrl);
              }
            }
          } catch (validationError) {
            setError(`${file.name}: ${validationError.message}`);
            return;
          }
        }

        setFiles(selectedFiles);
        setPreviewUrls(newPreviewUrls);
      } catch (err) {
        setError('Error selecting files');
      }
    };

    const handleUpload = async () => {
      try {
        setUploading(true);
        setError(null);
        setProgress(0);

        const userId = localStorage.getItem('currentUserId');
        const uploadedFiles = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgress(Math.round((i / files.length) * 100));

          const uploadedFile = await uploadFile(file, type, userId, resourceType);
          uploadedFiles.push(uploadedFile);
        }

        setProgress(100);
        onUploadComplete?.(uploadedFiles);
        
        // Clean up preview URLs and reset state
        previewUrls.forEach(url => revokePreviewUrl(url));
        setFiles([]);
        setPreviewUrls([]);
      } catch (err) {
        setError(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div data-name="file-upload" className={className}>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            onChange={handleFileSelect}
            accept={accept}
            multiple={maxFiles > 1}
            disabled={uploading}
            className="hidden"
            id="file-input"
          />
          
          <label
            htmlFor="file-input"
            className="cursor-pointer block"
          >
            <div className="text-gray-600 mb-4">
              <i className="fas fa-cloud-upload-alt text-3xl mb-2"></i>
              <p>
                {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: {MAX_FILE_SIZES[type] / (1024 * 1024)}MB
              </p>
            </div>
          </label>

          {files.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">
                Selected files ({files.length}):
              </div>
              
              {/* Image previews */}
              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <ul className="text-left">
                {files.map((file, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {file.name} ({(file.size / 1024).toFixed(1)}KB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="mt-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded">
                <div
                  className="h-full bg-indigo-600 rounded transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {progress}% complete
              </div>
            </div>
          )}

          {files.length > 0 && !uploading && (
            <button
              onClick={handleUpload}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
            >
              Upload Files
            </button>
          )}
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
