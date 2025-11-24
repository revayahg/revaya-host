// Test OpenAI API directly
// Run this in the browser console

async function testOpenAI() {
    try {
        // Test with a simple prompt
        const testPrompt = `You are an event planning assistant. Generate 2 specific, actionable tasks as JSON array for a wedding event:

[{
  "title": "Task title (max 100 chars)",
  "description": "Detailed description",
  "priority": "high|medium|low",
  "suggested_due_date": "YYYY-MM-DD or null",
  "reasoning": "Brief explanation"
}]`;

        console.log('Testing OpenAI API...');
        const { data, error } = await window.supabaseClient.functions.invoke(
            'analyze-document-for-tasks',
            {
                body: {
                    test: true,
                    prompt: testPrompt
                }
            }
        );
        
        if (error) {
            console.error('OpenAI test error:', error);
        } else {
            console.log('OpenAI test response:', data);
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testOpenAI();
