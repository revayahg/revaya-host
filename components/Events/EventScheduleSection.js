function EventScheduleSection({ eventSchedule, onChange }) {
  try {
    const [schedule, setSchedule] = React.useState(eventSchedule || [{ date: '', startTime: '', endTime: '' }]);

    React.useEffect(() => {
      if (eventSchedule && eventSchedule.length > 0) {
        setSchedule(eventSchedule);
      }
    }, [eventSchedule]);

    const handleScheduleChange = (index, field, value) => {
      const newSchedule = [...schedule];
      newSchedule[index] = { ...newSchedule[index], [field]: value };
      setSchedule(newSchedule);
      onChange(newSchedule);
    };

    const addScheduleItem = () => {
      const newSchedule = [...schedule, { date: '', startTime: '', endTime: '' }];
      setSchedule(newSchedule);
      onChange(newSchedule);
    };

    const removeScheduleItem = (index) => {
      if (schedule.length > 1) {
        const newSchedule = schedule.filter((_, i) => i !== index);
        setSchedule(newSchedule);
        onChange(newSchedule);
      }
    };

    return (
      <div className="bg-white rounded-lg p-6 space-y-6" data-name="event-schedule">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Event Schedule</h3>
          <button
            type="button"
            onClick={addScheduleItem}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-1"></i>
            Add Another Date
          </button>
        </div>

        {schedule.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                {schedule.length > 1 ? `Date ${index + 1}` : 'Event Date & Time'}
              </h4>
              {schedule.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeScheduleItem(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  <i className="fas fa-trash mr-1"></i>
                  Remove
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date (Optional)</label>
                <input
                  type="date"
                  value={item.date || ''}
                  onChange={(e) => handleScheduleChange(index, 'date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Time (Optional)</label>
                <input
                  type="time"
                  value={item.startTime || ''}
                  onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Time (Optional)</label>
                <input
                  type="time"
                  value={item.endTime || ''}
                  onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 rounded-lg">
        Error loading schedule section. Please refresh the page.
      </div>
    );
  }
}

window.EventScheduleSection = EventScheduleSection;