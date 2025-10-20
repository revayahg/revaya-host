function EventClients() {
  try {
    const [pendingInvites, setPendingInvites] = React.useState([]);
    const [confirmedEvents, setConfirmedEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('pending');

    React.useEffect(() => {
      fetchEventLinks();
    }, []);

    const fetchEventLinks = async () => {
      try {
        setLoading(true);
        const currentUserId = localStorage.getItem('currentUserId');
        
        // Fetch all vendor profiles for the current user
        const allVendorProfiles = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
        const userVendorProfiles = allVendorProfiles.filter(vp => vp.userId === currentUserId);
        
        if (userVendorProfiles.length === 0) {
          throw new Error('No vendor profiles found');
        }

        // Get all event links for the user's vendor profiles
        const vendorEventLinks = await trickleListObjects('vendorEventLink');
        const userLinks = vendorEventLinks.items.filter(link => 
          userVendorProfiles.some(profile => profile.id === link.objectData.vendorId)
        );

        const pending = [];
        const confirmed = [];

        // Process each link and fetch related event and producer data
        for (const link of userLinks) {
          try {
            const event = await trickleGetObject('event', link.objectData.eventId);
            const producer = await trickleGetObject('user', link.objectData.producerId);
            
            const enrichedLink = {
              ...link.objectData,
              id: link.objectId,
              event: event.objectData,
              producer: producer.objectData,
              createdAt: link.createdAt
            };

            if (link.objectData.status === 'pending') {
              pending.push(enrichedLink);
            } else if (link.objectData.status === 'confirmed') {
              confirmed.push(enrichedLink);
            }
          } catch (err) {
          }
        }

        // Sort by date
        const sortByDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
        setPendingInvites(pending.sort(sortByDate));
        setConfirmedEvents(confirmed.sort(sortByDate));

      } catch (err) {
        setError('Failed to load event invitations');
      } finally {
        setLoading(false);
      }
    };

    const handleInviteResponse = async (linkId, accept) => {
      try {
        const newStatus = accept ? 'confirmed' : 'declined';
        
        await trickleUpdateObject(
          'vendorEventLink',
          linkId,
          { status: newStatus }
        );

        window.toast.success(
          accept 
            ? "You've been added to this event" 
            : "You've declined the invitation"
        );

        // Refresh the data
        fetchEventLinks();

      } catch (error) {
        window.toast.error('Failed to update invitation');
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'TBD';
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    if (loading) {
      return (
        <div data-name="event-clients-loading" className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
            <p>Loading events...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div data-name="event-clients-error" className="text-center py-12">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        </div>
      );
    }

    return (
      <div data-name="event-clients" className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Event Clients</h1>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`${
                  activeTab === 'pending'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                data-name="pending-tab"
              >
                Pending Invitations
                {pendingInvites.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                    {pendingInvites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('confirmed')}
                className={`${
                  activeTab === 'confirmed'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                data-name="confirmed-tab"
              >
                Confirmed Events
                {confirmedEvents.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                    {confirmedEvents.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="space-y-6">
            {activeTab === 'pending' ? (
              pendingInvites.length === 0 ? (
                <div data-name="no-pending" className="text-center py-12 bg-gray-50 rounded-lg">
                  <i className="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500">You have no pending event invitations</p>
                </div>
              ) : (
                <div data-name="pending-list" className="space-y-4">
                  {pendingInvites.map(invite => (
                    <div
                      key={invite.id}
                      className="bg-white rounded-lg shadow-sm border p-6"
                      data-name="pending-invite"
                    >
                      <div className="sm:flex sm:items-start sm:justify-between">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="text-lg font-medium text-gray-900">
                            {invite.event.name}
                          </h3>
                          <div className="mt-2 space-y-2 text-sm text-gray-500">
                            <p>
                              <i className="far fa-calendar mr-2"></i>
                              {formatDate(invite.event.date)}
                            </p>
                            <p>
                              <i className="fas fa-map-marker-alt mr-2"></i>
                              {invite.event.location || 'Location TBD'}
                            </p>
                            <p>
                              <i className="far fa-user mr-2"></i>
                              Producer: {invite.producer.name}
                            </p>
                            <p>
                              <i className="fas fa-tasks mr-2"></i>
                              Services: {invite.requestedServices?.join(', ') || 'Services TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3 sm:flex-col sm:space-x-0 sm:space-y-3">
                          <button
                            onClick={() => handleInviteResponse(invite.id, true)}
                            className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <i className="fas fa-check mr-2"></i>
                            Accept
                          </button>
                          <button
                            onClick={() => handleInviteResponse(invite.id, false)}
                            className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <i className="fas fa-times mr-2"></i>
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              confirmedEvents.length === 0 ? (
                <div data-name="no-confirmed" className="text-center py-12 bg-gray-50 rounded-lg">
                  <i className="fas fa-calendar-check text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500">You are not assigned to any events yet</p>
                </div>
              ) : (
                <div data-name="confirmed-list" className="space-y-4">
                  {confirmedEvents.map(event => (
                    <div
                      key={event.id}
                      className="bg-white rounded-lg shadow-sm border p-6"
                      data-name="confirmed-event"
                    >
                      <div className="sm:flex sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                              {event.event.name}
                            </h3>
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <i className="fas fa-check-circle mr-1"></i>
                              Confirmed
                            </span>
                          </div>
                          <div className="mt-2 space-y-2 text-sm text-gray-500">
                            <p>
                              <i className="far fa-calendar mr-2"></i>
                              {formatDate(event.event.date)}
                            </p>
                            <p>
                              <i className="fas fa-map-marker-alt mr-2"></i>
                              {event.event.location || 'Location TBD'}
                            </p>
                            <p>
                              <i className="far fa-user mr-2"></i>
                              Producer: {event.producer.name}
                            </p>
                            <p>
                              <i className="fas fa-tasks mr-2"></i>
                              Services: {event.requestedServices?.join(', ') || 'Services TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-0">
                          <a
                            href={`#/event/${event.event.id}/overview`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <i className="fas fa-eye mr-2"></i>
                            View Event
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EventClients = EventClients;
