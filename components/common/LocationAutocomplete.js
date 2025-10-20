function LocationAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Enter a location...", 
  className = "",
  disabled = false 
}) {
  try {
    const [suggestions, setSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const inputRef = React.useRef(null);
    const suggestionsRef = React.useRef(null);

    // Common US cities and counties for autocomplete
    const locationData = [
      // Major US Cities
      'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
      'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
      'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
      'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
      'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
      'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD',
      'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA',
      'Kansas City, MO', 'Mesa, AZ', 'Atlanta, GA', 'Colorado Springs, CO', 'Omaha, NE',
      'Raleigh, NC', 'Miami, FL', 'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA',
      'Minneapolis, MN', 'Tulsa, OK', 'Tampa, FL', 'Arlington, TX', 'New Orleans, LA',
      
      // Counties
      'Miami-Dade County, FL', 'Los Angeles County, CA', 'Cook County, IL', 'Harris County, TX',
      'Maricopa County, AZ', 'Orange County, CA', 'San Diego County, CA', 'Kings County, NY',
      'Queens County, NY', 'Riverside County, CA', 'Clark County, NV', 'Tarrant County, TX',
      'Santa Clara County, CA', 'Wayne County, MI', 'Bexar County, TX', 'King County, WA',
      'Dallas County, TX', 'Broward County, FL', 'New York County, NY', 'Philadelphia County, PA',
      
      // Regions
      'South Florida', 'North Florida', 'Central Florida', 'Greater Miami Area',
      'Bay Area, CA', 'Greater Los Angeles', 'Chicagoland', 'Metro Atlanta',
      'Greater Boston', 'Washington Metro Area', 'Dallas-Fort Worth', 'Greater Houston',
      'Phoenix Metro', 'Denver Metro', 'Seattle Metro', 'Portland Metro',
      'Las Vegas Valley', 'Tampa Bay Area', 'Orlando Metro', 'Charlotte Metro'
    ];

    const handleInputChange = (e) => {
      const inputValue = e.target.value;
      onChange(inputValue);
      
      if (inputValue.length > 2) {
        const filtered = locationData.filter(location =>
          location.toLowerCase().includes(inputValue.toLowerCase())
        ).slice(0, 8); // Limit to 8 suggestions
        
        setSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion) => {
      onChange(suggestion);
      onSelect(suggestion);
      setShowSuggestions(false);
      setSuggestions([]);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    };

    // Close suggestions when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          inputRef.current && 
          !inputRef.current.contains(event.target) &&
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative" data-name="location-autocomplete">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} relative`}
          data-name="location-input"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            data-name="suggestions-dropdown"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                data-name="suggestion-item"
              >
                <span className="text-gray-900">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        data-name="fallback-input"
      />
    );
  }
}

window.LocationAutocomplete = LocationAutocomplete;