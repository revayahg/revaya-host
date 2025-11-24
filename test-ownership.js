// Test script to verify event ownership and RLS policies
// Run this in the browser console

async function testEventOwnership() {
    try {
        // Get current user
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        console.log('Current user:', user?.email, 'ID:', user?.id);
        
        if (userError) {
            console.error('User error:', userError);
            return;
        }
        
        // Get the event you're trying to upload to
        const eventId = '8ce6ca22-fe11-4035-8da0-a68a65ede951';
        
        // Check event ownership
        const { data: event, error: eventError } = await window.supabaseClient
            .from('events')
            .select('id, name, user_id, documents_processed_count')
            .eq('id', eventId)
            .single();
            
        console.log('Event data:', event);
        console.log('Event owner ID:', event?.user_id);
        console.log('Current user ID:', user?.id);
        console.log('Is owner?', event?.user_id === user?.id);
        
        if (eventError) {
            console.error('Event error:', eventError);
            return;
        }
        
        // Test storage upload with a simple text file
        const testContent = new Blob(['Test content'], { type: 'text/plain' });
        const testFileName = `test-${Date.now()}.txt`;
        const testPath = `${eventId}/${testFileName}`;
        
        console.log('Testing storage upload...');
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('event-documents')
            .upload(testPath, testContent);
            
        if (uploadError) {
            console.error('Storage upload error:', uploadError);
        } else {
            console.log('Storage upload success:', uploadData);
            
            // Clean up test file
            await window.supabaseClient.storage
                .from('event-documents')
                .remove([testPath]);
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testEventOwnership();
