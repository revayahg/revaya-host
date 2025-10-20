function TimePicker({ value, onChange }) {
  try {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedTime, setSelectedTime] = React.useState(value === 'TBD' ? '' : value);
    const dropdownRef = React.useRef(null);

    const timeOptions = React.useMemo(() => {
      const options = [];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const display = new Date(`2000/01/01 ${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          options.push({ value: time, display });
        }
      }
      return options;
    }, []);

    React.useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDisplayTime = (time) => {
      if (!time || time === 'TBD' || typeof time !== 'string') return '';
      try {
        // Validate time format before processing
        if (time.length > 0 && time.includes(':')) {
          return new Date(`2000/01/01 ${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
        return time;
      } catch (error) {
        return time || '';
      }
    };

    const handleTimeSelect = (time) => {
      setSelectedTime(time);
      onChange({
        target: {
          name: 'eventTime',
          value: time === 'TBD' ? 'TBD' : formatDisplayTime(time)
        }
      });
      setIsOpen(false);
    };

    return (
      <div className="relative" ref={dropdownRef} data-name="time-picker">
        <input
          type="text"
          value={formatDisplayTime(selectedTime)}
          onClick={() => setIsOpen(!isOpen)}
          onChange={() => {}}
          placeholder="Select time"
          className="form-input cursor-pointer"
          readOnly
        />
        {selectedTime && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              handleTimeSelect('TBD');
            }}
          >
            <i className="fas fa-times-circle"></i>
          </button>
        )}

        {isOpen && (
          <div className="absolute z-50 w-48 mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
            <div className="py-1">
              {timeOptions.map(({ value, display }) => (
                <button
                  key={value}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none ${
                    selectedTime === value ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                  }`}
                  onClick={() => handleTimeSelect(value)}
                >
                  <span className="inline-block w-6 text-gray-400">
                    <i className="fas fa-clock"></i>
                  </span>
                  {display}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.TimePicker = TimePicker;
