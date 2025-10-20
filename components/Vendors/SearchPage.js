function VendorSearchPage() {
  try {
    const [vendors, setVendors] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filters, setFilters] = React.useState({
      category: '',
      location: '',
      minRating: ''
    });
    const [viewMode, setViewMode] = React.useState('grid');
    const [sortOption, setSortOption] = React.useState('rating');
    const isDashboard = window.location.pathname.includes('/dashboard');

    React.useEffect(() => {
      const fetchVendors = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Check if trickle functions are available
          if (!window.trickleListObjects) {
            setVendors([]);
            return;
          }
          
          const allVendors = await window.trickleListObjects('vendor', 1000, true);
          if (allVendors && allVendors.items) {
            const vendorData = allVendors.items.map(v => ({
              ...v.objectData,
              objectId: v.objectId || v.id,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt
            }));
            setVendors(vendorData);
          } else {
            setVendors([]);
          }
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
          setVendors([]);
        } finally {
          setLoading(false);
        }
      };
      fetchVendors();
    }, []);

    const filteredVendors = vendors.filter(vendor => {
      if (!vendor) return false;
      
      const businessName = vendor.businessName || vendor.name || '';
      const description = vendor.description || vendor.bio || '';
      const category = vendor.category || '';
      const address = vendor.address || vendor.location || '';
      
      const matchesSearch = !searchTerm || 
        businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filters.category || category === filters.category;
      const matchesLocation = !filters.location || 
        address.toLowerCase().includes(filters.location.toLowerCase());
      const matchesRating = !filters.minRating || 
        (vendor.rating && vendor.rating >= Number(filters.minRating));
      
      return matchesSearch && matchesCategory && matchesLocation && matchesRating;
    });

    const sortedVendors = [...filteredVendors].sort((a, b) => {
      switch (sortOption) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'alphabetical':
          return a.businessName.localeCompare(b.businessName);
        default:
          return 0;
      }
    });

    const categories = [...new Set(vendors.map(v => v.category || v.type).filter(Boolean))];

    return (
      <Layout>
        <div data-name="vendor-search-page" className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Find Event Vendors</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover and connect with trusted event vendors in your area. 
              From DJs to decorators, find the perfect match for your event.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Search Vendors</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, service, or keyword"
                  className="input-field pl-10"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  placeholder="City or State"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Minimum Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                  className="input-field"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Star</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="input-field"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {filteredVendors.length} {filteredVendors.length === 1 ? 'Vendor' : 'Vendors'} Found
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
            </div>
          ) : (
            <div>
              {filteredVendors.length > 0 ? (
                <div className={viewMode === 'grid' ? 
                  'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 
                  'space-y-4'
                }>
                  {sortedVendors.map(vendor => (
                    <div 
                      key={vendor.objectId} 
                      className={`vendor-card ${isDashboard ? 'dashboard' : ''} ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}
                      data-name="vendor-card"
                    >
                      <div className={`relative ${viewMode === 'list' ? 'w-48' : ''}`}>
                        {vendor.featuredImage ? (
                          <img 
                            src={vendor.featuredImage} 
                            alt={vendor.businessName} 
                            className={`vendor-logo ${isDashboard ? 'dashboard' : ''} ${
                              viewMode === 'list' ? 'h-full' : 'h-48'
                            }`}
                          />
                        ) : (
                          <div className={`w-full ${viewMode === 'list' ? 'h-full' : 'h-48'} bg-indigo-50 flex items-center justify-center`}>
                            <i className="fas fa-store text-4xl text-indigo-300"></i>
                          </div>
                        )}
                        {vendor.featured && (
                          <div className="absolute top-2 left-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded">
                            Featured
                          </div>
                        )}
                      </div>
                      <div className="vendor-card-content">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="vendor-name">{vendor.businessName || vendor.name || 'Unnamed Vendor'}</h3>
                            <p className="vendor-category">{vendor.category || 'General Services'}</p>
                          </div>
                          {vendor.rating && (
                            <div className="vendor-rating">
                              {[...Array(5)].map((_, i) => (
                                <i 
                                  key={i} 
                                  className={`fas fa-star ${i < Math.floor(vendor.rating) ? 'text-yellow-500' : 'text-gray-300'}`}
                                ></i>
                              ))}
                              <span className="ml-2 text-gray-500">{vendor.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="vendor-location">
                          <i className="fas fa-map-marker-alt mr-2"></i>
                          <span>{(vendor.address || vendor.location || 'Location not specified').split(',')[0]}</span>
                        </div>
                        {viewMode === 'list' && vendor.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {vendor.description}
                          </p>
                        )}
                        <div className="vendor-card-actions">
                          <a 
                            href={`#vendor/${vendor.objectId}`}
                            className="vendor-view-profile"
                          >
                            View Profile
                          </a>
                          <button className="vendor-contact-btn">
                            Contact Vendor
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  <i className="fas fa-search text-4xl text-indigo-400 mb-4"></i>
                  <h2 className="text-xl font-bold mb-2">No Vendors Found</h2>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search or filters to find more vendors
                  </p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({ category: '', location: '', minRating: '' });
                    }}
                    className="btn-primary"
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
