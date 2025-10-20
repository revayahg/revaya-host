function ResetPassword() {
    try {
        const [newPassword, setNewPassword] = React.useState('');
        const [confirmPassword, setConfirmPassword] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [success, setSuccess] = React.useState(false);
        const [showPassword, setShowPassword] = React.useState(false);
        const [verifying, setVerifying] = React.useState(false);
        const [verified, setVerified] = React.useState(false);
        const [verifyError, setVerifyError] = React.useState('');

        // Scanner detection helper
        function isLikelyScanner(ua) {
            return /Proofpoint|urldefense|Mimecast|Barracuda|Tessian|IronPort|Cisco|Symantec|TrendMicro|EOP|URLSandbox|URLExpander|MicrosoftURL/i.test(ua || '');
        }

        // Extract recovery parameters from URL
        function extractRecoveryParams() {
            const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
            let qs = '';
            
            if (window.location.search) qs = window.location.search.slice(1);           // query form
            if (!qs && hash.includes('?')) qs = hash.split('?')[1];                     // hash ? form
            if (!qs && hash.includes('#access_token=')) qs = 'access_token=' + hash.split('#access_token=')[1]; // legacy
            
            const p = new URLSearchParams(qs);
            
            console.log('Reset password params:', {
                hasToken: !!p.get('token'),
                hasEmail: !!p.get('email'),
                hasAccessToken: !!p.get('access_token'),
                hasRefreshToken: !!p.get('refresh_token'),
                type: p.get('type'),
                error: p.get('error') || p.get('error_code'),
                url: window.location.href
            });
            
            return {
                token: p.get('token'),                       // NEW (from email template)
                email: p.get('email'),
                type: p.get('type'),
                accessToken: p.get('access_token'),          // legacy
                refreshToken: p.get('refresh_token'),        // legacy
                error: p.get('error') || p.get('error_code') || null
            };
        }

        // Scanner-safe verification on first user interaction
        React.useEffect(() => {
            // Guard: Strip /index.html if present so the SPA loads
            if (window.location.pathname.includes('index.html')) {
                window.location.replace(`${window.location.origin}/${window.location.hash}`);
                return;
            }

            const params = extractRecoveryParams();
            
            // Check for URL errors first
            if (params.error) {
                setVerifyError('Invalid or expired link');
                return;
            }

            // Set up first interaction verifier
            const onFirstInteraction = async () => {
                if (verifying || verified) return;
                if (!document.hasFocus() || document.visibilityState !== 'visible') return;
                if (isLikelyScanner(navigator.userAgent)) return;
                
                setVerifying(true);
                
                try {
                    if (params.token && params.type === 'recovery' && params.email) {
                        // Modern token approach
                        const { error } = await window.supabaseClient.auth.verifyOtp({
                            email: params.email,
                            token: params.token,
                            type: 'recovery'
                        });
                        
                        if (error) {
                            setVerifyError('Invalid or expired link');
                            return;
                        }
                        
                        setVerified(true);
                    } else if (params.accessToken && params.refreshToken && params.type === 'recovery') {
                        // Legacy access_token approach
                        const { error } = await window.supabaseClient.auth.setSession({
                            access_token: params.accessToken,
                            refresh_token: params.refreshToken
                        });
                        
                        if (error) {
                            setVerifyError('Invalid or expired link');
                            return;
                        }
                        
                        setVerified(true);
                    } else {
                        setVerifyError('Invalid or expired link');
                    }
                } catch (error) {
                    setVerifyError('Invalid or expired link');
                } finally {
                    setVerifying(false);
                }
            };

            // Attach listeners for first user interaction
            window.addEventListener('pointerdown', onFirstInteraction, { once: true });
            window.addEventListener('keydown', onFirstInteraction, { once: true });
            window.addEventListener('focusin', onFirstInteraction, { once: true });

            // Cleanup on unmount
            return () => {
                window.removeEventListener('pointerdown', onFirstInteraction);
                window.removeEventListener('keydown', onFirstInteraction);
                window.removeEventListener('focusin', onFirstInteraction);
            };
        }, [verifying, verified]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');

            try {
                if (!newPassword || !confirmPassword) {
                    setError('Please fill in all fields');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    setError('Passwords do not match');
                    return;
                }

                if (newPassword.length < 8) {
                    setError('Password must be at least 8 characters long');
                    return;
                }

                const { error } = await window.supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    
                    if (error.message?.includes('Invalid Refresh Token') || 
                        error.message?.includes('Refresh Token Not Found')) {
                        setError('Your session has expired. Please request a new password reset link.');
                        setTimeout(() => {
                            window.location.hash = '#/forgot-password';
                        }, 3000);
                        return;
                    }
                    
                    throw error;
                }

                setSuccess(true);
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 2000);

            } catch (error) {
                setError(error.message || 'Failed to update password');
            } finally {
                setLoading(false);
            }
        };

        const handleNewResetRequest = () => {
            window.location.hash = '#/forgot-password';
        };

        // Error state - invalid or expired link
        if (verifyError) {
            return React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'
            }, React.createElement('div', {
                className: 'max-w-md w-full bg-white rounded-lg shadow p-6 text-center'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    className: 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'
                }, React.createElement('div', {
                    className: 'icon-alert-circle text-2xl text-red-600'
                })),
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900 mb-2'
                }, 'Reset link invalid or expired'),
                React.createElement('p', {
                    key: 'description',
                    className: 'text-gray-600 mb-6'
                }, 'This password reset link is no longer valid. Please request a new password reset email.'),
                React.createElement('button', {
                    key: 'button',
                    onClick: handleNewResetRequest,
                    className: 'w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors'
                }, 'Send me a new link')
            ]));
        }

        // Success state
        if (success) {
            return React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'
            }, React.createElement('div', {
                className: 'max-w-md w-full bg-white rounded-lg shadow p-6 text-center'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    className: 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'
                }, React.createElement('div', {
                    className: 'icon-check text-2xl text-green-600'
                })),
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900 mb-2'
                }, 'Password updated successfully'),
                React.createElement('p', {
                    key: 'description',
                    className: 'text-gray-600 mb-4'
                }, 'Your password has been updated. Redirecting to login...'),
                React.createElement('div', {
                    key: 'spinner',
                    className: 'animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto'
                })
            ]));
        }

        // Password reset form
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'
        }, React.createElement('div', {
            className: 'max-w-md w-full space-y-8'
        }, [
            React.createElement('div', {
                key: 'header',
                className: 'text-center'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'mt-6 text-3xl font-extrabold text-gray-900'
                }, 'Set new password'),
                React.createElement('p', {
                    key: 'subtitle',
                    className: 'mt-2 text-sm text-gray-600'
                }, 'Enter your new password below')
            ]),
            React.createElement('form', {
                key: 'form',
                className: 'mt-8 space-y-6',
                onSubmit: handleSubmit
            }, [
                error && React.createElement('div', {
                    key: 'error',
                    className: 'rounded-md bg-red-50 p-4'
                }, React.createElement('div', {
                    className: 'text-sm text-red-700'
                }, error)),
                React.createElement('div', {
                    key: 'password-field',
                    className: 'space-y-4'
                }, [
                    React.createElement('div', {
                        key: 'new-password'
                    }, [
                        React.createElement('label', {
                            key: 'label',
                            htmlFor: 'new-password',
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                        }, 'New Password'),
                        React.createElement('div', {
                            key: 'input-wrapper',
                            className: 'relative'
                        }, [
                            React.createElement('input', {
                                key: 'input',
                                id: 'new-password',
                                name: 'new-password',
                                type: showPassword ? 'text' : 'password',
                                required: true,
                                className: 'appearance-none rounded relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
                                placeholder: 'Enter new password',
                                value: newPassword,
                                onChange: (e) => setNewPassword(e.target.value)
                            }),
                            React.createElement('button', {
                                key: 'toggle',
                                type: 'button',
                                onClick: () => setShowPassword(!showPassword),
                                className: 'absolute inset-y-0 right-0 pr-3 flex items-center'
                            }, React.createElement('div', {
                                className: `icon-${showPassword ? 'eye-off' : 'eye'} text-gray-400`
                            }))
                        ])
                    ]),
                    React.createElement('div', {
                        key: 'confirm-password'
                    }, [
                        React.createElement('label', {
                            key: 'label',
                            htmlFor: 'confirm-password',
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                        }, 'Confirm Password'),
                        React.createElement('input', {
                            key: 'input',
                            id: 'confirm-password',
                            name: 'confirm-password',
                            type: 'password',
                            required: true,
                            className: 'appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
                            placeholder: 'Confirm new password',
                            value: confirmPassword,
                            onChange: (e) => setConfirmPassword(e.target.value)
                        })
                    ])
                ]),
                React.createElement('div', {
                    key: 'submit'
                }, React.createElement('button', {
                    type: 'submit',
                    disabled: loading || !verified || !newPassword || !confirmPassword || newPassword !== confirmPassword,
                    className: 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50',
                    title: !verified ? 'Click anywhere on the page to verify your reset link first' : ''
                }, [
                    loading && React.createElement('div', {
                        key: 'spinner',
                        className: 'icon-loader-2 text-lg mr-2 animate-spin'
                    }),
                    loading ? 'Updating Password...' : verified ? 'Update Password' : (verifying ? 'Verifying...' : 'Click to verify link')
                ]))
            ])
        ]));

    } catch (error) {
        return React.createElement('div', {
            className: 'p-4 text-red-600'
        }, 'Error loading password reset form');
    }
}

window.ResetPassword = ResetPassword;