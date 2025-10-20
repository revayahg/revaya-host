function EventBasics({ formData, onChange, onInputChange, onDateChange, onNext, isEditing = false, showCreateButton, createButton }) {
  try {
    const eventTypeGroups = window.EVENT_TYPES;

    const handleOptionalFieldChange = (e) => {
      // Handle both event objects and direct values from LocationAutocomplete
      let name, value;
      
      if (typeof e === 'string') {
        // Direct value from LocationAutocomplete
        name = 'location';
        value = e;
      } else if (e && e.target) {
        // Regular input event
        const { name: targetName, value: targetValue } = e.target;
        name = targetName;
        value = targetValue;
      } else {
        // Invalid input
        return;
      }

      const changeHandler = onChange || onInputChange;
      if (changeHandler) {
        if (onChange) {
          onChange(name, value.trim() === '' ? 'TBD' : value);
        } else {
          onInputChange({
            target: {
              name,
              value: value.trim() === '' ? 'TBD' : value
            }
          });
        }
      }
    };

    const handleFieldChange = (e) => {
      const { name, value } = e.target;
      const changeHandler = onChange || onInputChange;
      if (changeHandler) {
        if (onChange) {
          onChange(name, value);
        } else {
          onInputChange({
            target: { name, value }
          });
        }
      }
    };

    const handleDateChange = (type, value) => {
      if (!value) {
        onDateChange(type, 'TBD');
        return;
      }

      try {
        const date = new Date(value);
        const isoDate = date.toISOString().split('T')[0];
        onDateChange(type, isoDate);
      } catch (error) {
        reportError(error);
        onDateChange(type, 'TBD');
      }
    };

    const validateEndDate = (endDate) => {
      const eventDates = formData.eventDates || { startDate: '', endDate: '' };
      if (!endDate || endDate === 'TBD' || eventDates.startDate === 'TBD') {
        return true;
      }
      return new Date(endDate) >= new Date(eventDates.startDate);
    };

      const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          if (window.showToast) {
            window.showToast('Please upload a valid image file (JPG, PNG, or GIF)', 'error');
          }
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          if (window.showToast) {
            window.showToast('Image size must be less than 5MB', 'error');
          }
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const changeHandler = onChange || onInputChange;
          if (changeHandler) {
            if (onChange) {
              onChange('logo', reader.result);
            } else {
              onInputChange({
                target: {
                  name: 'logo',
                  value: reader.result
                }
              });
            }
          }
        };
        reader.readAsDataURL(file);
      };

    const handleMapUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        window.toast.error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        window.toast.error('Image file must be under 5MB');
        return;
      }

      try {
        // First show a preview with blob URL
        const previewUrl = URL.createObjectURL(file);
        const changeHandler = onChange || onInputChange;
        if (changeHandler) {
          if (onChange) {
            onChange('eventMap', previewUrl);
            onChange('event_map', previewUrl);
          } else {
            onInputChange({ target: { name: 'eventMap', value: previewUrl } });
            onInputChange({ target: { name: 'event_map', value: previewUrl } });
          }
        }

        // Try to upload to storage for persistence
        try {
          // Use mediaHelpers if available
          if (window.__mediaHelpers?.uploadToStorage) {
            const eventId = formData.id || 'draft';
            const result = await window.__mediaHelpers.uploadToStorage(eventId, 'map', file);
            
            // Update with permanent URL
            if (changeHandler) {
              if (onChange) {
                onChange('eventMap', result.publicUrl);
                onChange('event_map', result.publicUrl);
              } else {
                onInputChange({ target: { name: 'eventMap', value: result.publicUrl } });
                onInputChange({ target: { name: 'event_map', value: result.publicUrl } });
              }
            }
            // Auto-save the event_map to database if we have an event ID
            if (formData.id && formData.id !== 'draft') {
              try {
                const { error: updateError } = await window.supabaseClient
                  .from('events')
                  .update({ event_map: result.publicUrl })
                  .eq('id', formData.id);
                
                if (updateError) {
                }
              } catch (saveError) {
              }
            }
            return;
          }
          
          // Fallback to direct upload
          const fileExt = file.name.split('.').pop();
          const fileName = `map_${Date.now()}.${fileExt}`;
          const path = `events/${formData.id || 'draft'}/${fileName}`;
          
          // Ensure proper mime type
          const uploadOptions = {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || `image/${fileExt}`
          };
          
          const { data, error } = await window.supabaseClient.storage
            .from('event-images')
            .upload(path, file, uploadOptions);

          if (!error && data) {
            const { data: { publicUrl } } = window.supabaseClient.storage
              .from('event-images')
              .getPublicUrl(path);

            // Update with permanent URL
            if (changeHandler) {
              if (onChange) {
                onChange('eventMap', publicUrl);
                onChange('event_map', publicUrl);
              } else {
                onInputChange({ target: { name: 'eventMap', value: publicUrl } });
                onInputChange({ target: { name: 'event_map', value: publicUrl } });
              }
            }
            // Auto-save the event_map to database if we have an event ID
            if (formData.id && formData.id !== 'draft') {
              try {
                const { error: updateError } = await window.supabaseClient
                  .from('events')
                  .update({ event_map: publicUrl })
                  .eq('id', formData.id);
                
                if (updateError) {
                }
              } catch (saveError) {
              }
            }
          } else {
          }
        } catch (uploadError) {
          // Keep the blob URL as fallback
        }
      } catch (error) {
        window.toast.error('Failed to process map image');
      }
    };

    const EventTypeButton = ({ type }) => {
      const isSelected = formData.event_type === type;
      
      return (
        <button
          type="button"
          onClick={() => {
            const changeHandler = onChange || onInputChange;
            if (changeHandler) {
              if (onChange) {
                onChange('event_type', type);
              } else {
                onInputChange({ target: { name: 'event_type', value: type } });
              }
            }
          }}
          className={`group relative w-full p-4 rounded-lg border-2 transition-all duration-200 ${
            isSelected
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform -translate-y-1'
              : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-1'
          }`}
          data-name={`event-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium flex-grow text-left">
              {type}
            </span>
            {isSelected && (
              <span className="text-indigo-600">
                <i className="fas fa-check-circle"></i>
              </span>
            )}
          </div>
        </button>
      );
    };

    return (
      <div data-name="event-basics" className="space-y-6">
        {/* Required Field - Event Name */}
        <div data-name="event-name" className="form-group">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Event Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || formData.eventName || ''}
            onChange={handleFieldChange}
            className="form-input"
            placeholder="Enter your event name"
            required
          />
        </div>

        {/* About Field */}
        <div data-name="event-about" className="form-group">
          <label htmlFor="about" className="block text-sm font-medium text-gray-700">
            About This Event
          </label>
          <textarea
            id="about"
            name="about"
            value={formData.about || formData.description || ''}
            onChange={handleOptionalFieldChange}
            className="form-input"
            rows="4"
            placeholder="Describe your event, its purpose, what attendees can expect..."
          />
          <p className="text-xs text-gray-500 mt-1">
            This description will help vendors understand your event better.
          </p>
        </div>

        {/* Event Schedule Section */}
        {window.EventScheduleSection ? 
          React.createElement(window.EventScheduleSection, {
            eventSchedule: formData.eventSchedule && formData.eventSchedule.length > 0 ? formData.eventSchedule : [{ 
              date: formData.start_date || formData.date || '', 
              startTime: formData.start_time || '', 
              endTime: formData.end_time || '' 
            }],
            onChange: (schedule) => {
              const changeHandler = onChange || onInputChange;
              if (changeHandler) {
                if (onChange) {
                  onChange('eventSchedule', schedule);
                  // Also set primary fields for compatibility
                  if (schedule[0]) {
                    onChange('start_date', schedule[0].date || '');
                    onChange('start_time', schedule[0].startTime || '');
                    onChange('end_time', schedule[0].endTime || '');
                    onChange('date', schedule[0].date || '');
                  }
                } else {
                  onInputChange({ target: { name: 'eventSchedule', value: schedule } });
                }
              }
            }
          }) :
          // Fallback single date/time inputs
          React.createElement('div', {
            'data-name': 'event-schedule',
            className: 'bg-white rounded-lg p-6 space-y-6'
          }, [
            React.createElement('h3', {
              key: 'title',
              className: 'text-lg font-semibold text-gray-900'
            }, 'Event Date & Time (Optional)'),
            React.createElement('div', {
              key: 'fields',
              className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
            }, [
              React.createElement('div', { key: 'date' }, [
                React.createElement('label', {
                  key: 'date-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Date (Optional)'),
                React.createElement('input', {
                  key: 'date-input',
                  type: 'date',
                  value: formData.start_date || formData.date || '',
                  onChange: (e) => handleFieldChange({ target: { name: 'start_date', value: e.target.value } }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500'
                })
              ]),
              React.createElement('div', { key: 'start-time' }, [
                React.createElement('label', {
                  key: 'start-time-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Start Time (Optional)'),
                React.createElement('input', {
                  key: 'start-time-input',
                  type: 'time',
                  value: formData.start_time || '',
                  onChange: (e) => handleFieldChange({ target: { name: 'start_time', value: e.target.value } }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500'
                })
              ]),
              React.createElement('div', { key: 'end-time' }, [
                React.createElement('label', {
                  key: 'end-time-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'End Time (Optional)'),
                React.createElement('input', {
                  key: 'end-time-input',
                  type: 'time',
                  value: formData.end_time || '',
                  onChange: (e) => handleFieldChange({ target: { name: 'end_time', value: e.target.value } }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500'
                })
              ])
            ])
          ])
        }

        {/* Event Details Grid */}
        <div data-name="event-details" className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Event Details
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected Attendance */}
            <div>
                <select
                  id="attendance_range"
                  name="attendance_range"
                  value={formData.attendance_range || formData.attendance || ''}
                  onChange={handleFieldChange}
                  className="form-input"
                >
                <option value="">Expected Attendance</option>
                <option value="Under 50">Under 50</option>
                <option value="50-199">50-199</option>
                <option value="200-499">200-499</option>
                <option value="500-999">500-999</option>
                <option value="1000-4999">1000-4999</option>
                <option value="5000-9999">5000-9999</option>
                <option value="10000-49999">10000-49999</option>
                <option value="50000+">50000+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Optional Field - Location with Autocomplete */}
        <div data-name="event-location" className="form-group">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Event Location
          </label>
          <window.LocationAutocomplete
            value={formData.location}
            onChange={(value) => handleOptionalFieldChange(value)}
            onSelect={(value) => handleOptionalFieldChange(value)}
          />
        </div>

        {/* Optional Field - Event Logo */}
        <div data-name="event-logo" className="form-group">
          <label htmlFor="eventLogo" className="block text-sm font-medium text-gray-700">
            Event Logo (optional)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {formData.logo ? (
                <div className="relative">
                  <img
                    src={formData.logo}
                    alt="Event logo preview"
                    className="w-16 h-16 object-contain rounded-lg mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const changeHandler = onChange || onInputChange;
                      if (changeHandler) {
                        if (onChange) {
                          onChange('logo', '');
                        } else {
                          onInputChange({ target: { name: 'logo', value: '' } });
                        }
                      }
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <i className="fas fa-image text-gray-400 text-3xl mb-2"></i>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="event-logo-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      <span>Upload a logo</span>
                      <input
                        id="event-logo-upload"
                        name="logo"
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Field - Event Map */}
        <div data-name="event-map" className="form-group">
          <label className="block text-sm font-medium text-gray-700">
            Event Map / Layout
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {(formData.eventMap || formData.event_map) ? (
                <div className="relative">
                  <img
                    src={formData.eventMap || formData.event_map}
                    alt="Event map preview"
                    className="w-64 h-64 object-cover rounded-lg mx-auto border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const changeHandler = onChange || onInputChange;
                      if (changeHandler) {
                        if (onChange) {
                          onChange('eventMap', '');
                          onChange('event_map', '');
                        } else {
                          onInputChange({ target: { name: 'eventMap', value: '' } });
                          onInputChange({ target: { name: 'event_map', value: '' } });
                        }
                      }
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 hover:bg-red-600"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                  <div className="mt-2">
                    <label
                      htmlFor="event-map-upload-change"
                      className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Change Map
                      <input
                        id="event-map-upload-change"
                        name="event-map-upload-change"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleMapUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <i className="fas fa-map text-gray-400 text-3xl mb-2"></i>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="event-map-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      <span>Upload a map</span>
                      <input
                        id="event-map-upload"
                        name="event-map-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleMapUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Required Field - Event Type */}
        <div data-name="event-type" className="form-group mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Event Type *
          </label>
          <div className="space-y-6">
            {Object.entries(eventTypeGroups).map(([category, types]) => (
              <div key={category} className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 border-b pb-2 flex items-center">
                  <span className="flex-grow">{category}</span>
                  <span className="text-xs text-gray-500">
                    {types.includes(formData.event_type) ? '1 selected' : '0 selected'}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {types.map((type) => (
                    <EventTypeButton key={type} type={type} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
          {showCreateButton && createButton ? createButton : (
            <button
              type="button"
              onClick={onNext}
              disabled={!formData.name || !formData.event_type}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                formData.name && formData.event_type
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next: Choose Vendors
            </button>
          )}
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EventBasics = EventBasics;
