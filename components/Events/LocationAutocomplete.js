function LocationAutocomplete({ value, onChange, onSelect, placeholder, className }) {
  try {
    const [suggestions, setSuggestions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const inputRef = React.useRef(null);
    const suggestionsRef = React.useRef(null);

    // Debounce search to prevent too many API calls
    const debounce = (func, wait) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    };

    // Handle click outside suggestions dropdown
    React.useEffect(() => {
      const handleClickOutside = (event) => {
        if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
            inputRef.current && !inputRef.current.contains(event.target)) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch location suggestions from OpenStreetMap
    const fetchSuggestions = React.useCallback(
      debounce(async (query) => {
        if (!query || query.length < 3) {
          setSuggestions([]);
          return;
        }

        try {
          setIsLoading(true);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Trickle Event App'
              }
            }
          );

          if (!response.ok) throw new Error('Failed to fetch suggestions');

          const data = await response.json();
          setSuggestions(data.map(item => ({
            id: item.place_id,
            display_name: item.display_name,
            type: item.type
          })));
        } catch (error) {
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300),
      []
    );

    const handleInputChange = (e) => {
      const newValue = e.target.value;
      
      // Call onChange with the string value directly
      if (onChange) {
        onChange(newValue);
      }
      
      if (newValue.trim()) {
        setShowSuggestions(true);
        fetchSuggestions(newValue);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion) => {
      // Call onSelect with the location string
      if (onSelect) {
        onSelect(suggestion.display_name);
      }
      setShowSuggestions(false);
      setSuggestions([]);
    };

    return (
      <div className="relative" data-name="location-autocomplete">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={() => value && setShowSuggestions(true)}
          className={className || "flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors"}
          placeholder={placeholder || "Enter a location"}
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <i className="fas fa-spinner fa-spin text-gray-400"></i>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start">
                  <i className="fas fa-map-marker-alt text-gray-400 mt-1 mr-2"></i>
                  <span className="text-sm text-gray-700">{suggestion.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return null;
  }
}

window.LocationAutocomplete = LocationAutocomplete;
