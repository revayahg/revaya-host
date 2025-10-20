function EditProfile() {
  try {
    const [formData, setFormData] = React.useState({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      phone: '',
      jobTitle: '',
      bio: '',
      profilePicture: '',
      userId: ''
    });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [newPassword, setNewPassword] = React.useState('');
    const [isChangingPassword, setIsChangingPassword] = React.useState(false);
    const [isSavingPassword, setIsSavingPassword] = React.useState(false);
    const [passwordStrength, setPasswordStrength] = React.useState({ valid: false, strength: 0, message: '' });

    React.useEffect(() => {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const user = await getCurrentUser();
          
          if (user) {
            setFormData({
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || '',
              company: user.companyName || '',
              phone: user.phoneNumber || '',
              jobTitle: user.jobTitle || '',
              bio: user.bio || '',
              profilePicture: user.profilePicture || '',
              userId: user.id
            });
          } else {
            throw new Error('Unable to fetch user profile');
          }
        } catch (err) {
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }, []);

    // Password validation
    React.useEffect(() => {
      if (newPassword) {
        const strength = validatePassword(newPassword);
        setPasswordStrength(strength);
      } else {
        setPasswordStrength({ valid: false, strength: 0, message: '' });
      }
    }, [newPassword]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      setError(null);
      setSuccess(false);
    };

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, profilePicture: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        if (!formData.userId) {
          throw new Error('User ID not found');
        }

        const profileData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          companyName: formData.company,
          phoneNumber: formData.phone,
          jobTitle: formData.jobTitle,
          bio: formData.bio,
          profilePicture: formData.profilePicture
        };

        const result = await updateUserProfile(formData.userId, profileData);
        
        if (!result || result.error) {
          throw new Error(result?.error || 'Failed to update profile. Please try again.');
        }
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err.message || 'Failed to update profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const handlePasswordChange = (e) => {
      setNewPassword(e.target.value);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleStartPasswordChange = () => {
      setIsChangingPassword(true);
      setNewPassword('');
      setShowPassword(false);
    };

    const handleCancelPasswordChange = () => {
      setIsChangingPassword(false);
      setNewPassword('');
      setShowPassword(false);
      setPasswordStrength({ valid: false, strength: 0, message: '' });
    };

    const handleSavePassword = async () => {
      if (!newPassword) {
        window.toast.error('Please enter a new password');
        return;
      }

      if (!passwordStrength.valid) {
        window.toast.error(passwordStrength.message);
        return;
      }

      setIsSavingPassword(true);
      try {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) throw new Error('User not found');

        // Hash the new password
        const { hash: passwordHash, salt: passwordSalt } = await hashPassword(newPassword);

        // Update user object with new password hash
        await trickleUpdateObject('user', userId, {
          passwordHash,
          passwordSalt
        });

        window.toast.success('Password updated successfully');
        setNewPassword('');
        setShowPassword(false);
        setIsChangingPassword(false);
      } catch (error) {
        window.toast.error('Failed to update password. Please try again.');
        reportError(error);
      } finally {
        setIsSavingPassword(false);
      }
    };

    // Render password strength indicator
    const renderPasswordStrength = () => {
      if (!newPassword) return null;

      const strengthColors = {
        1: 'bg-red-500',
        2: 'bg-yellow-500',
        3: 'bg-green-500',
        4: 'bg-green-600'
      };

      const strengthWidth = {
        1: 'w-1/4',
        2: 'w-2/4',
        3: 'w-3/4',
        4: 'w-full'
      };

      return (
        <div className="mt-1">
          <div className="password-strength-meter">
            <div
              className={`password-strength-bar ${strengthColors[passwordStrength.strength]} ${strengthWidth[passwordStrength.strength]}`}
            ></div>
          </div>
          <p className={`text-xs mt-1 ${passwordStrength.valid ? 'text-green-600' : 'text-red-600'}`}>
            {passwordStrength.message}
          </p>
        </div>
      );
    };

    return (
      <Layout>
        <div data-name="edit-profile-page" className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
          
          {error && (
            <div data-name="error-alert" className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          {success && (
            <div data-name="success-alert" className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg" role="alert">
              <i className="fas fa-check-circle mr-2"></i>
              Profile updated successfully!
            </div>
          )}

          <form data-name="profile-form" onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label htmlFor="profilePicture" className="block text-gray-700 mb-2">Profile Picture</label>
                  <div className="flex items-center">
                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mr-4">
                      {formData.profilePicture ? (
                        <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <i className="fas fa-user text-2xl"></i>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="profilePicture"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="profilePicture"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
                    >
                      Change Photo
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="firstName" className="block text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-700">Password</label>
                    {!isChangingPassword && (
                      <button
                        type="button"
                        onClick={handleStartPasswordChange}
                        className="text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none"
                      >
                        Change Password
                      </button>
                    )}
                  </div>
                  {isChangingPassword ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-gray-900 focus:outline-none"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {renderPasswordStrength()}
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleSavePassword}
                          disabled={!passwordStrength.valid || isSavingPassword}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingPassword ? (
                            <span className="flex items-center justify-center">
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Saving...
                            </span>
                          ) : (
                            'Save Password'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelPasswordChange}
                          disabled={isSavingPassword}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                      ••••••••
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="phone" className="block text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <label htmlFor="company" className="block text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="jobTitle" className="block text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="bio" className="block text-gray-700 mb-2">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditProfile = EditProfile;
