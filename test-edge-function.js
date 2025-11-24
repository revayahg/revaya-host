// Test script to debug the Edge Function
// Run this in the browser console

async function testEdgeFunction() {
    try {
        // Get current user
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        console.log('Current user:', user?.email, 'ID:', user?.id);
        
        if (userError) {
            console.error('User error:', userError);
            return;
        }
        
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
        
        // Call the Edge Function directly
        console.log('Calling Edge Function...');
        const { data, error } = await window.supabaseClient.functions.invoke(
            'analyze-document-for-tasks',
            {
                body: {
                    document_id: document.id,
                    event_id: eventId
                }
            }
        );
        
        if (error) {
            console.error('Edge Function error:', error);
        } else {
            console.log('Edge Function response:', data);
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testEdgeFunction();
