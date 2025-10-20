function MockEventPage() {
    try {
        const eventDate = new Date('2026-01-23');
        const today = new Date();
        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        
        // Mock data for vendors and tasks
        const mockVendors = [
            {
                name: "Miami Portable Solutions",
                type: "Infrastructure",
                status: "confirmed",
                image: "https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/951d4cfc-731d-4648-a2b3-7b9ad19d003d.png"
            },
            {
                name: "SoundStage Pro",
                type: "Entertainment",
                status: "pending",
                image: "https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/05bde009-1b1f-4a48-808e-8b7bca5787c4.webp"
            },
            {
                name: "Street Food United",
                type: "Food & Beverage",
                status: "confirmed",
                image: "https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/d470b8e1-dc04-448e-8c64-7ca519e7f63c.png"
            }
        ];

        const mockTasks = [
            {
                title: "Finalize stage layout",
                assignedTo: "Event Operations",
                status: "completed",
                dueDate: "2024-01-15",
                urgent: false
            },
            {
                title: "Vendor permit applications",
                assignedTo: "Vendor Management",
                status: "in-progress",
                dueDate: "2024-01-20",
                urgent: true
            },
            {
                title: "Security staff briefing",
                assignedTo: "Security Team",
                status: "pending",
                dueDate: "2024-01-22",
                urgent: false
            }
        ];

        const [vendors, setVendors] = React.useState(mockVendors);
        const [tasks, setTasks] = React.useState(mockTasks);

        return (
            <div data-name="mock-event-page" className="min-h-screen bg-gray-50">
                {/* Mock Event Header */}
                <div data-name="mock-header" className="bg-white border-b">
                    <div className="container mx-auto px-4 py-8">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div>
                                <img 
                                    src="https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/e2ffd31c-f899-4a54-b967-47af3a23b8c9.png"
                                    alt="My Hollywood Pride Logo"
                                    className="h-16 w-auto mb-4"
                                />
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                        {daysUntil} days to go
                                    </span>
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    My Hollywood Pride - Street Festival
                                </h1>
                                <div className="flex flex-wrap gap-4 text-gray-600">
                                    <div className="flex items-center">
                                        <i className="fas fa-calendar mr-2"></i>
                                        January 23–25, 2026
                                    </div>
                                    <div className="flex items-center">
                                        <i className="fas fa-map-marker-alt mr-2"></i>
                                        Downtown Hollywood, FL
                                    </div>
                                    <div className="flex items-center">
                                        <i className="fas fa-users mr-2"></i>
                                        10,000+ Expected Attendees
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <i className="fas fa-edit mr-2"></i>
                                    Edit Event
                                </button>
                                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <i className="fas fa-share-alt mr-2"></i>
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mock Main Content */}
                <div className="container mx-auto px-4 py-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Mock Left Column */}
                        <div className="md:col-span-2 space-y-8">
                            {/* Mock Progress Overview */}
                            <section data-name="mock-progress" className="bg-white rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Event Progress</h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Overall Progress</span>
                                            <span className="text-sm text-blue-600">75%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '75%'}}></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="relative bg-green-50 p-3 rounded-lg">
                                            <div className="text-xl font-bold text-green-600">5</div>
                                            <div className="text-sm text-gray-600">Completed</div>
                                        </div>
                                        <div className="relative bg-yellow-50 p-3 rounded-lg">
                                            <div className="text-xl font-bold text-yellow-600">4</div>
                                            <div className="text-sm text-gray-600">In Progress</div>
                                        </div>
                                        <div className="relative bg-red-50 p-3 rounded-lg">
                                            <div className="text-xl font-bold text-red-600">2</div>
                                            <div className="text-sm text-gray-600">Pending</div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Use MockEventMap component */}
                            <window.MockEventMap />

                            {/* Mock Task Timeline */}
                            <section data-name="mock-timeline" className="bg-white rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Task Timeline</h2>
                                <div className="space-y-6">
                                    {tasks.map((task, index) => (
                                        <div key={index} className="flex items-start gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                <i className={`fas ${
                                                    task.status === 'completed' ? 'fa-check' :
                                                    task.status === 'in-progress' ? 'fa-spinner' :
                                                    'fa-clock'
                                                }`}></i>
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-medium flex items-center gap-2">
                                                            {task.title}
                                                            {task.urgent && (
                                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                                                    Urgent
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">Assigned to: {task.assignedTo}</p>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                <div className="mt-2">
                                    <span className={`text-sm px-2 py-1 rounded ${
                                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {task.status === 'in-progress' ? 'In Progress' : 
                                         task.status === 'completed' ? 'Completed' : 
                                         'Pending'}
                                    </span>
                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Mock Right Column - Rest of the content remains the same */}
                        <div data-name="mock-sidebar" className="space-y-8">
                            {/* Mock Event Details */}
                            <section data-name="mock-details" className="bg-white rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Event Details</h2>
                                <div className="space-y-6">
                                    {/* Budget and other sections remain unchanged */}
                                    <div data-name="mock-budget">
                                        <h3 className="font-medium text-gray-700 mb-2">Budget Overview</h3>
                                        <div className="flex items-baseline gap-2 mb-3">
                                            <p className="text-2xl font-bold text-blue-600">$85,000</p>
                                            <span className="text-sm text-gray-500">total budget</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Mock Vendor Cards */}
                            <section data-name="mock-vendor-cards" className="bg-white rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Matched Vendors</h2>
                                <div className="space-y-4">
                                    {vendors.map((vendor, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <img
                                                src={vendor.image}
                                                alt={vendor.name}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                            <div className="flex-grow">
                                                <h3 className="font-medium">{vendor.name}</h3>
                                                <p className="text-sm text-gray-600">{vendor.type}</p>
                                                <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                                                    vendor.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {vendor.status}
                                                </span>
                                            </div>
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

// Register component globally
window.MockEventPage = MockEventPage;
