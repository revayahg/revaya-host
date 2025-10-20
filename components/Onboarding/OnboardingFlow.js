function OnboardingFlow({ onComplete }) {
  try {
    const [step, setStep] = React.useState(1);
    const [userData, setUserData] = React.useState({
      userType: '',
      preferences: {},
      completed: false
    });

    const steps = [
      {
        title: 'Welcome to EventLink',
        description: 'Let\'s get you set up with your account',
        content: (
          <div className="text-center">
            <i className="fas fa-handshake text-5xl text-indigo-600 mb-4"></i>
            <h2 className="text-2xl font-bold mb-4">Welcome to EventLink!</h2>
            <p className="text-gray-600 mb-8">
              We're excited to help you manage your events and connect with vendors.
              Let's get started by setting up your profile.
            </p>
            <button
              onClick={() => setStep(2)}
              className="btn-primary"
            >
              Get Started
            </button>
          </div>
        )
      },
      {
        title: 'Choose Your Role',
        description: 'Are you an event planner or vendor?',
        content: (
          <div className="grid md:grid-cols-2 gap-6">
            <div
              onClick={() => {
                setUserData(prev => ({ ...prev, userType: 'planner' }));
                setStep(3);
              }}
              className="cursor-pointer p-6 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <i className="fas fa-calendar-check text-3xl text-indigo-600 mb-4"></i>
              <h3 className="text-xl font-bold mb-2">Event Planner</h3>
              <p className="text-gray-600">
                I want to organize events and find vendors
              </p>
            </div>
            <div
              onClick={() => {
                setUserData(prev => ({ ...prev, userType: 'vendor' }));
                setStep(3);
              }}
              className="cursor-pointer p-6 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <i className="fas fa-store text-3xl text-indigo-600 mb-4"></i>
              <h3 className="text-xl font-bold mb-2">Vendor</h3>
              <p className="text-gray-600">
                I provide services for events
              </p>
            </div>
          </div>
        )
      },
      {
        title: 'Complete Your Profile',
        description: 'Add some details about yourself',
        content: (
          <div className="space-y-6">
            {userData.userType === 'planner' ? (
              <PlannerProfileForm
                onSubmit={async (data) => {
                  await completeOnboarding({
                    ...userData,
                    preferences: data,
                    completed: true
                  });
                  onComplete();
                }}
              />
            ) : (
              <VendorProfileForm
                onSubmit={async (data) => {
                  await completeOnboarding({
                    ...userData,
                    preferences: data,
                    completed: true
                  });
                  onComplete();
                }}
              />
            )}
          </div>
        )
      }
    ];

    return (
      <div data-name="onboarding-flow" className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center ${
                  i !== steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i + 1 <= step
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}
                </div>
                {i !== steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      i + 1 < step ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold">{steps[step - 1].title}</h2>
          <p className="text-gray-600">{steps[step - 1].description}</p>
        </div>

        {steps[step - 1].content}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
