/**
 * AI Document API - Handles document upload, processing, and AI analysis
 * File: utils/aiDocumentAPI.js
 */

window.aiDocumentAPI = {
    /**
     * Upload a document for AI analysis
     * @param {string} eventId - The event ID
     * @param {File} file - The file to upload
     * @returns {Promise<Object>} Document record
     */
    async uploadDocument(eventId, file) {
        try {
            // Check document limit first
            const limit = await this.getDocumentLimit(eventId);
            if (limit <= 0) {
                throw new Error('Document limit reached (5 documents per event)');
            }

            // Validate file type - expanded to include more document formats
            const allowedTypes = [
                // PDF
                'application/pdf',
                // Word documents
                'application/msword', // .doc
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                // Excel documents
                'application/vnd.ms-excel', // .xls
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                // Text documents
                'text/plain', // .txt
                'text/rtf', // .rtf
                'text/csv', // .csv
                // Images
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/svg+xml',
                'image/webp',
                'image/bmp',
                'image/tiff',
                'image/x-icon'
            ];

            if (!allowedTypes.includes(file.type)) {
                throw new Error('Unsupported file type. Please upload PDF, Word, Excel, or image files.');
            }

            // Validate file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error('File size exceeds 10MB limit');
            }

            // Generate unique file path
            const fileExtension = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
            const filePath = `${eventId}/${fileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                .from('event-documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                const message = uploadError.message || '';
                if (message.toLowerCase().includes('permission denied') || message.toLowerCase().includes('not authorized')) {
                    throw new Error('You do not have permission to upload documents for this event. Only owners and editors can upload files.');
                }
                throw new Error(`Upload failed: ${message}`);
            }

            // Create document record in database
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            
            const { data: document, error: dbError } = await window.supabaseClient
                .from('event_documents')
                .insert({
                    event_id: eventId,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    file_type: file.type,
                    uploaded_by: user.id,
                    processing_status: 'pending'
                })
                .select()
                .single();

            if (dbError) {
                // Clean up uploaded file if database insert fails
                await window.supabaseClient.storage
                    .from('event-documents')
                    .remove([filePath]);
                
                throw new Error(`Database error: ${dbError.message}`);
            }

            // Get current count and increment
            const { data: eventData } = await window.supabaseClient
                .from('events')
                .select('documents_processed_count')
                .eq('id', eventId)
                .single();
            
            const newCount = (eventData?.documents_processed_count || 0) + 1;
            
            await window.supabaseClient
                .from('events')
                .update({ documents_processed_count: newCount })
                .eq('id', eventId);

            return document;

        } catch (error) {
            console.error('Upload document error:', error);
            throw error;
        }
    },

    /**
     * Process a document with AI analysis
     * @param {string} documentId - The document ID
     * @param {string} eventId - The event ID
     * @returns {Promise<Array>} AI suggestions
     */
    async processDocument(documentId, eventId) {
        try {
            // Call the edge function
            const { data, error } = await window.supabaseClient.functions.invoke(
                'analyze-document-for-tasks',
                {
                    body: {
                        document_id: documentId,
                        event_id: eventId
                    }
                }
            );

            if (error) {
                // Extract more detailed error message
                const errorMessage = error.message || 'Unknown error';
                const errorDetails = error.context?.error || data?.error || error.details;
                
                let fullMessage = `AI processing failed: ${errorMessage}`;
                if (errorDetails && errorDetails !== errorMessage) {
                    fullMessage += ` (${errorDetails})`;
                }
                
                throw new Error(fullMessage);
            }

            if (!data || !data.suggestions) {
                throw new Error('No suggestions returned from AI analysis');
            }

            return data.suggestions || [];

        } catch (error) {
            console.error('Process document error:', error);
            
            // Provide more user-friendly error messages
            if (error.message?.includes('AI service not configured')) {
                throw new Error('AI service is not configured. Please contact support.');
            } else if (error.message?.includes('quota exceeded') || error.message?.includes('quota') || data?.code === 'insufficient_quota') {
                throw new Error('AI service quota has been exceeded. Please contact support to add credits to your OpenAI account.');
            } else if (error.message?.includes('rate limit')) {
                throw new Error('AI service is temporarily busy. Please try again in a few moments.');
            } else if (error.message?.includes('Document not found')) {
                throw new Error('Document not found. Please try uploading again.');
            } else if (error.message?.includes('Invalid file')) {
                throw new Error('Invalid file format. Please upload a valid document.');
            } else if (error.message?.includes('timeout') || error.message?.includes('timeout')) {
                throw new Error('Processing timed out. Please try again.');
            }
            
            throw error;
        }
    },

    /**
     * Get all documents for an event
     * @param {string} eventId - The event ID
     * @returns {Promise<Array>} Document records
     */
    async getDocuments(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_documents')
                .select('*')
                .eq('event_id', eventId)
                .order('uploaded_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch documents: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            console.error('Get documents error:', error);
            throw error;
        }
    },

    /**
     * Get remaining document upload limit for an event
     * @param {string} eventId - The event ID
     * @returns {Promise<number>} Remaining uploads (0-5)
     */
    async getDocumentLimit(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('events')
                .select('documents_processed_count')
                .eq('id', eventId)
                .single();

            if (error) {
                throw new Error(`Failed to fetch document limit: ${error.message}`);
            }

            const currentCount = data?.documents_processed_count || 0;
            return Math.max(0, 5 - currentCount);

        } catch (error) {
            console.error('Get document limit error:', error);
            throw error;
        }
    },

    /**
     * Delete a document
     * @param {string} documentId - The document ID
     * @returns {Promise<void>}
     */
    async deleteDocument(documentId) {
        try {
            // Get document record first
            const { data: document, error: fetchError } = await window.supabaseClient
                .from('event_documents')
                .select('file_path, event_id')
                .eq('id', documentId)
                .single();

            if (fetchError) {
                throw new Error(`Failed to fetch document: ${fetchError.message}`);
            }

            // Delete from storage
            const { error: storageError } = await window.supabaseClient.storage
                .from('event-documents')
                .remove([document.file_path]);

            if (storageError) {
                console.warn('Storage deletion failed:', storageError);
            }

            // Delete from database
            const { error: dbError } = await window.supabaseClient
                .from('event_documents')
                .delete()
                .eq('id', documentId);

            if (dbError) {
                throw new Error(`Database deletion failed: ${dbError.message}`);
            }

            // Get current count and decrement
            const { data: eventData } = await window.supabaseClient
                .from('events')
                .select('documents_processed_count')
                .eq('id', document.event_id)
                .single();
            
            const newCount = Math.max(0, (eventData?.documents_processed_count || 0) - 1);
            
            await window.supabaseClient
                .from('events')
                .update({ documents_processed_count: newCount })
                .eq('id', document.event_id);

        } catch (error) {
            console.error('Delete document error:', error);
            throw error;
        }
    },

    /**
     * Get document processing status
     * @param {string} documentId - The document ID
     * @returns {Promise<string>} Processing status
     */
    async getProcessingStatus(documentId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_documents')
                .select('processing_status')
                .eq('id', documentId)
                .single();

            if (error) {
                throw new Error(`Failed to fetch status: ${error.message}`);
            }

            return data?.processing_status || 'unknown';

        } catch (error) {
            console.error('Get processing status error:', error);
            throw error;
        }
    },

    /**
     * Poll for document processing completion
     * @param {string} documentId - The document ID
     * @param {number} maxAttempts - Maximum polling attempts
     * @param {number} interval - Polling interval in ms
     * @returns {Promise<Object>} Document with AI suggestions
     */
    async pollForCompletion(documentId, maxAttempts = 30, interval = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('event_documents')
                    .select('processing_status, ai_suggestions')
                    .eq('id', documentId)
                    .single();

                if (error) {
                    throw new Error(`Polling error: ${error.message}`);
                }

                if (data.processing_status === 'completed') {
                    return data;
                } else if (data.processing_status === 'error') {
                    throw new Error('Document processing failed');
                }

                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, interval));

            } catch (error) {
                if (attempt === maxAttempts - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        throw new Error('Processing timeout - please try again');
    }
};
