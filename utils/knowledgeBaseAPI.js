// Knowledge Base API utilities with messaging integration
const SUPABASE_URL = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url;

async function uploadDocument(file, eventId, threadId = null, sharedVia = 'upload') {
  try {
    const session = await window.getSessionWithRetry?.(3, 150);
    if (!session?.access_token) throw new Error('Not authenticated');

    // Validate file
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Allow all image mime types
    const isImage = file.type.startsWith('image/');
    if (!allowedTypes.includes(file.type) && !isImage) {
      throw new Error('Invalid file type. Only PDF, DOCX, and image files are allowed.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `events/${eventId}/${fileName}`;


    // Upload using Supabase client
    const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
      .from('knowledge')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }


    // Generate signed URL for the uploaded file
    const { data: signedData, error: signedError } = await window.supabaseClient.storage
      .from('knowledge')
      .createSignedUrl(filePath, 3600);

    if (signedError) {
    }

    const fileUrl = signedData?.signedUrl || null;

    // Determine visibility based on context
    let visibleTo = [];
    let status = 'active';
    
    if (sharedVia === 'message' && threadId) {
      // Get thread participants for visibility
      const { data: participants } = await window.supabaseClient
        .from('thread_participants')
        .select('user_id')
        .eq('thread_id', threadId);
      
      visibleTo = participants?.map(p => p.user_id) || [];
      
      // Check if uploader is a vendor
      const { data: vendorProfile } = await window.supabaseClient
        .from('vendor_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      if (vendorProfile) {
        status = 'pending'; // Vendor uploads need approval
      }
    }

    // Save metadata to database
    const { data: record, error: dbError } = await window.supabaseClient
      .from('knowledge_documents')
      .insert([{
        file_name: file.name,
        event_id: eventId,
        uploaded_by: session.user.id,
        storage_path: filePath,
        file_type: file.type,
        file_size: file.size,
        file_url: fileUrl,
        thread_id: threadId,
        shared_via: sharedVia,
        visible_to: visibleTo,
        status: status,
        tags: [] // Auto-populated by trigger
      }])
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await window.supabaseClient.storage
        .from('knowledge')
        .remove([filePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return record;
  } catch (error) {
    throw error;
  }
}

async function approveDocument(documentId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('knowledge_documents')
      .update({ status: 'active' })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

async function trackDownload(documentId, userId) {
  try {
    const { data: doc } = await window.supabaseClient
      .from('knowledge_documents')
      .select('downloaded_by')
      .eq('id', documentId)
      .single();

    const downloads = doc?.downloaded_by || [];
    const downloadRecord = {
      user_id: userId,
      downloaded_at: new Date().toISOString()
    };

    const { error } = await window.supabaseClient
      .from('knowledge_documents')
      .update({
        downloaded_by: [...downloads, downloadRecord]
      })
      .eq('id', documentId);

    if (error) throw error;
  } catch (error) {
  }
}

async function deleteDocument(documentId, storagePath) {
  try {
    const { error: dbError } = await window.supabaseClient
      .from('knowledge_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) throw new Error(`Database deletion failed: ${dbError.message}`);

    const { error: storageError } = await window.supabaseClient.storage
      .from('knowledge')
      .remove([storagePath]);

    if (storageError) {
    }

    return true;
  } catch (error) {
    throw error;
  }
}

// Export functions to window for global access
window.knowledgeBaseAPI = {
  uploadDocument,
  deleteDocument,
  approveDocument,
  trackDownload
};
