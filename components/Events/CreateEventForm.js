function CreateEventForm({ onEventCreated }) {
  const context = React.useContext(window.AuthContext || React.createContext({}));
  const { user } = context;

  const [formData, setFormData] = React.useState({
    name: '',
    title: '',
    event_type: '',
    description: '',
    about: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    event_time: '',
      date: '',
      expected_attendance: '',
    support_staff_needed: '',
    budget: '',
    budget_min: '',
    budget_max: '',
    logo: '',
    event_map: '',
    event_schedule: [{ date: '', startTime: '', endTime: '' }],
    status: 'draft',
    is_public: true
  });

  const [loading, setLoading] = React.useState(false);
  const [imageFile, setImageFile] = React.useState(null);
  const [mapFile, setMapFile] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);

  if (!user) {
    return React.createElement(window.Login);
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.event_schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setFormData(prev => ({ 
      ...prev, 
      event_schedule: newSchedule 
    }));
  };

  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      event_schedule: [...prev.event_schedule, { date: '', startTime: '', endTime: '' }]
    }));
  };

  const removeScheduleItem = (index) => {
    if (formData.event_schedule.length > 1) {
      const newSchedule = formData.event_schedule.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        event_schedule: newSchedule
      }));
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;

    setUploading(true);
    try {
      // First, try to create the bucket if it doesn't exist
      const { data: buckets } = await window.supabaseClient.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'event-images');
      
      if (!bucketExists) {
        const { error: bucketError } = await window.supabaseClient.storage.createBucket('event-images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError && !bucketError.message.includes('already exists')) {
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `event_${user.id}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await window.supabaseClient.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // If bucket still doesn't exist, fall back to a simple URL
        if (error.message.includes('Bucket not found')) {
          return URL.createObjectURL(file);
        }
        throw error;
      }

      const { data: { publicUrl } } = window.supabaseClient.storage
        .from('event-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      // Fall back to local preview URL
      const localUrl = URL.createObjectURL(file);
      window.showToast && window.showToast('Using local preview (upload failed)', 'warning');
      return localUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setLoading(true);

      if (!formData.name && !formData.title) {
        window.showToast && window.showToast('Please enter an event name', 'error');
        return;
      }

      if (!formData.event_type) {
        window.showToast && window.showToast('Please select an event type', 'error');
        return;
      }

      let logoUrl = formData.logo;
      if (imageFile) {
        logoUrl = await handleImageUpload(imageFile);
      }

      let mapUrl = formData.event_map;
      if (mapFile) {
        mapUrl = await handleImageUpload(mapFile);
      }

      // Filter schedule to include items with at least a date (times are optional)
      const schedule = formData.event_schedule.filter(item => 
        item && item.date && item.date.trim() !== ''
      );

      // Sort schedule by date to ensure proper ordering
      schedule.sort((a, b) => new Date(a.date) - new Date(b.date));

      const primaryDate = schedule.length > 0 ? schedule[0].date : 
        (formData.start_date || formData.date || '');
      
      // Calculate end_date from the last date in the schedule (after sorting)
      const lastDate = schedule.length > 0 ? schedule[schedule.length - 1].date : 
        (formData.end_date || primaryDate);
      

      const eventData = {
        name: formData.name || formData.title,
        title: formData.title || formData.name,
        event_type: formData.event_type,
        description: formData.description || formData.about,
        about: formData.about || formData.description,
        location: formData.location,
        date: primaryDate,
        start_date: formData.start_date || primaryDate,
        end_date: lastDate,
        event_time: formData.event_time || formData.start_time,
        expected_attendance: formData.expected_attendance ? parseInt(formData.expected_attendance, 10) : null,
        support_staff_needed: formData.support_staff_needed ? parseInt(formData.support_staff_needed, 10) : null,
        budget: formData.budget_max ? 
          `$${formData.budget_min || 0} - $${formData.budget_max}` : formData.budget,
        logo: logoUrl,
        event_map: mapUrl,
        event_schedule: schedule,
        status: 'draft',
        is_public: formData.is_public !== false,
        user_id: user.id,
        created_by: user.id,
        owner_email: user.email
      };

      Object.keys(eventData).forEach(key => {
        if (eventData[key] === '') eventData[key] = null;
      });

      const { data: newEvent, error } = await window.supabaseClient
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Add default budget items for new events
      try {
        const defaultBudgetItems = [
          { title: 'Venue', category: 'Venue', description: 'Event venue rental', allocated: 0, spent: 0 },
          { title: 'Catering', category: 'Catering', description: 'Food and beverage service', allocated: 0, spent: 0 },
          { title: 'Entertainment', category: 'Entertainment', description: 'Music, DJ, or live entertainment', allocated: 0, spent: 0 },
          { title: 'Photography', category: 'Photography', description: 'Event photography and videography', allocated: 0, spent: 0 },
          { title: 'Decorations', category: 'Decorations', description: 'Flowers, lighting, and decor', allocated: 0, spent: 0 }
        ];

        const budgetItemsData = defaultBudgetItems.map(item => ({
          event_id: newEvent.id,
          title: item.title,
          category: item.category,
          description: item.description,
          allocated: item.allocated,
          spent: item.spent,
          created_by: user.id
        }));

        const { error: budgetError } = await window.supabaseClient
          .from('event_budget_items')
          .insert(budgetItemsData);

        if (budgetError) {
          // Budget creation failed - non-critical error
        }
      } catch (budgetError) {
        // Budget creation failed - non-critical error
      }

      window.showToast && window.showToast('Event created successfully!', 'success');
      window.location.hash = `#/event/view/${newEvent.id}`;

    } catch (error) {
      window.showToast && window.showToast(`Failed to create event: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'max-w-4xl mx-auto p-6 bg-white' }, [
    React.createElement('div', { key: 'header', className: 'mb-8' }, [
      React.createElement('h1', { 
        key: 'title',
        className: 'text-3xl font-bold text-gray-900 mb-2' 
      }, 'Create New Event'),
      React.createElement('p', {
        key: 'subtitle', 
        className: 'text-gray-600'
      }, 'Fill out the details below to create your event')
    ]),

    React.createElement('form', {
      key: 'form',
      className: 'space-y-6',
      onSubmit: (e) => {
        e.preventDefault();
        handleCreateEvent();
      }
    }, [
      // Basic Information
      React.createElement('div', { key: 'basic-info', className: 'space-y-4' }, [
        React.createElement('h2', { 
          key: 'basic-title',
          className: 'text-xl font-semibold text-gray-900 border-b pb-2'
        }, 'Basic Information'),

        React.createElement('div', { key: 'name-field' }, [
          React.createElement('label', { 
            key: 'name-label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Event Name *'),
          React.createElement('input', {
            key: 'name-input',
            type: 'text',
            value: formData.name,
            onChange: (e) => {
              handleInputChange('name', e.target.value);
              handleInputChange('title', e.target.value);
            },
            className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            placeholder: 'Enter your event name',
            required: true
          })
        ]),

        React.createElement('div', { key: 'description-field' }, [
          React.createElement('label', { 
            key: 'description-label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Event Description'),
          React.createElement('textarea', {
            key: 'description-input',
            value: formData.description,
            onChange: (e) => {
              handleInputChange('description', e.target.value);
              handleInputChange('about', e.target.value);
            },
            rows: 4,
            className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            placeholder: 'Describe your event'
          })
        ])
      ]),



      // Location & Date
      React.createElement('div', { key: 'location-date', className: 'space-y-4' }, [
        React.createElement('h2', { 
          key: 'location-title',
          className: 'text-xl font-semibold text-gray-900 border-b pb-2'
        }, 'Location & Date'),

        React.createElement('div', { key: 'location-field' }, [
          React.createElement('label', { 
            key: 'location-label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Event Location'),
          React.createElement(window.LocationAutocomplete, {
            key: 'location-input',
            value: formData.location,
            onChange: (value) => handleInputChange('location', value),
            onSelect: (value) => handleInputChange('location', value),
            placeholder: 'Enter venue or location',
            className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          })
        ])
      ]),



      // Attendance & Event Assets
      React.createElement('div', { key: 'attendance-section', className: 'space-y-4' }, [
        React.createElement('h2', { 
          key: 'attendance-title',
          className: 'text-xl font-semibold text-gray-900 border-b pb-2'
        }, 'Attendance & Event Assets'),

        // Expected Attendees and Support Staff Needed - Side by Side
        React.createElement('div', { key: 'attendance-staff-grid', className: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
          React.createElement('div', { key: 'expected-attendance' }, [
            React.createElement('label', { 
              key: 'expected-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Expected Attendees'),
            React.createElement('input', {
              key: 'expected-input',
              type: 'number',
              value: formData.expected_attendance,
              onChange: (e) => handleInputChange('expected_attendance', e.target.value),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              placeholder: 'Number of attendees'
            })
          ]),

          React.createElement('div', { key: 'support-staff-needed' }, [
            React.createElement('label', { 
              key: 'support-staff-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Support Staff Needed'),
            React.createElement('input', {
              key: 'support-staff-input',
              type: 'number',
              value: formData.support_staff_needed,
              onChange: (e) => handleInputChange('support_staff_needed', e.target.value),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              placeholder: 'Number of staff needed'
            })
          ])
        ]),

        // Event Icon and Map Uploaders - Side by Side
        React.createElement('div', { key: 'assets-grid', className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          // Event Icon/Logo Upload
          React.createElement('div', { key: 'icon-upload', className: 'space-y-3' }, [
            React.createElement('label', { 
              key: 'icon-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Event Icon/Logo'),
            React.createElement('input', {
              key: 'icon-input',
              type: 'file',
              accept: 'image/*',
              onChange: (e) => {
                const file = e.target.files[0];
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  handleInputChange('logo', previewUrl);
                  setImageFile(file);
                }
              },
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            }),
            React.createElement('p', {
              key: 'icon-help-text',
              className: 'text-xs text-gray-500'
            }, 'Accepted formats: JPG, PNG, GIF, WebP (Max size: 5MB)'),
            
            // Icon preview
            formData.logo && React.createElement('div', {
              key: 'icon-preview',
              className: 'mt-3'
            }, [
              React.createElement('p', {
                key: 'icon-preview-label',
                className: 'text-sm text-gray-700 mb-2'
              }, 'Icon Preview:'),
              React.createElement('img', {
                key: 'icon-preview-image',
                src: formData.logo,
                alt: 'Event icon preview',
                className: 'w-24 h-24 object-contain border border-gray-200 rounded-lg'
              })
            ])
          ]),

          // Event Map/Floor Plan Upload
          React.createElement('div', { key: 'map-upload', className: 'space-y-3' }, [
            React.createElement('label', { 
              key: 'map-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Event Map/Floor Plan'),
            React.createElement('input', {
              key: 'map-input',
              type: 'file',
              accept: 'image/*',
              onChange: (e) => {
                const file = e.target.files[0];
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  handleInputChange('event_map', previewUrl);
                  setMapFile(file);
                }
              },
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            }),
            React.createElement('p', {
              key: 'map-help-text',
              className: 'text-xs text-gray-500'
            }, 'Accepted formats: JPG, PNG, GIF, WebP (Max size: 5MB)'),
            
            // Map preview
            formData.event_map && React.createElement('div', {
              key: 'map-preview',
              className: 'mt-3'
            }, [
              React.createElement('p', {
                key: 'map-preview-label',
                className: 'text-sm text-gray-700 mb-2'
              }, 'Map Preview:'),
              React.createElement('img', {
                key: 'map-preview-image',
                src: formData.event_map,
                alt: 'Event map preview',
                className: 'max-w-full h-32 object-contain border border-gray-200 rounded-lg'
              })
            ])
          ])
        ])
      ]),

      // Event Schedule Section
      React.createElement('div', { key: 'event-schedule', className: 'space-y-4' }, [
        React.createElement('h2', { 
          key: 'schedule-title',
          className: 'text-xl font-semibold text-gray-900 border-b pb-2'
        }, 'Event Schedule'),

        React.createElement('div', { key: 'schedule-content', className: 'space-y-4' }, [
          React.createElement('p', { 
            key: 'schedule-help',
            className: 'text-sm text-gray-600'
          }, 'Add dates and times for your event. You can add multiple dates for multi-day events.'),

          // Schedule Items
          ...formData.event_schedule.map((item, index) => 
            React.createElement('div', { 
              key: `schedule-${index}`,
              className: 'border border-gray-200 rounded-lg p-4 bg-gray-50'
            }, [
              React.createElement('div', { 
                key: `schedule-header-${index}`,
                className: 'flex items-center justify-between mb-3'
              }, [
                React.createElement('h3', {
                  key: `schedule-item-title-${index}`,
                  className: 'text-sm font-medium text-gray-700'
                }, `Date ${index + 1}`),
                formData.event_schedule.length > 1 && React.createElement('button', {
                  key: `remove-schedule-${index}`,
                  type: 'button',
                  onClick: () => removeScheduleItem(index),
                  className: 'text-red-600 hover:text-red-800 text-sm'
                }, 'Remove')
              ]),

              React.createElement('div', { 
                key: `schedule-fields-${index}`,
                className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
              }, [
                React.createElement('div', { key: `date-${index}` }, [
                  React.createElement('label', { 
                    key: `date-label-${index}`,
                    className: 'block text-sm font-medium text-gray-700 mb-1'
                  }, 'Date'),
                  React.createElement('input', {
                    key: `date-input-${index}`,
                    type: 'date',
                    value: item.date,
                    onChange: (e) => handleScheduleChange(index, 'date', e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  })
                ]),
                React.createElement('div', { key: `start-time-${index}` }, [
                  React.createElement('label', { 
                    key: `start-label-${index}`,
                    className: 'block text-sm font-medium text-gray-700 mb-1'
                  }, 'Start Time'),
                  React.createElement('input', {
                    key: `start-input-${index}`,
                    type: 'time',
                    value: item.startTime,
                    onChange: (e) => handleScheduleChange(index, 'startTime', e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  })
                ]),
                React.createElement('div', { key: `end-time-${index}` }, [
                  React.createElement('label', { 
                    key: `end-label-${index}`,
                    className: 'block text-sm font-medium text-gray-700 mb-1'
                  }, 'End Time'),
                  React.createElement('input', {
                    key: `end-input-${index}`,
                    type: 'time',
                    value: item.endTime,
                    onChange: (e) => handleScheduleChange(index, 'endTime', e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  })
                ])
              ])
            ])
          ),

          // Add Date Button
          React.createElement('button', {
            key: 'add-schedule-button',
            type: 'button',
            onClick: addScheduleItem,
            className: 'w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center space-x-2'
          }, [
            React.createElement('i', {
              key: 'add-icon',
              className: 'fas fa-plus'
            }),
            React.createElement('span', {
              key: 'add-text'
            }, 'Add Another Date')
          ])
        ])
      ]),

      // Event Assets

      // Event Type Selection (moved to bottom before privacy)
      React.createElement('div', { key: 'event-type-section', className: 'space-y-4' }, [
        React.createElement('h2', { 
          key: 'type-title',
          className: 'text-xl font-semibold text-gray-900 border-b pb-2'
        }, 'Event Type'),

        React.createElement('div', { key: 'event-type-field' }, [
          React.createElement('label', { 
            key: 'type-label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Select Event Type *'),
          React.createElement('div', { 
            key: 'event-type-selector',
            className: 'space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4'
          }, Object.entries(window.EVENT_TYPES || {}).map(([category, types]) =>
            React.createElement('div', { 
              key: category,
              className: 'space-y-2'
            }, [
              React.createElement('h4', {
                key: `${category}-title`,
                className: 'text-sm font-medium text-gray-800'
              }, category),
              React.createElement('div', {
                key: `${category}-options`,
                className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'
              }, types.map(eventType =>
                React.createElement('label', {
                  key: eventType,
                  className: `flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 text-sm ${
                    formData.event_type === eventType ? 'border-indigo-500 bg-indigo-50' : ''
                  }`
                }, [
                  React.createElement('input', {
                    key: `${eventType}-radio`,
                    type: 'radio',
                    name: 'event_type',
                    value: eventType,
                    checked: formData.event_type === eventType,
                    onChange: (e) => handleInputChange('event_type', e.target.value),
                    className: 'sr-only'
                  }),
                  React.createElement('span', {
                    key: `${eventType}-text`,
                    className: `${
                      formData.event_type === eventType ? 'text-indigo-700 font-medium' : 'text-gray-700'
                    }`
                  }, eventType)
                ])
              ))
            ])
          ))
        ])
      ]),


      // Submit Button
      React.createElement('div', { key: 'submit', className: 'pt-6' }, [
        React.createElement('button', {
          key: 'submit-button',
          type: 'submit',
          disabled: loading || uploading,
          className: `w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
            loading || uploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`
        }, loading ? 'Creating Event...' : 'Create Event')
      ])
    ])
  ]);
}

window.CreateEventForm = CreateEventForm;