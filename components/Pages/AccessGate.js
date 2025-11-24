function AccessGate({ supabaseClient, onSuccess }) {
    try {
        const [code, setCode] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!code.trim()) {
                setError('Please enter an access code');
                return;
            }

            setLoading(true);
            setError('');

            try {
                // Validate via RPC (works with RLS)
                const { data: result, error: rpcErr } = await supabaseClient
                    .rpc('validate_access_code', { p_code: code.trim() });

                if (rpcErr) {
                    setError('Unable to validate code. Please try again.');
                    setLoading(false);
                    return;
                }
                
                // Check if the result is valid - handle both boolean and object responses
                let isValid = false;
                let errorMessage = 'Invalid or inactive code';
                
                if (typeof result === 'boolean') {
                    // Handle legacy boolean response
                    isValid = result;
                    errorMessage = result ? '' : 'Invalid or inactive code';
                } else if (result && typeof result === 'object') {
                    // Handle new JSONB response
                    isValid = result.valid === true;
                    errorMessage = result.message || 'Invalid or inactive code';
                }
                
                if (!isValid) {
                    setError(errorMessage);
                    setLoading(false);
                    return;
                }

                // Generate session ID
                const sessionId = crypto.randomUUID();

                try {
                    // Record the visit
                    await supabaseClient
                        .from('access_visits')
                        .insert({
                            session_id: sessionId,
                            code: code.trim()
                        });
                } catch (err) {
                }

                // Set localStorage flags
                localStorage.setItem('access_granted', 'true');
                localStorage.setItem('access_session', sessionId);

                // Success callback
                onSuccess(sessionId);

            } catch (err) {
                setError('An error occurred. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        return React.createElement('div', {
            className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4',
            'data-name': 'access-gate-container',
            'data-file': 'components/AccessGate.js'
        }, 
            React.createElement('div', {
                className: 'bg-white rounded-lg shadow-xl p-8 w-full max-w-md',
                'data-name': 'access-gate-card',
                'data-file': 'components/AccessGate.js'
            },
                React.createElement('div', {
                    className: 'text-center mb-8',
                    'data-name': 'access-gate-header',
                    'data-file': 'components/AccessGate.js'
                },
                    React.createElement('img', {
                        src: 'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/e2ffd31c-f899-4a54-b967-47af3a23b8c9.png',
                        alt: 'My Hollywood Pride',
                        className: 'w-24 h-24 mx-auto mb-4 object-contain'
                    }),
                    React.createElement('h1', {
                        className: 'text-3xl font-bold text-gray-900 mb-2'
                    }, 'Access Required'),
                    React.createElement('p', {
                        className: 'text-gray-600'
                    }, 'Enter your access code to continue')
                ),
                React.createElement('form', {
                    onSubmit: handleSubmit,
                    className: 'space-y-6',
                    'data-name': 'access-gate-form',
                    'data-file': 'components/AccessGate.js'
                },
                    React.createElement('div', null,
                        React.createElement('input', {
                            type: 'text',
                            value: code,
                            onChange: (e) => setCode(e.target.value),
                            placeholder: 'Access Code',
                            className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                            disabled: loading
                        })
                    ),
                    error && React.createElement('div', {
                        className: 'text-red-600 text-sm text-center',
                        'data-name': 'error-message',
                        'data-file': 'components/AccessGate.js'
                    }, error),
                    React.createElement('button', {
                        type: 'submit',
                        disabled: loading,
                        className: 'w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    }, loading ? 'Verifying...' : 'Enter')
                )
            )
        );

    } catch (error) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center'
        }, 'Loading...');
    }
}

window.AccessGate = AccessGate;