function HowItWorks() {
  try {
    const [activeView, setActiveView] = React.useState('organizer');

    const organizerSteps = [
      {
        icon: 'calendar-alt',
        title: 'Create Your Event',
        description: 'Share your event details and requirements with our network of professional vendors'
      },
      {
        icon: 'comments',
        title: 'Connect with Vendors',
        description: 'Review quotes and communicate directly with qualified vendors'
      },
      {
        icon: 'check-circle',
        title: 'Execute Your Event',
        description: 'Manage all vendor relationships and event logistics in one platform'
      }
    ];

    const vendorSteps = [
      {
        icon: 'user-circle',
        title: 'Create Your Profile',
        description: 'Set up your vendor profile with services, portfolio, and credentials'
      },
      {
        icon: 'map-marker-alt',
        title: 'Get Matched',
        description: 'Receive relevant event opportunities based on your services and location'
      },
      {
        icon: 'rocket',
        title: 'Grow Your Business',
        description: 'Win more clients and manage all your event commitments efficiently'
      }
    ];

    return (
      <section data-name="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                data-name="organizer-tab"
                onClick={() => setActiveView('organizer')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeView === 'organizer' 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Event Organizer
              </button>
              <button
                data-name="vendor-tab"
                onClick={() => setActiveView('vendor')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeView === 'vendor' 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Event Vendor
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(activeView === 'organizer' ? organizerSteps : vendorSteps).map((step, index) => (
              <div
                key={index}
                data-name={`step-${index + 1}`}
                className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                  <i className={`fas fa-${step.icon} text-2xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-center">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
