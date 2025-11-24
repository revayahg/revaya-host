const FALLBACK_LOCATIONS = [
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

function LocationAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Enter a location...", 
  className = "",
  disabled = false 
}) {
  try {
    React.useEffect(() => {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('📍 LocationAutocomplete loaded (live geocoding enabled)');
      }
    }, []);

    const [suggestions, setSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const inputRef = React.useRef(null);
    const suggestionsRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);

    const handleInputChange = (e) => {
      const inputValue = e.target.value;
      onChange(inputValue);
      setSearchTerm(inputValue);
      if (inputValue && inputValue.length >= 3) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion) => {
      const finalValue = typeof suggestion === 'string' ? suggestion : (suggestion?.value ?? '');
      onChange(finalValue);
      if (typeof onSelect === 'function') {
        onSelect(finalValue, suggestion);
      }
      setSearchTerm('');
      setShowSuggestions(false);
      setSuggestions([]);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      if (e.key === 'Enter' && showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[0]);
      }
    };

    const buildFallbackSuggestions = React.useCallback((term) => {
      if (!term || term.length < 3) {
        return [];
      }
      return FALLBACK_LOCATIONS
        .filter(location => location.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 8)
        .map(location => ({
          label: location,
          description: '',
          value: location
        }));
    }, []);

    React.useEffect(() => {
      const trimmed = (searchTerm || '').trim();

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (trimmed.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(false);
        return;
      }

      if (trimmed.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);

      const parseNominatimLike = (data) => {
        if (!Array.isArray(data)) {
          return [];
        }

        return data.map(item => {
          const displayName = item.display_name || '';
          if (!displayName) {
            return null;
          }

          const parts = displayName.split(',').map(part => part.trim()).filter(Boolean);
          const primary = parts[0] || displayName;
          const secondary = parts.slice(1, 4).join(', ');

          return {
            label: primary,
            description: secondary,
            value: displayName,
            lat: item.lat,
            lon: item.lon,
            raw: item
          };
        }).filter(Boolean);
      };

      const parsePhoton = (data) => {
        if (!data || !Array.isArray(data.features)) {
          return [];
        }

        return data.features.map(feature => {
          const props = feature.properties || {};
          const coordinates = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : [];

          const name = props.name || '';
          const street = [props.street || props.street_name, props.housenumber].filter(Boolean).join(' ');
          const primary = name || street || props.city || props.town || props.village || '';

          if (!primary) {
            return null;
          }

          const locality = props.city || props.town || props.village || props.county || '';
          const contextParts = [street && street !== primary ? street : null, locality !== primary ? locality : null, props.state, props.country]
            .filter(Boolean)
            .map(part => String(part));

          const description = contextParts.filter(Boolean).slice(name ? 0 : 0).join(', ');
          const valueParts = [primary];
          if (description) {
            valueParts.push(description);
          }

          return {
            label: primary,
            description,
            value: valueParts.join(', '),
            lat: coordinates.length > 1 ? coordinates[1] : undefined,
            lon: coordinates.length > 0 ? coordinates[0] : undefined,
            raw: feature
          };
        }).filter(Boolean);
      };

      const providers = [
        {
          name: 'mapsCo',
          buildUrl: (query) => {
            const params = new URLSearchParams({
              q: query,
              format: 'json',
              addressdetails: '1',
              limit: '8',
              dedupe: '1',
              extratags: '0'
            });
            return `https://geocode.maps.co/search?${params.toString()}`;
          },
          formatter: parseNominatimLike
        },
        {
          name: 'photon',
          buildUrl: (query) => {
            const params = new URLSearchParams({
              q: query,
              limit: '8',
              lang: 'en'
            });
            return `https://photon.komoot.io/api/?${params.toString()}`;
          },
          formatter: parsePhoton
        },
        {
          name: 'nominatim',
          buildUrl: (query) => {
            const params = new URLSearchParams({
              q: query,
              format: 'json',
              addressdetails: '1',
              limit: '8',
              dedupe: '1',
              extratags: '0',
              email: 'support@revayahost.com'
            });
            return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
          },
          formatter: parseNominatimLike
        }
      ];

      const timeoutId = setTimeout(async () => {
        try {
          let formattedSuggestions = [];
          let lastError = null;

          for (const provider of providers) {
            try {
              const url = provider.buildUrl(trimmed);

              const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json'
                }
              });

              if (!response.ok) {
                throw new Error(`Location lookup failed with status ${response.status}`);
              }

              const data = await response.json();
              formattedSuggestions = provider.formatter(data);

              if (formattedSuggestions.length) {
                break;
              }
            } catch (providerError) {
              lastError = providerError;
              if (controller.signal.aborted) {
                throw providerError;
              }
              continue;
            }
          }

          if (!formattedSuggestions.length) {
            if (lastError) {
              console.warn('Location autocomplete fallback after errors:', lastError);
            }
            formattedSuggestions = buildFallbackSuggestions(trimmed);
          }

          setSuggestions(formattedSuggestions);
          setShowSuggestions(formattedSuggestions.length > 0);
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Location autocomplete error:', error);
            const fallback = buildFallbackSuggestions(trimmed);
            setSuggestions(fallback);
            setShowSuggestions(fallback.length > 0);
          }
        } finally {
          setLoading(false);
        }
      }, 350);

      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }, [searchTerm, buildFallbackSuggestions]);

    React.useEffect(() => {
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, []);

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

    const shouldShowDropdown = showSuggestions && (loading || suggestions.length > 0);

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
        
        {shouldShowDropdown && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            data-name="suggestions-dropdown"
          >
            {loading && (
              <div className="px-4 py-2 text-sm text-gray-500 flex items-center space-x-2" data-name="suggestion-loading">
                <span className="inline-block h-4 w-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></span>
                <span>Searching...</span>
              </div>
            )}

            {!loading && suggestions.map((suggestion, index) => (
              <button
                key={suggestion.value || index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                data-name="suggestion-item"
              >
                <span className="block text-gray-900">{suggestion.label || suggestion.value}</span>
                {suggestion.description && (
                  <span className="block text-xs text-gray-500 mt-1">{suggestion.description}</span>
                )}
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