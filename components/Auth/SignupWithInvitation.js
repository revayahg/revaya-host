// SignupWithInvitation.js - Signup component that handles invitation context
function SignupWithInvitation() {
  const [invitationToken, setInvitationToken] = React.useState(null);
  const [invitationDetails, setInvitationDetails] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invitation');
    
    if (token) {
      setInvitationToken(token);
      loadInvitationDetails(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadInvitationDetails = async (token) => {
    try {
      const details = await collaboratorAPI.getInvitationDetails(token);
      if (details.valid) {
        setInvitationDetails(details);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSuccess = async () => {
    if (invitationToken) {
      try {
        // Accept the invitation after successful signup
        const result = await collaboratorAPI.acceptInvitation(invitationToken);
        if (result.success) {
          window.location.href = `/event/${result.event_id}`;
          return;
        }
      } catch (error) {
      }
    }
    
    // Default redirect
    window.location.href = '/dashboard';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        
        {invitationDetails && (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="icon-mail text-indigo-400"></div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-indigo-800">
                  You've been invited!
                </h3>
                <div className="mt-2 text-sm text-indigo-700">
                  <p>
                    After creating your account, you'll be automatically added as a collaborator to <strong>"{invitationDetails.event_name}"</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Signup onSuccess={handleSignupSuccess} />
        </div>
      </div>
    </div>
  );
}

// Export the component
window.SignupWithInvitation = SignupWithInvitation;