function ProfileSettings() {
  try {
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;
    const [formState, setFormState] = React.useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [passwordMode, setPasswordMode] = React.useState('change');
    const [passwordForm, setPasswordForm] = React.useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    const [passwordError, setPasswordError] = React.useState('');
    const [passwordSuccess, setPasswordSuccess] = React.useState('');
    const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
    const [showPasswords, setShowPasswords] = React.useState({
      current: false,
      new: false,
      confirm: false
    });
    const [resetEmailSent, setResetEmailSent] = React.useState(false);

    React.useEffect(() => {
      loadProfile();
    }, [user]);

    const loadProfile = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await window.supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          setError('Failed to load profile');
          return;
        }

        if (data) {
          setFormState({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            email: data.email || user.email || '',
            phone: data.phone || ''
          });
        } else {
          setFormState(prev => ({
            ...prev,
            email: user.email || ''
          }));
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    const handleSave = async () => {
      try {
        setIsSaving(true);
        setError('');
        setSuccess(false);

        if (!formState.firstName || !formState.lastName || !formState.email) {
          setError('First name, last name, and email are required');
          return;
        }

        const { error: updateError } = await window.supabaseClient
          .from('profiles')
          .upsert({
            id: user.id,
            first_name: formState.firstName,
            last_name: formState.lastName,
            email: formState.email,
            phone: formState.phone || null,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          setError('Failed to update profile: ' + updateError.message);
          return;
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);

      } catch (err) {
        setError('Failed to save profile');
      } finally {
        setIsSaving(false);
      }
    };

    const handlePasswordSubmit = async () => {
      try {
        setIsPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');


        if (passwordMode === 'change') {
          
          if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError('All password fields are required');
            return;
          }

          if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
          }

          if (passwordForm.newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters long');
            return;
          }

          const { error } = await window.supabaseClient.auth.updateUser({
            password: passwordForm.newPassword
          });

          if (error) {
            setPasswordError('Failed to update password: ' + error.message);
            return;
          }

          setPasswordSuccess('Password updated successfully!');
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

        } else if (passwordMode === 'reset') {
          
          if (!formState.email) {
            setPasswordError('Email is required for password reset');
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formState.email)) {
            setPasswordError('Please enter a valid email address');
            return;
          }


          const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(
            formState.email,
            { 
              redirectTo: window.RESET_REDIRECT
            }
          );


          if (error) {
            setPasswordError('Failed to send reset email: ' + error.message);
            return;
          }

          setResetEmailSent(true);
          setPasswordSuccess(`We've sent a reset link to ${formState.email}. Check spam if you don't see it in a couple of minutes.`);
        }

        setTimeout(() => setPasswordSuccess(''), 5000);

      } catch (err) {
        setPasswordError('Password operation failed: ' + err.message);
      } finally {
        setIsPasswordLoading(false);
      }
    };

    const togglePasswordVisibility = (field) => {
      setShowPasswords(prev => ({
        ...prev,
        [field]: !prev[field]
      }));
    };

    if (loading) {
      return React.createElement(LoadingSpinner);
    }

    return React.createElement('div', { className: 'max-w-4xl mx-auto p-6' },
      React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 mb-6' }, 'About You'),
        
        error && React.createElement('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 rounded-md' },
          React.createElement('p', { className: 'text-red-600' }, error)
        ),

        success && React.createElement('div', { className: 'mb-4 p-3 bg-green-50 border border-green-200 rounded-md' },
          React.createElement('p', { className: 'text-green-600' }, 'Profile updated successfully!')
        ),

        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'First Name *'),
            React.createElement('input', {
              type: 'text',
              value: formState.firstName,
              onChange: (e) => setFormState(prev => ({ ...prev, firstName: e.target.value })),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
              placeholder: 'Enter your first name'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Last Name *'),
            React.createElement('input', {
              type: 'text',
              value: formState.lastName,
              onChange: (e) => setFormState(prev => ({ ...prev, lastName: e.target.value })),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
              placeholder: 'Enter your last name'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Email *'),
            React.createElement('input', {
              type: 'email',
              value: formState.email,
              onChange: (e) => setFormState(prev => ({ ...prev, email: e.target.value })),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
              placeholder: 'Enter your email'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Phone'),
            React.createElement('input', {
              type: 'tel',
              value: formState.phone,
              onChange: (e) => setFormState(prev => ({ ...prev, phone: e.target.value })),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
              placeholder: 'Enter your phone number'
            })
          )
        ),

        React.createElement('div', { className: 'mt-6' },
          React.createElement('button', {
            onClick: handleSave,
            disabled: isSaving,
            className: 'bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
          },
            isSaving && React.createElement('div', { className: 'icon-loader-2 text-lg mr-2 animate-spin' }),
            'Save Profile'
          )
        )
      ),

      // Password Management Section
      React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mt-6' },
        React.createElement('h2', { className: 'text-xl font-bold text-gray-900 mb-6' }, 'Password Management'),
        
        passwordError && React.createElement('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 rounded-md' },
          React.createElement('p', { className: 'text-red-600' }, passwordError)
        ),

        passwordSuccess && React.createElement('div', { className: 'mb-4 p-3 bg-green-50 border border-green-200 rounded-md' },
          React.createElement('p', { className: 'text-green-600' }, passwordSuccess)
        ),

        // Mode Selection
        React.createElement('div', { className: 'mb-6' },
          React.createElement('div', { className: 'flex space-x-4' },
            React.createElement('button', {
              onClick: () => setPasswordMode('change'),
              className: `px-4 py-2 rounded-md ${passwordMode === 'change' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`
            }, 'Change Password'),
            React.createElement('button', {
              onClick: () => setPasswordMode('reset'),
              className: `px-4 py-2 rounded-md ${passwordMode === 'reset' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`
            }, 'Reset Password')
          )
        ),

        // Password Form
        passwordMode === 'change' && React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Current Password'),
            React.createElement('div', { className: 'relative' },
              React.createElement('input', {
                type: showPasswords.current ? 'text' : 'password',
                value: passwordForm.currentPassword,
                onChange: (e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value })),
                className: 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
                placeholder: 'Enter current password'
              }),
              React.createElement('button', {
                type: 'button',
                onClick: () => togglePasswordVisibility('current'),
                className: 'absolute inset-y-0 right-0 pr-3 flex items-center'
              },
                React.createElement('div', { className: `icon-${showPasswords.current ? 'eye-off' : 'eye'} text-gray-400` })
              )
            )
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'New Password'),
            React.createElement('div', { className: 'relative' },
              React.createElement('input', {
                type: showPasswords.new ? 'text' : 'password',
                value: passwordForm.newPassword,
                onChange: (e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value })),
                className: 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
                placeholder: 'Enter new password'
              }),
              React.createElement('button', {
                type: 'button',
                onClick: () => togglePasswordVisibility('new'),
                className: 'absolute inset-y-0 right-0 pr-3 flex items-center'
              },
                React.createElement('div', { className: `icon-${showPasswords.new ? 'eye-off' : 'eye'} text-gray-400` })
              )
            )
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Confirm New Password'),
            React.createElement('div', { className: 'relative' },
              React.createElement('input', {
                type: showPasswords.confirm ? 'text' : 'password',
                value: passwordForm.confirmPassword,
                onChange: (e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value })),
                className: 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
                placeholder: 'Confirm new password'
              }),
              React.createElement('button', {
                type: 'button',
                onClick: () => togglePasswordVisibility('confirm'),
                className: 'absolute inset-y-0 right-0 pr-3 flex items-center'
              },
                React.createElement('div', { className: `icon-${showPasswords.confirm ? 'eye-off' : 'eye'} text-gray-400` })
              )
            )
          )
        ),

        passwordMode === 'reset' && !resetEmailSent && React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'p-4 bg-blue-50 border border-blue-200 rounded-md' },
            React.createElement('div', { className: 'flex items-start' },
              React.createElement('div', { className: 'icon-info text-blue-600 text-lg mr-3 mt-0.5' }),
              React.createElement('div', null,
                React.createElement('h4', { className: 'text-blue-800 font-medium mb-1' }, 'Ready to Send Reset Email'),
                React.createElement('p', { className: 'text-blue-700 text-sm' }, 
                  'Click "Send Reset Email" to send a password reset link to: ',
                  React.createElement('strong', null, formState.email)
                )
              )
            )
          )
        ),

        passwordMode === 'reset' && resetEmailSent && React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'p-4 bg-green-50 border border-green-200 rounded-md' },
            React.createElement('div', { className: 'flex items-start' },
              React.createElement('div', { className: 'icon-check text-green-600 text-lg mr-3 mt-0.5' }),
              React.createElement('div', null,
                React.createElement('h4', { className: 'text-green-800 font-medium mb-1' }, 'Reset Email Sent!'),
                React.createElement('p', { className: 'text-green-700 text-sm' }, 
                  'A password reset link has been sent to: ',
                  React.createElement('strong', null, formState.email)
                ),
                React.createElement('p', { className: 'text-green-700 text-sm mt-2' }, 
                  'Please check both your inbox and spam folder for the reset email.'
                )
              )
            )
          )
        ),

        React.createElement('div', { className: 'mt-6' },
          React.createElement('button', {
            onClick: (e) => {
              e.preventDefault();
              handlePasswordSubmit();
            },
            disabled: isPasswordLoading || (passwordMode === 'reset' && resetEmailSent),
            className: 'bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
          },
            isPasswordLoading && React.createElement('div', { className: 'icon-loader-2 text-lg mr-2 animate-spin' }),
            passwordMode === 'change' ? 'Update Password' : (resetEmailSent ? 'Email Sent' : 'Send Reset Email')
          )
        )
      )
    );

  } catch (error) {
    return React.createElement('div', { className: 'p-4 text-red-600' }, 'Error loading profile settings');
  }
}