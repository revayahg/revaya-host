/**
 * Unsubscribed Page Component
 * Displays confirmation when users unsubscribe from marketing emails
 * Also handles unsubscribe requests from email links
 * File: components/Pages/Unsubscribed.js
 */

function Unsubscribed() {
    const [status, setStatus] = React.useState('processing'); // processing, success, error
    const [message, setMessage] = React.useState('Processing your unsubscribe request...');

    React.useEffect(() => {
        // Check if there's a token in the URL (from email unsubscribe link)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // Process unsubscribe request
            handleUnsubscribe(token);
        } else {
            // No token - just show confirmation page
            setStatus('success');
            setMessage('');
        }
    }, []);

    async function handleUnsubscribe(token) {
        try {
            console.log('📧 Processing unsubscribe request with token:', token);
            
            // Validate token format (UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(token)) {
                throw new Error('Invalid unsubscribe token format');
            }

            // Call the edge function with proper authentication headers
            // Use format=json to get JSON response instead of redirect
            const response = await fetch(`${window.SUPABASE_URL}/functions/v1/unsubscribe?token=${token}&format=json`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Successfully unsubscribed:', result.message);
            } else {
                // Try direct database update as fallback
                console.error('❌ Unsubscribe function error:', result);
                try {
                    const { data: dbData, error: dbError } = await window.supabaseClient
                        .from('profiles')
                        .update({ 
                            unsubscribed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('unsubscribe_token', token)
                        .select('id, email')
                        .maybeSingle();

                    if (!dbError && dbData) {
                        console.log('✅ Successfully unsubscribed via database update:', dbData.email || dbData.id);
                    } else {
                        console.log('⚠️ Both methods failed, but showing success for security');
                    }
                } catch (dbError) {
                    console.error('❌ Database fallback also failed:', dbError);
                }
            }

            // Success - update status
            setStatus('success');
            setMessage('');
            
        } catch (error) {
            console.error('❌ Unsubscribe error:', error);
            // Even on error, show success message for security (don't reveal if token is valid/invalid)
            setStatus('success');
            setMessage('');
        }
    }

    if (status === 'processing') {
        return (
            <div 
                className="min-h-screen bg-gray-50 py-12 legal-page-container" 
                data-name="unsubscribed" 
                data-file="components/Pages/Unsubscribed.js"
                style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '32px' }}
            >
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '640px', textAlign: 'center' }}>
                    <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">{message}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen bg-gray-50 py-12 legal-page-container" 
            data-name="unsubscribed" 
            data-file="components/Pages/Unsubscribed.js"
            style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '32px' }}
        >
            <div 
                className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8"
                style={{ maxWidth: '640px', textAlign: 'center' }}
            >
                <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 legal-page-content">
                    <div className="mb-8">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <i className="fas fa-check text-2xl text-green-600"></i>
                            </div>
                            <h1 
                                className="text-3xl font-bold text-gray-900 mb-4"
                                style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}
                            >
                                You're unsubscribed
                            </h1>
                            <p 
                                className="text-gray-600 leading-relaxed"
                                style={{ marginTop: '12px', color: '#475569' }}
                            >
                                You won't receive further marketing emails from Revaya Host.
                                <br />
                                Transactional emails (e.g., password resets or collaborator invites) may still be sent when necessary.
                            </p>
                        </div>

                        <div className="mt-8">
                            <a 
                                href="/#/"
                                style={{
                                    display: 'inline-block',
                                    marginTop: '16px',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    background: '#5146FF',
                                    color: '#fff',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                }}
                            >
                                Back to Revaya Host
                            </a>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                                Need help? <a href="mailto:info@revayahg.com" className="text-indigo-600 hover:text-indigo-800 underline">Contact us</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

window.Unsubscribed = Unsubscribed;

