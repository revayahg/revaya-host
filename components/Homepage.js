function Homepage() {
  try {
    const [activeRole, setActiveRole] = React.useState('planner');
    
    // Smart routing for Post Event buttons
    const handlePostEventClick = async (e) => {
      e.preventDefault();
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session?.user) {
          window.location.hash = '#/event-form';
        } else {
          window.location.hash = '#/signup?redirect=create-event';
        }
      } catch (err) {
        window.location.hash = '#/signup?redirect=create-event';
      }
    };

    const plannerFeatures = [
      {
        icon: 'search',
        title: 'Find Trusted Vendors',
        description: 'Search and connect with pre-vetted event vendors in your area.'
      },
      {
        icon: 'tasks',
        title: 'Streamlined Planning',
        description: 'Manage tasks, timelines, and vendor communications in one place.'
      },
      {
        icon: 'calendar-check',
        title: 'Event Success',
        description: 'Track progress and ensure every detail is perfectly executed.'
      }
    ];

    const vendorFeatures = [
      {
        icon: 'store',
        title: 'Showcase Your Services',
        description: 'Create a professional profile to highlight your expertise and past events.'
      },
      {
        icon: 'users',
        title: 'Connect with Planners',
        description: 'Get matched with event planners looking for your specific services.'
      },
      {
        icon: 'chart-line',
        title: 'Grow Your Business',
        description: 'Manage bookings, communicate with clients, and expand your reach.'
      }
    ];

    return (
      <Layout>
        <div data-name="homepage" className="min-h-screen bg-white">
          {/* Hero Section */}
          <section data-name="hero-section" className="relative bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 data-name="hero-title" className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Welcome to Revaya Host
                </h1>
                <p data-name="hero-subtitle" className="text-xl text-gray-600 mb-8">
                  Your premier platform for connecting event planners with trusted vendors
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#/search-vendors"
                    data-name="find-vendors-btn"
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200 text-center"
                  >
                    Find Vendors
                  </a>
                  <a
                    href="#/signup?redirect=create-event"
                    data-name="post-event-btn"
                    onClick={handlePostEventClick}
                    className="px-8 py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition duration-200 text-center"
                  >
                    Post Event
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
              
              <div data-name="role-toggle" className="role-toggle">
                <button
                  className={`role-toggle-button ${activeRole === 'planner' ? 'active' : ''}`}
                  onClick={() => setActiveRole('planner')}
                >
                  For Event Planners
                </button>
                <button
                  className={`role-toggle-button ${activeRole === 'vendor' ? 'active' : ''}`}
                  onClick={() => setActiveRole('vendor')}
                >
                  For Event Vendors
                </button>
              </div>

              <div className="max-w-4xl mx-auto">
                <div
                  className={`role-content ${activeRole === 'planner' ? 'active' : ''}`}
                  style={{ display: activeRole === 'planner' ? 'block' : 'none' }}
                >
                  {plannerFeatures.map((feature, index) => (
                    <div key={index} className="role-feature">
                      <div className="role-feature-icon">
                        <i className={`fas fa-${feature.icon}`}></i>
                      </div>
                      <div className="role-feature-content">
                        <h3 className="role-feature-title">{feature.title}</h3>
                        <p className="role-feature-description">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-8">
                    <a
                      href="#/mock-event"
                      className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                    >
                      Preview a Sample Event Page
                    </a>
                  </div>
                </div>

                <div
                  className={`role-content ${activeRole === 'vendor' ? 'active' : ''}`}
                  style={{ display: activeRole === 'vendor' ? 'block' : 'none' }}
                >
                  {vendorFeatures.map((feature, index) => (
                    <div key={index} className="role-feature">
                      <div className="role-feature-icon">
                        <i className={`fas fa-${feature.icon}`}></i>
                      </div>
                      <div className="role-feature-content">
                        <h3 className="role-feature-title">{feature.title}</h3>
                        <p className="role-feature-description">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-8">
                    <a
                      href="#/mock-vendor"
                      className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                    >
                      Preview a Sample Vendor Page
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">Why Choose Revaya Host?</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-search text-2xl text-indigo-600"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Easy Vendor Search</h3>
                  <p className="text-gray-600">Find and compare vendors quickly with our powerful search tools</p>
                </div>
                <div className="text-center">
                  <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-tasks text-2xl text-indigo-600"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Task Management</h3>
                  <p className="text-gray-600">Stay organized with our integrated task management system</p>
                </div>
                <div className="text-center">
                  <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-comments text-2xl text-indigo-600"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Direct Communication</h3>
                  <p className="text-gray-600">Message vendors directly and get quick responses</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-indigo-900 text-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Planning Your Event?</h2>
              <p className="text-xl mb-8">Join Revaya Host today and connect with top vendors in your area</p>
              <a
                href="#/signup?redirect=create-event"
                onClick={handlePostEventClick}
                className="inline-block px-8 py-3 bg-white text-indigo-900 font-semibold rounded-lg hover:bg-indigo-50 transition duration-200"
              >
                Get Started Now
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-100 py-8">
            <div className="container mx-auto px-4">
              <div className="border-t border-gray-200 pt-8">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <p className="text-sm text-gray-500">
                    © 2025 Revaya Host. All rights reserved.
                  </p>
                  <div className="flex space-x-6 text-sm text-gray-500">
                    <a href="#/privacy" className="hover:text-indigo-600 transition-colors">
                      Privacy & Cookie Policy
                    </a>
                    <a href="#/feedback" className="hover:text-indigo-600 transition-colors">
                      Feedback
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Layout>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.Homepage = Homepage;
