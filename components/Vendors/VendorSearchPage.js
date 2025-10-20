function VendorSearchPage() {
    try {
        const [vendors, setVendors] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);
        const [searchTerm, setSearchTerm] = React.useState('');
        const [selectedCategory, setSelectedCategory] = React.useState('');

        React.useEffect(() => {
            loadVendors();
        }, []);

        const loadVendors = async () => {
            try {
                setLoading(true);
                const { data, error } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('*')
                    .eq('is_public', true);

                if (error) throw error;
                setVendors(data || []);
            } catch (err) {
                
                let errorMessage = 'Failed to load vendors. Please try again.';
                
                if (err && typeof err === 'object') {
                    if (err.message) {
                        errorMessage = err.message;
                    } else if (err.error && err.error.message) {
                        errorMessage = err.error.message;
                    } else if (typeof err.toString === 'function') {
                        errorMessage = err.toString();
                    }
                } else if (typeof err === 'string') {
                    errorMessage = err;
                }
                
                setError(errorMessage);
                if (window.reportError) {
                    reportError(err);
                }
            } finally {
                setLoading(false);
            }
        };

        const filteredVendors = vendors.filter(vendor => {
            const matchesSearch = !searchTerm || 
                vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.bio?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = !selectedCategory || 
                vendor.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        if (loading) {
            return (
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Find a Vendor TEST</h1>

                {/* Search and Filter Section */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search Vendors
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, company, or description"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            data-name="vendor-search-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Filter by Category
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            data-name="category-filter"
                        >
                            <option value="">All Categories</option>
                            {Object.entries(window.VENDOR_CATEGORIES).map(([category]) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error ? (
                    <div className="text-red-600 text-center py-8" role="alert">
                        <i className="fas fa-exclamation-circle mr-2"></i>
                        {error}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                        No vendors found matching your criteria
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVendors.map((vendor) => (
                            <a
                                key={vendor.id}
                                href={`#/vendor/view/${vendor.id}`}
                                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                data-name="vendor-card"
                            >
                                <div className="aspect-video relative rounded-t-lg overflow-hidden bg-gray-100">
                                    {vendor.profile_picture_url ? (
                                        <img
                                            src={vendor.profile_picture_url}
                                            alt={vendor.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <i className="fas fa-store text-4xl text-gray-400"></i>
                                        </div>
                                    )}
                                    {vendor.category && (
                                        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-sm">
                                            {vendor.category}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg mb-1">{vendor.name}</h3>
                                    {vendor.company && (
                                        <p className="text-gray-600 text-sm mb-2">{vendor.company}</p>
                                    )}
                                    {vendor.bio && (
                                        <p className="text-gray-600 text-sm line-clamp-2">{vendor.bio}</p>
                                    )}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    } catch (error) {
        reportError(error);
        return (
            <div className="text-center py-12">
                <div className="text-red-600 text-5xl mb-4">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-600">Please try again later</p>
            </div>
        );
    }
}

window.VendorSearchPage = VendorSearchPage;
