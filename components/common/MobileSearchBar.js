function MobileSearchBar({ 
    searchTerm, 
    onSearchChange, 
    filters = [], 
    activeFilter, 
    onFilterChange,
    placeholder = "Search...",
    className = "" 
}) {
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);

    return (
        <div className={`mobile-search-container ${className}`}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <div className="icon-search text-gray-400 text-lg"></div>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="mobile-search-input pl-10 pr-4"
                    placeholder={placeholder}
                />
                {filters.length > 0 && (
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        <div className="icon-filter text-gray-400 text-lg"></div>
                    </button>
                )}
            </div>
            
            {filters.length > 0 && (
                <div className="mobile-filter-chips">
                    <button
                        onClick={() => onFilterChange('all')}
                        className={`mobile-filter-chip ${
                            activeFilter === 'all' ? 'active' : ''
                        }`}
                    >
                        All
                    </button>
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => onFilterChange(filter.value)}
                            className={`mobile-filter-chip ${
                                activeFilter === filter.value ? 'active' : ''
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

window.MobileSearchBar = MobileSearchBar;