/**
 * Unsubscribed Page Component
 * Displays confirmation when users unsubscribe from marketing emails
 * File: components/Pages/Unsubscribed.js
 */

function Unsubscribed() {
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

