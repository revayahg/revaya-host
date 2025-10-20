function VendorAvailabilityCalendar({ vendorId }) {
  try {
    const [unavailableDates, setUnavailableDates] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      if (vendorId) {
        loadUnavailableDates();
      }
    }, [vendorId, currentDate]);

    const loadUnavailableDates = async () => {
      try {
        setLoading(true);
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data, error } = await window.supabaseClient
          .from('vendor_unavailability')
          .select('date')
          .eq('vendor_profile_id', vendorId)
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0]);

        if (error) throw error;
        setUnavailableDates(data?.map(item => item.date) || []);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    };

    const isDateUnavailable = (date) => {
      if (!date) return false;
      const dateString = date.toISOString().split('T')[0];
      return unavailableDates.includes(dateString);
    };

    const navigateMonth = (direction) => {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + direction);
        return newDate;
      });
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = getDaysInMonth(currentDate);

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <div className="icon-calendar text-blue-500 mr-2 text-lg"></div>
          Availability
        </h3>
        
        <div className="calendar-container">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <div className="icon-chevron-left text-gray-600"></div>
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <div className="icon-chevron-right text-gray-600"></div>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="icon-loader text-2xl text-gray-400 animate-spin"></div>
              <p className="text-gray-500 mt-2">Loading calendar...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => (
                <div
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center text-sm relative
                    ${date ? 'hover:bg-gray-50' : ''}
                    ${date && isDateUnavailable(date) ? 'bg-red-50' : ''}
                  `}
                >
                  {date && (
                    <>
                      <span className={`
                        ${isDateUnavailable(date) ? 'text-red-600 font-medium' : 'text-gray-700'}
                      `}>
                        {date.getDate()}
                      </span>
                      {isDateUnavailable(date) && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Unavailable</span>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <div className="icon-calendar text-blue-500 mr-2 text-lg"></div>
          Availability
        </h3>
        <div className="text-center py-8">
          <div className="icon-alert-circle text-red-500 text-2xl mb-2"></div>
          <p className="text-gray-600">Unable to load calendar</p>
        </div>
      </div>
    );
  }
}

window.VendorAvailabilityCalendar = VendorAvailabilityCalendar;