// Create Event Button Component
function CreateEventButton({ formData }) {
  const [loading, setLoading] = React.useState(false);
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;

  const handleCreateEvent = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        window.toast?.error('You must be logged in to create an event');
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.event_type) {
        window.toast?.error('Please fill in all required fields');
        return;
      }


      // Get first valid date from event schedule or use individual date fields
      const eventSchedule = formData.event_schedule || formData.eventSchedule || [];
      
      // Sort schedule by date to ensure proper ordering
      eventSchedule.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const firstSchedule = eventSchedule.find(s => s && s.date) || {};
      const primaryDate = firstSchedule.date || formData.start_date || formData.date || null;
      
      // Calculate end_date from the last date in the schedule (after sorting)
      const lastSchedule = eventSchedule.filter(s => s && s.date).pop();
      const lastDate = lastSchedule ? lastSchedule.date : (formData.end_date || primaryDate);
      
      // Prepare event data for database - mapping to correct schema fields
      const eventData = {
        name: formData.name,
        title: formData.name,
        event_type: formData.event_type,
        date: primaryDate,
        start_date: primaryDate,
        end_date: lastDate,
        location: formData.location || null,
        description: formData.description || formData.about || null,
        about: formData.about || formData.description || null,
        budget: formData.budget || null,
        attendance: formData.attendance || null,
        attendance_range: formData.attendance_range || null,
        expected_attendance: formData.expected_attendance ? parseInt(formData.expected_attendance, 10) : null,
        event_time: formData.event_time || formData.start_time || null,
        logo: formData.logo || null,
        event_map: formData.eventMap || formData.event_map || null,
        event_schedule: eventSchedule.length > 0 ? eventSchedule : null,
        eventSchedule: eventSchedule.length > 0 ? eventSchedule : null,
        user_id: user.id,
        is_public: formData.is_public !== false,
        status: 'draft'
      };

      // Remove any fields with empty string values to avoid database errors
      Object.keys(eventData).forEach(key => {
        if (eventData[key] === '') {
          eventData[key] = null;
        }
      });


      // Create event directly with Supabase
      const { data: newEvent, error } = await window.supabaseClient
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }


      // Save vendor categories if provided
      if (formData.vendorCategories && formData.vendorCategories.length > 0) {
        try {
          const categoriesData = formData.vendorCategories.map(category => ({
            event_id: newEvent.id,
            category_name: category,
            category_icon: '🔧', // Default icon
            created_by: user.id
          }));

          const { error: catError } = await window.supabaseClient
            .from('event_vendor_categories')
            .insert(categoriesData);

          if (catError) {
          }
        } catch (catError) {
        }
      }

      // Save event schedule to event_dates table if provided
      const scheduleToSave = formData.event_schedule || formData.eventSchedule || [];
      if (scheduleToSave.length > 0) {
        try {
          const validSchedules = scheduleToSave.filter(s => s && s.date && s.startTime && s.endTime);
          if (validSchedules.length > 0) {
            const eventDatesData = validSchedules.map(schedule => ({
              event_id: newEvent.id,
              event_date: schedule.date,
              start_time: schedule.startTime,
              end_time: schedule.endTime,
              created_by: user.id
            }));

            const { error: datesError } = await window.supabaseClient
              .from('event_dates')
              .insert(eventDatesData);

            if (datesError) {
            }
          }
        } catch (schedError) {
        }
      }

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
          console.error('Error creating default budget items:', budgetError);
        } else {
          console.log('Default budget items created successfully');
        }
      } catch (budgetError) {
        console.error('Error in budget creation:', budgetError);
      }

      window.toast?.success('Event created successfully!');
      
      // Navigate to the new event detail page
      window.location.hash = `#/event/view/${newEvent.id}`;
      
    } catch (error) {
      window.toast?.error(`Failed to create event: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateEvent}
      disabled={loading || !formData.name || !formData.event_type}
      className={`px-8 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
        loading || !formData.name || !formData.event_type
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5'
      }`}
    >
      {loading ? (
        <div className="flex items-center">
          <i className="fas fa-spinner fa-spin mr-2"></i>
          Creating Event...
        </div>
      ) : (
        <div className="flex items-center">
          <i className="fas fa-plus mr-2"></i>
          Create Event
        </div>
      )}
    </button>
  );
}

function VendorMatching({ formData, aiSuggestions, onInputChange, onPrevious }) {
  try {
    // Scroll to top when component mounts
    React.useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Auto-select AI suggested categories when component mounts
    React.useEffect(() => {
      if (aiSuggestions?.vendorCategories?.length > 0 && (!formData.vendorCategories || formData.vendorCategories.length === 0)) {
        onInputChange({
          target: {
            name: 'vendorCategories',
            value: aiSuggestions.vendorCategories
          }
        });
      }
    }, [aiSuggestions]);

    const vendorCategoryGroups = window.VENDOR_CATEGORIES;
    
    // Flatten categories for easy lookup
    const allCategories = Object.values(vendorCategoryGroups).flat();

    // Handle category selection/deselection
    const handleCategoryToggle = (categoryName) => {
      const currentCategories = Array.isArray(formData.vendorCategories) ? formData.vendorCategories : [];
      const newCategories = currentCategories.includes(categoryName)
        ? currentCategories.filter(c => c !== categoryName)
        : [...currentCategories, categoryName];
      
      onInputChange({
        target: {
          name: 'vendorCategories',
          value: newCategories
        }
      });
    };

    const CategoryButton = ({ category, suggested }) => {
      const currentCategories = Array.isArray(formData.vendorCategories) ? formData.vendorCategories : [];
      const isSelected = currentCategories.includes(category.name);
      
      return (
        <button
          type="button"
          onClick={() => handleCategoryToggle(category.name)}
          className={`group relative w-full p-4 rounded-lg border-2 transition-all duration-200 ${
            isSelected
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform -translate-y-1'
              : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-1'
          }`}
          data-name={`vendor-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-xl" role="img" aria-label={category.name}>
              {category.icon}
            </span>
            <span className="text-sm font-medium flex-grow text-left">
              {category.name}
            </span>
            {isSelected && (
              <span className="text-indigo-600">
                <i className="fas fa-check-circle"></i>
              </span>
            )}
          </div>
          {suggested && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-xs text-white px-2 py-1 rounded-full">
              Suggested
            </div>
          )}
        </button>
      );
    };

    const currentCategories = formData.vendorCategories || [];
    const suggestedCategories = Array.isArray(aiSuggestions?.vendorCategories) 
      ? aiSuggestions.vendorCategories 
      : [];

    console.log('Vendor matching data:', {
      currentCategories,
      suggestedCategories,
      eventType: formData.eventType
    });

    return (
      <div data-name="vendor-matching" className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Set Up Your Vendors</h2>
          <p className="mt-2 text-gray-600">
            We've pre-selected some recommended categories for your {formData.eventType || 'event'}.
            Feel free to modify these selections or add more categories below.
          </p>
        </div>

        {/* All Categories with AI Suggestions */}
        <div className="space-y-8">
          {Object.entries(vendorCategoryGroups).map(([category, items]) => {
            const selectedInCategory = items.filter(item => 
              currentCategories.includes(item.name)
            ).length;

            // Count suggested items in this category
            const suggestedInCategory = items.filter(item =>
              suggestedCategories.includes(item.name)
            ).length;

            return (
              <div key={category} className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 border-b pb-2 flex items-center">
                  <span className="flex-grow">{category}</span>
                  <span className="text-xs text-gray-500">
                    {selectedInCategory} selected
                    {suggestedInCategory > 0 && ` (${suggestedInCategory} suggested)`}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item, index) => (
                    <CategoryButton
                      key={index}
                      category={item}
                      suggested={suggestedCategories.includes(item.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Categories Summary */}
        {currentCategories.length > 0 && (
          <div className="mt-8 p-6 bg-white rounded-xl border-2 border-indigo-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Selected Categories
              </h4>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                {currentCategories.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentCategories.map((categoryName, index) => {
                const category = allCategories.find(c => c.name === categoryName) || 
                               { name: categoryName, icon: '📌' };
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    <span className="mr-1">{category.icon}</span>
                    {categoryName}
                    <button
                      onClick={() => handleCategoryToggle(categoryName)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={onPrevious}
            className="px-6 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium transition-all duration-200 flex items-center"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <CreateEventButton formData={formData} />
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorMatching = VendorMatching;
