// Test PDF parsing locally
// Run this in the browser console

async function testPDFParsing() {
    try {
        // Get the most recent document
        const eventId = '8ce6ca22-fe11-4035-8da0-a68a65ede951';
        const { data: documents, error: docsError } = await window.supabaseClient
            .from('event_documents')
            .select('*')
            .eq('event_id', eventId)
            .order('uploaded_at', { ascending: false })
            .limit(1);
            
        if (docsError) {
            console.error('Documents error:', docsError);
            return;
        }
        
        if (!documents || documents.length === 0) {
            console.log('No documents found');
            return;
        }
        
        const document = documents[0];
        console.log('Testing with document:', document);
        
        // Download the file
        const { data: fileData, error: fileError } = await window.supabaseClient.storage
            .from('event-documents')
            .download(document.file_path);
            
        if (fileError) {
            console.error('File download error:', fileError);
            return;
        }
        
        console.log('File downloaded successfully, size:', fileData.size, 'type:', fileData.type);
        
        // Try to read as text (for debugging)
        const text = await fileData.text();
        console.log('File content preview (first 500 chars):', text.substring(0, 500));
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testPDFParsing();
