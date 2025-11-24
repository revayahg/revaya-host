  // Mobile-optimized EditEventForm - Updated 2025-01-04 - BUG FIXES APPLIED
function EditEventForm({ eventId }) {
    try {
      const { user } = React.useContext(window.AuthContext);
      
      const [loading, setLoading] = React.useState(true);
      const [saving, setSaving] = React.useState(false);
      const [event, setEvent] = React.useState(null);
      const [formData, setFormData] = React.useState({});
      const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
      // ── Permissions: owners & editors can manage collaborators
      const [canManageCollaborators, setCanManageCollaborators] = React.useState(false);
      const [permissionsReady, setPermissionsReady] = React.useState(false);
      const [userRole, setUserRole] = React.useState(null);

      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          if (!user || !event) return;
          // Owner has full control
          if (event.user_id === user.id) {
            if (!cancelled) {
              setCanManageCollaborators(true);
              setUserRole('owner');
              setPermissionsReady(true);
            }
            return;
          }
          // Editors also have manage access
          try {
            const { data: rows, error } = await window.supabaseClient
              .from('event_user_roles')
              .select('role,status')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .limit(1);
            if (!cancelled) {
              const r = rows && rows[0];
              const isEditor = !!r && r.role === 'editor' && (r.status ?? 'active') === 'active';
              setCanManageCollaborators(isEditor);
              setUserRole(isEditor ? 'editor' : (r ? r.role : 'viewer'));
              setPermissionsReady(true);
            }
          } catch {
            if (!cancelled) {
              setCanManageCollaborators(false);
              setUserRole('viewer');
              setPermissionsReady(true);
            }
          }
        })();
        return () => { cancelled = true; };
      }, [user?.id, event?.id, event?.user_id]);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('basics');
    const [budgetItems, setBudgetItems] = React.useState([]);
    const [tasks, setTasks] = React.useState([]);
    // Vendor functionality disabled per user request
    const [collaborators, setCollaborators] = React.useState([]);
    const [pendingInvitations, setPendingInvitations] = React.useState([]);
    const [loadingCollaborators, setLoadingCollaborators] = React.useState(false);

    const handleNumberWheel = (event) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.blur();
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => target.focus());
      } else {
        setTimeout(() => target.focus(), 0);
      }
    };

    const cleanEventId = React.useMemo(() => {
      if (!eventId) return null;
      let cleaned = eventId.toString();
      if (cleaned.includes('/edit')) cleaned = cleaned.split('/edit')[0];
      return cleaned.split('?')[0].split('#')[0].trim();
    }, [eventId]);

    // Enhanced Upload helper for persistent image storage
    const uploadImageNew = React.useCallback(async (file, folder) => {
      try {
        const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
        const baseId = cleanEventId || 'draft';
        const path = `events/${baseId}/${folder}/${Date.now()}_${safeName}`;

        // Prefer shared helper if present
        if (window.__mediaHelpers?.uploadToStorage) {
          const eventIdForUpload = cleanEventId || 'draft';
          const result = await window.__mediaHelpers.uploadToStorage(eventIdForUpload, folder, file);
          return result.publicUrl;
        }

        // Direct upload to Supabase Storage (bucket: event-images)
        const { error: upErr } = await window.supabaseClient
          .storage.from('event-images')
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = window.supabaseClient
          .storage.from('event-images')
          .getPublicUrl(path);
        return pub?.publicUrl || '';
      } catch (e) {
        window.showToast && window.showToast('Image upload failed: ' + (e.message || e), 'error');
        throw e;
      }
    }, [cleanEventId]);

    // NEW: Upload helper so edited images persist (no more blob-only)
    const uploadImage = React.useCallback(async (file, folder) => {
      try {
        const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
        const baseId = cleanEventId || 'draft';
        const path = `events/${baseId}/${folder}/${Date.now()}_${safeName}`;

        // Prefer shared helper if present
        if (window.__mediaHelpers?.uploadToStorage) {
          return await window.__mediaHelpers.uploadToStorage(file, 'event-images', path);
        }

        // Direct upload to Supabase Storage (bucket: event-images)
        const { error: upErr } = await window.supabaseClient
          .storage.from('event-images')
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = window.supabaseClient
          .storage.from('event-images')
          .getPublicUrl(path);
        return pub?.publicUrl || '';
      } catch (e) {
        window.showToast && window.showToast('Image upload failed: ' + (e.message || e), 'error');
        throw e;
      }
    }, [cleanEventId]);

    React.useEffect(() => {
      const checkTabParam = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam && ['basics', 'budget', 'tasks', 'collaborators', 'event-chat', 'staff'].includes(tabParam)) {
          setActiveTab(tabParam);
        }
      };
      checkTabParam();
      const handle = () => setTimeout(checkTabParam, 80);
      window.addEventListener('hashchange', handle);
      window.addEventListener('tabchange', handle);
      window.addEventListener('popstate', handle);
      return () => {
        window.removeEventListener('hashchange', handle);
        window.removeEventListener('tabchange', handle);
        window.removeEventListener('popstate', handle);
      };
    }, []);

    // Prevent page reload on visibility change
    React.useEffect(() => {
      const handleVisibilityChange = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };

      const handleBeforeUnload = (e) => {
        // Prevent page reload if form has unsaved changes
        if (hasUnsavedChanges) {
          e.preventDefault();
          return '';
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange, true);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange, true);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [hasUnsavedChanges]);

    const storageKey = React.useMemo(() => 
      cleanEventId ? `edit-event-${cleanEventId}-${user?.id}` : null, 
      [cleanEventId, user?.id]
    );

    React.useEffect(() => {
      if (storageKey) {
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
          try {
            const draftData = JSON.parse(savedDraft);
            setFormData(prev => ({ ...prev, ...draftData }));
            setHasUnsavedChanges(true);
          } catch (e) {
            localStorage.removeItem(storageKey);
          }
        }
      }
    }, [storageKey]);

    React.useEffect(() => {
      if (storageKey && hasUnsavedChanges && Object.keys(formData).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }
    }, [formData, storageKey, hasUnsavedChanges]);

    React.useEffect(() => {
      if (cleanEventId && user) {
        fetchEventData();
      }
    }, [cleanEventId, user]);

    // FIXED: Enhanced fetchEventData function with better error handling and data loading
    const fetchEventData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: eventData, error: eventError } = await window.supabaseClient
          .from('events')
          .select('*')
          .eq('id', cleanEventId)
          .single();

        if (eventError) throw new Error(eventError.message);
        
        // FIXED: Load event schedule from the PRIMARY source (event_schedule JSONB field)
        let eventSchedule = [];
        
        // PRIMARY SOURCE: Load from event_schedule JSONB field (this is where data is actually stored)
        if (eventData.event_schedule && Array.isArray(eventData.event_schedule) && eventData.event_schedule.length > 0) {
          eventSchedule = eventData.event_schedule.map(item => ({
            date: item.date || '',
            startTime: item.startTime || '',
            endTime: item.endTime || ''
          }));
        } else {
          
          // FALLBACK: Try event_dates table (for events created with the new system)
          try {
            const { data: eventDatesData, error: datesError } = await window.supabaseClient
              .from('event_dates')
              .select('*')
              .eq('event_id', cleanEventId)
              .order('event_date', { ascending: true });

            if (!datesError && eventDatesData && eventDatesData.length > 0) {
              // Convert event_dates to event_schedule format for editing
              eventSchedule = eventDatesData.map(dateItem => ({
                date: dateItem.event_date || '',
                startTime: dateItem.start_time || '',
                endTime: dateItem.end_time || ''
              }));
            }
          } catch (datesError) {
            console.warn('Failed to load event_dates:', datesError);
          }
        }

        // FIXED: Set event_schedule on eventData
        eventData.event_schedule = eventSchedule;

        // FIXED: Better date/time field population
        if (eventData.event_schedule && eventData.event_schedule.length > 0) {
          const first = eventData.event_schedule[0];
          const last = eventData.event_schedule[eventData.event_schedule.length - 1];

          // Set start/end dates from schedule if not already set
          if (!eventData.start_date && first.date) {
            eventData.start_date = first.date;
          }
          if (!eventData.start_time && first.startTime) {
            eventData.start_time = first.startTime;
          }
          if (!eventData.end_date && last.date) {
            eventData.end_date = last.date;
          }
          if (!eventData.end_time && last.endTime) {
            eventData.end_time = last.endTime;
          }
        }

        // FIXED: Ensure we have valid start/end dates
        eventData.start_date = eventData.start_date || eventData.date || '';
        eventData.start_time = eventData.start_time || '';
        eventData.end_date = eventData.end_date || '';
        eventData.end_time = eventData.end_time || '';

        setEvent(eventData);
        
        // FIXED: Better form data initialization with proper event_schedule preservation
        const savedDraft = storageKey ? localStorage.getItem(storageKey) : null;
        let initialFormData = { ...eventData };
        
        // CRITICAL FIX: Ensure event_schedule is properly set in form data
        if (eventSchedule && eventSchedule.length > 0) {
          initialFormData.event_schedule = eventSchedule;
        } else if (!initialFormData.event_schedule || initialFormData.event_schedule.length === 0) {
          // Fallback: create default schedule if none exists
          initialFormData.event_schedule = [{ date: '', startTime: '', endTime: '' }];
        }
        
        if (savedDraft && hasUnsavedChanges) {
          try {
            const draftData = JSON.parse(savedDraft);
            // Preserve event_schedule from loaded data, don't override with draft
            if (initialFormData.event_schedule && initialFormData.event_schedule.length > 0) {
              setFormData({ ...initialFormData, ...draftData, event_schedule: initialFormData.event_schedule });
            } else {
              setFormData({ ...initialFormData, ...draftData });
            }
          } catch (e) {
            setFormData(initialFormData);
          }
        } else {
          setFormData(initialFormData);
        }

        if (window.budgetAPI?.getBudgetItems) {
          const budget = await window.budgetAPI.getBudgetItems(cleanEventId);
          setBudgetItems(budget || []);
        } else if (window.getBudgetItems) {
          const budget = await window.getBudgetItems(cleanEventId);
          setBudgetItems(budget || []);
        }

        if (window.TaskAPI?.getEventTasks) {
          const taskData = await window.TaskAPI.getEventTasks(cleanEventId);
          setTasks(taskData || []);
        } else if (window.getTasks) {
          const taskData = await window.getTasks(cleanEventId);
          setTasks(taskData || []);
        }

        await loadCollaborators();

      } catch (err) {
        console.error('fetchEventData error:', err);
        setError(err.message || 'Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    const loadVendorsForTab = async () => {
      // Vendor functionality disabled per user request
      setAssignedVendors([]);
    };

    const loadCollaborators = async () => {
      if (!cleanEventId) return;
      
      try {
        setLoadingCollaborators(true);
        
        if (window.collaboratorAPI) {
          const [collaboratorsData, invitationsData] = await Promise.all([
            window.collaboratorAPI.getCollaborators(cleanEventId),
            window.collaboratorAPI.getPendingInvitations(cleanEventId)
          ]);
          setCollaborators(collaboratorsData || []);
          setPendingInvitations(invitationsData || []);
        } else {
          setCollaborators([]);
          setPendingInvitations([]);
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('Failed to load collaborators: ' + (err.message || 'Unknown error'), 'error');
        }
        setCollaborators([]);
        setPendingInvitations([]);
      } finally {
        setLoadingCollaborators(false);
      }
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        
        // Save budget items if they exist and have been modified
        if (budgetItems && budgetItems.length > 0 && window.budgetAPI) {
          await window.budgetAPI.saveBudgetItems(cleanEventId, budgetItems);
        }
        
        // Time normalization helper - convert to 24-hour format for database
        const t = (x) => {
            if (!x || x.trim() === '') return null;
            return window.toPgTime ? window.toPgTime(x) : x;
        };
        
        // Normalize times before saving (allow null/empty times)
        const startT = t(formData.start_time);
        const endT = t(formData.end_time || formData.start_time);
        
        // Build schedule from event_schedule array with comprehensive validation
        let schedule = [];
        
        // Use event_schedule if it exists and has valid entries
        if (formData.event_schedule && Array.isArray(formData.event_schedule)) {
          // Validate the schedule first
          const validation = window.validateEventSchedule ? window.validateEventSchedule(formData.event_schedule) : { valid: true };
          if (!validation.valid) {
            throw new Error(`Schedule validation failed: ${validation.error}`);
          }
          
          // Sanitize the schedule data
          schedule = window.sanitizeEventSchedule ? window.sanitizeEventSchedule(formData.event_schedule) : formData.event_schedule;
        }
        
        // Fallback to start/end fields if no valid schedule and we have date information
        if (schedule.length === 0 && formData.start_date) {
          // Validate start_date format if provided
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(formData.start_date.trim())) {
            throw new Error('Start date must be in YYYY-MM-DD format');
          }
          
          schedule = [{
            date: formData.start_date,
            startTime: startT || null, // Allow null start time
            endTime: endT || null // Allow null end time
          }];
          
          // Add end date if different from start date and valid
          if (formData.end_date && formData.end_date !== formData.start_date && dateRegex.test(formData.end_date.trim())) {
            schedule.push({
              date: formData.end_date,
              startTime: startT || null,
              endTime: endT || null
            });
          }
        }
        
        // Sort schedule by date to ensure proper ordering
        schedule.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate end_date from the last date in the schedule (after sorting)
        const lastDate = schedule.length > 0 ? schedule[schedule.length - 1].date : 
          (formData.end_date || formData.start_date);
        
        const parseIntegerField = (value) => {
          if (value === '' || value === null || typeof value === 'undefined') return null;
          const parsedValue = parseInt(value, 10);
          return Number.isNaN(parsedValue) ? null : parsedValue;
        };

        // FIXED: Map form fields to database schema with correct field names
        const updateData = {
          name: formData.name || formData.title, // Map title to name field
          title: formData.title || formData.name, // Keep both for compatibility
          description: formData.description,
          about: formData.description || formData.about || null, // Keep fields in sync
          location: formData.location,
          event_type: formData.event_type,
          event_time: startT && endT ? `${startT} - ${endT}` : '', // Normalized time range
          expected_attendance: parseIntegerField(formData.expected_attendance), // FIXED: Use correct field name and convert to integer
          support_staff_needed: parseIntegerField(formData.support_staff_needed),
          budget: formData.budget_max ? `$${formData.budget_min || 0} - $${formData.budget_max}` : formData.budget,
          status: formData.status || 'draft',
          is_public: formData.is_public !== false,
          event_schedule: schedule,
          event_map: formData.event_map,
          logo: formData.logo,
          updated_at: new Date().toISOString()
        };

        // Only update date fields if they have valid values to avoid empty string errors
        if (formData.start_date && formData.start_date.trim() !== '') {
          updateData.start_date = formData.start_date;
          updateData.date = formData.start_date; // Keep legacy date field in sync
        }
        
        // Only set end_date if we have a valid lastDate
        if (lastDate && lastDate.trim() !== '') {
          updateData.end_date = lastDate;
        }

        // Safety net: remove any budget_min/budget_max fields
        const { budget_min, budget_max, ...safeUpdateData } = updateData;

        // Use EventAPI.updateEvent to trigger notifications
        const updatedEvent = await window.EventAPI.updateEvent(cleanEventId, safeUpdateData, user.id);
        
        // Save event schedule to event_dates table with simple validation
        if (schedule && Array.isArray(schedule) && schedule.length > 0) {
          try {
            // Delete existing event dates first
            const { error: deleteError } = await window.supabaseClient
              .from('event_dates')
              .delete()
              .eq('event_id', cleanEventId);

            if (deleteError) {
              console.warn('Failed to delete existing event dates:', deleteError);
            }

            // Insert new event dates with simple validation
            const validSchedules = schedule.filter(s => 
              s && 
              typeof s === 'object' && 
              s.date && 
              s.date.trim() !== '' && 
              s.startTime &&
              s.startTime.trim() !== ''
            );
            
            if (validSchedules.length > 0) {
              const eventDatesData = validSchedules.map(scheduleItem => {
                const startTime = window.toPgTime ? window.toPgTime(scheduleItem.startTime) : scheduleItem.startTime;
                const endTime = window.toPgTime ? window.toPgTime(scheduleItem.endTime || scheduleItem.startTime) : (scheduleItem.endTime || scheduleItem.startTime);
                
                return {
                  event_id: cleanEventId,
                  event_date: scheduleItem.date,
                  start_time: startTime || scheduleItem.startTime,
                  end_time: endTime || startTime || scheduleItem.startTime,
                  created_by: user.id
                };
              });

              const { error: insertError } = await window.supabaseClient
                .from('event_dates')
                .insert(eventDatesData);

              if (insertError) {
                console.error('Event dates insert error:', insertError);
                window.showToast && window.showToast('Event updated but schedule save failed: ' + insertError.message, 'warning');
              } else {
                console.log('✅ Event dates saved successfully');
              }
            }
          } catch (scheduleError) {
            console.error('Schedule save error:', scheduleError);
            window.showToast && window.showToast('Event updated but schedule save failed: ' + scheduleError.message, 'warning');
          }
        }
        
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        setHasUnsavedChanges(false);
        
        // Update local event state to reflect changes
        setEvent(prev => ({ ...prev, ...updatedEvent }));
        
        window.showToast && window.showToast('Event updated successfully', 'success');
        
        // Force refresh of the view page by adding a timestamp
        setTimeout(() => {
          window.location.hash = `#/event/view/${cleanEventId}?t=${Date.now()}`;
        }, 500);
      } catch (err) {
        window.showToast && window.showToast('Failed to update event: ' + err.message, 'error');
      } finally {
        setSaving(false);
      }
    };

    // FIXED: Enhanced handleInputChange to prevent text duplication
    const handleInputChange = (field, value) => {
      // FIXED: Clear the field value completely before setting new value to prevent duplication
      setFormData(prev => {
        const newData = { ...prev };
        newData[field] = value; // Direct assignment instead of appending
        return newData;
      });
      setHasUnsavedChanges(true);
    };

    const handleBudgetChange = (newBudgetItems) => {
      setBudgetItems(newBudgetItems);
      setHasUnsavedChanges(true);
    };

    // Vendor management functions disabled per user request

    const renderCollaboratorsTab = () =>
      React.createElement('div', { className: 'space-y-4' }, [
        React.createElement('div', {
          key: 'collaborators-header',
          className: 'flex justify-between items-center'
        }, [
          React.createElement('h3', {
            key: 'collaborators-title',
            className: 'text-lg font-medium text-gray-900'
          }, 'Event Collaborators')
        ]),
        React.createElement('div', {
          key: 'collaborators-content',
          className: 'bg-white rounded-lg p-6'
        }, loadingCollaborators
          ? React.createElement('div', { className: 'text-center py-4' }, [
            React.createElement('div', { key: 'collaborators-spinner', className: 'icon-loader text-2xl text-gray-400 mb-2' }),
            React.createElement('p', { key: 'collaborators-loading-text', className: 'text-gray-600' }, 'Loading collaborators...')
          ])
          : window.CollaboratorManagement
            ? React.createElement(window.CollaboratorManagement, {
              key: 'collaborator-management-component',
              eventId: cleanEventId,
              collaborators: collaborators,
              pendingInvitations: pendingInvitations,
              canManageCollaborators: canManageCollaborators,
              permissionsReady: permissionsReady,
              onUpdate: loadCollaborators,
              embedded: true
            })
            : React.createElement('div', { className: 'bg-gray-50 rounded-lg p-6 text-center' }, [
              React.createElement('div', { key: 'collaborators-no-icon', className: 'icon-users text-4xl text-gray-300 mb-4' }),
              React.createElement('p', { key: 'collaborators-no-text', className: 'text-gray-600' }, 'Collaborator management not available.')
            ])
        )
      ]);

    // Vendor tab rendering disabled per user request

    if (loading) {
      return React.createElement('div', { className: 'flex justify-center items-center h-64' },
        React.createElement('div', { className: 'text-lg text-gray-600' }, 'Loading event...')
      );
    }

    if (error) {
      return React.createElement('div', { className: 'max-w-4xl mx-auto p-6' },
        React.createElement('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-4' }, [
          React.createElement('h3', { key: 'error-title', className: 'text-lg font-medium text-red-800 mb-2' }, 'Error Loading Event'),
          React.createElement('p', { key: 'error-message', className: 'text-red-700' }, error),
          React.createElement('button', {
            key: 'retry-btn',
            onClick: () => window.location.reload(),
            className: 'mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
          }, 'Retry')
        ])
      );
    }

    return React.createElement('div', { className: 'max-w-6xl mx-auto p-4 sm:p-6 mobile-optimized' }, [
      React.createElement('div', { key: 'header', className: 'mb-6' }, [
        React.createElement('div', { key: 'title-row', className: 'flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4' }, [
          React.createElement('h1', { key: 'title', className: 'text-xl sm:text-2xl font-bold text-gray-900' }, 
            `Edit: ${formData.name || formData.title || 'Untitled Event'}`),
          React.createElement('div', { key: 'actions', className: 'flex flex-wrap gap-2 sm:gap-3' }, 
            [
              hasUnsavedChanges && activeTab !== 'budget' && activeTab !== 'tasks' && React.createElement('span', { key: 'unsaved', className: 'text-sm text-amber-600 self-center' }, 
                'Unsaved changes'),
              React.createElement('button', {
                key: 'view-event-btn',
                onClick: () => window.location.hash = `#/event/view/${cleanEventId}`,
                className: 'px-3 py-2 sm:px-4 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm sm:text-base'
              }, [
                React.createElement('div', { key: 'view-icon', className: 'icon-eye text-sm' }),
                'View Event'
              ]),
              React.createElement('button', {
                key: 'cancel-btn',
                onClick: () => {
                  if (hasUnsavedChanges) {
                    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                      window.location.hash = `#/event/view/${cleanEventId}`;
                    }
                  } else {
                    window.location.hash = `#/event/view/${cleanEventId}`;
                  }
                },
                className: 'px-3 py-2 sm:px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base'
              }, 'Cancel'),
              activeTab !== 'budget' && activeTab !== 'tasks' && React.createElement('button', {
                key: 'save-btn',
                onClick: handleSave,
                disabled: saving || !hasUnsavedChanges,
                className: 'px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base'
              }, saving ? 'Saving...' : 'Save Changes')
            ].filter(Boolean)
          )
        ]),
        React.createElement('div', { key: 'tabs', className: 'border-b border-gray-200' },
          React.createElement('nav', { key: 'nav', className: 'flex flex-wrap gap-2 sm:gap-4 lg:gap-8 overflow-x-auto' }, 
            [
              ['basics', 'Event Details'],
              ['budget', 'Budget'],
              ['tasks', 'Tasks'],
              ['collaborators', 'Collaborators'],
              ['event-chat', 'Event Chat'],
              ['staff', 'Staff']
            ].map(([tab, label]) => React.createElement('button', {
              key: `tab-${tab}`,
              onClick: () => setActiveTab(tab),
              className: `py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }, label))
          )
        )
      ]),
      
        React.createElement('div', { key: 'content' }, 
        [
          activeTab === 'basics' && React.createElement('div', { key: 'basics-form', className: 'space-y-4' }, [
            // Basic Event Info
            React.createElement('div', { key: 'basic-info', className: 'bg-white rounded-lg p-6 space-y-4' }, [
              React.createElement('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Event Info'),
              
              // FIXED: Event Name field with proper input handling
              React.createElement('div', { key: 'name-field' }, [
                React.createElement('label', { key: 'name-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Event Name'),
                React.createElement('input', {
                  key: 'name-input',
                  type: 'text',
                  value: formData.name || formData.title || '',
                  onChange: (e) => {
                    // FIXED: Clear field and set new value to prevent duplication
                    handleInputChange('name', e.target.value);
                  },
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  placeholder: 'Enter event name'
                })
              ]),
              
              React.createElement('div', { key: 'description-field' }, [
                React.createElement('label', { key: 'desc-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Description'),
                React.createElement('textarea', {
                  key: 'desc-input',
                  value: formData.description || '',
                  onChange: (e) => handleInputChange('description', e.target.value),
                  rows: 4,
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  placeholder: 'Describe your event'
                })
              ]),

              React.createElement('div', { key: 'location-field' }, [
                React.createElement('label', { key: 'loc-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Location'),
                React.createElement(window.LocationAutocomplete, {
                  key: 'loc-input',
                  value: formData.location || '',
                  onChange: (value) => handleInputChange('location', value),
                  onSelect: (value) => handleInputChange('location', value),
                  placeholder: 'Enter event location',
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
              ]),

              // Expected Attendees and Support Staff Needed - Side by Side
              React.createElement('div', { key: 'attendance-staff-grid', className: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                React.createElement('div', { key: 'expected-attendance' }, [
                  React.createElement('label', { key: 'expected-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Expected Attendees'),
                  React.createElement('input', {
                    key: 'expected-input',
                    type: 'number',
                    value: formData.expected_attendance || '',
                    onChange: (e) => handleInputChange('expected_attendance', e.target.value),
                    onWheel: handleNumberWheel,
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 no-spinner',
                    placeholder: 'Number of attendees'
                  })
                ]),

                React.createElement('div', { key: 'support-staff-needed' }, [
                  React.createElement('label', { key: 'support-staff-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Support Staff Needed'),
                  React.createElement('input', {
                    key: 'support-staff-input',
                    type: 'number',
                    value: formData.support_staff_needed ?? '',
                    onChange: (e) => handleInputChange('support_staff_needed', e.target.value),
                    onWheel: handleNumberWheel,
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 no-spinner',
                    placeholder: 'Number of staff needed'
                  })
                ])
              ]),

              // Event Assets - Icon and Map Uploaders Side by Side
              React.createElement('div', { key: 'assets-section', className: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Event Icon/Logo Upload
                React.createElement('div', { key: 'icon-section' }, [
                  React.createElement('label', { key: 'icon-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Event Icon/Logo'),
                  React.createElement('input', {
                    key: 'icon-input',
                    type: 'file',
                    accept: 'image/*',
                    onChange: async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // instant preview
                      handleInputChange('logo', URL.createObjectURL(file));
                      try {
                        const url = await uploadImageNew(file, 'logo');
                        handleInputChange('logo', url);
                      } catch {}
                    },
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  }),
                  React.createElement('p', {
                    key: 'icon-help-text',
                    className: 'text-xs text-gray-500 mt-1'
                  }, 'Accepted formats: JPG, PNG, GIF, SVG, WebP, BMP, TIFF, ICO (Max size: 5MB)'),
                  
                  // Icon preview
                  formData.logo && React.createElement('div', {
                    key: 'icon-preview',
                    className: 'mt-3'
                  }, [
                    React.createElement('p', {
                      key: 'icon-preview-label',
                      className: 'text-sm text-gray-700 mb-2'
                    }, 'Current Icon:'),
                    React.createElement('img', {
                      key: 'icon-preview-image',
                      src: formData.logo,
                      alt: 'Event icon preview',
                      className: 'w-24 h-24 object-contain border border-gray-200 rounded-lg'
                    })
                  ])
                ]),

                // Event Map Upload
                React.createElement('div', { key: 'map-section' }, [
                  React.createElement('label', { key: 'map-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Event Map/Floor Plan'),
                  React.createElement('input', {
                    key: 'map-input',
                    type: 'file',
                    accept: 'image/*',
                    onChange: async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // instant preview
                      const blobUrl = URL.createObjectURL(file);
                      handleInputChange('event_map', blobUrl);
                      try {
                        const url = await uploadImageNew(file, 'map');
                        handleInputChange('event_map', url);
                      } catch {}
                    },
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  }),
                  React.createElement('p', {
                    key: 'map-help-text',
                    className: 'text-xs text-gray-500 mt-1'
                  }, 'Accepted formats: JPG, PNG, GIF, SVG, WebP, BMP, TIFF, ICO (Max size: 5MB)'),
                  
                  // Map preview
                  formData.event_map && React.createElement('div', {
                    key: 'map-preview',
                    className: 'mt-3'
                  }, [
                    React.createElement('p', {
                      key: 'map-preview-label',
                      className: 'text-sm text-gray-700 mb-2'
                    }, 'Current Map:'),
                    React.createElement('img', {
                      key: 'map-preview-image',
                      src: formData.event_map,
                      alt: 'Event map preview',
                      className: 'max-w-full h-32 object-contain border border-gray-200 rounded-lg'
                    })
                  ])
                ])
              ]),

              // FIXED: Event Schedule Section with proper date/time loading
              React.createElement('div', { key: 'event-schedule', className: 'space-y-4' }, [
                React.createElement('h3', { 
                  key: 'schedule-title',
                  className: 'text-lg font-semibold text-gray-900 border-b pb-2'
                }, 'Event Schedule'),

                React.createElement('div', { key: 'schedule-content', className: 'space-y-4' }, [
                  React.createElement('p', { 
                    key: 'schedule-help',
                    className: 'text-sm text-gray-600'
                  }, 'Add dates and times for your event. You can add multiple dates for multi-day events.'),

                  // FIXED: Schedule Items with proper value handling
                  ...(formData.event_schedule || []).map((item, index) => 
                    React.createElement('div', { 
                      key: `schedule-${index}`,
                      className: 'border border-gray-200 rounded-lg p-4 bg-gray-50'
                    }, [
                      React.createElement('div', { 
                        key: `schedule-header-${index}`,
                        className: 'flex items-center justify-between mb-3'
                      }, [
                        React.createElement('h4', {
                          key: `schedule-item-title-${index}`,
                          className: 'text-sm font-medium text-gray-700'
                        }, `Date ${index + 1}`),
                        (formData.event_schedule || []).length > 1 && React.createElement('button', {
                          key: `remove-schedule-${index}`,
                          type: 'button',
                          onClick: () => {
                            const newSchedule = (formData.event_schedule || []).filter((_, i) => i !== index);
                            handleInputChange('event_schedule', newSchedule);
                          },
                          className: 'text-red-600 hover:text-red-800 text-sm'
                        }, 'Remove')
                      ]),

                      React.createElement('div', { 
                        key: `schedule-fields-${index}`,
                        className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
                      }, [
                        // FIXED: Date field with proper value handling
                        React.createElement('div', { key: `date-${index}` }, [
                          React.createElement('label', { 
                            key: `date-label-${index}`,
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                          }, 'Date'),
                          React.createElement('input', {
                            key: `date-input-${index}`,
                            type: 'date',
                            value: item.date || '',
                            onChange: (e) => {
                              const newSchedule = [...(formData.event_schedule || [])];
                              newSchedule[index] = { ...newSchedule[index], date: e.target.value };
                              handleInputChange('event_schedule', newSchedule);
                            },
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                          })
                        ]),
                        // FIXED: Start Time field with proper value handling
                        React.createElement('div', { key: `start-time-${index}` }, [
                          React.createElement('label', { 
                            key: `start-label-${index}`,
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                          }, 'Start Time'),
                          React.createElement('input', {
                            key: `start-input-${index}`,
                            type: 'time',
                            value: item.startTime || '',
                            onChange: (e) => {
                              const newSchedule = [...(formData.event_schedule || [])];
                              newSchedule[index] = { ...newSchedule[index], startTime: e.target.value };
                              handleInputChange('event_schedule', newSchedule);
                            },
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                          })
                        ]),
                        // FIXED: End Time field with proper value handling
                        React.createElement('div', { key: `end-time-${index}` }, [
                          React.createElement('label', { 
                            key: `end-label-${index}`,
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                          }, 'End Time'),
                          React.createElement('input', {
                            key: `end-input-${index}`,
                            type: 'time',
                            value: item.endTime || '',
                            onChange: (e) => {
                              const newSchedule = [...(formData.event_schedule || [])];
                              newSchedule[index] = { ...newSchedule[index], endTime: e.target.value };
                              handleInputChange('event_schedule', newSchedule);
                            },
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
                    onClick: () => {
                      const newSchedule = [...(formData.event_schedule || []), { date: '', startTime: '', endTime: '' }];
                      handleInputChange('event_schedule', newSchedule);
                    },
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


              // Event Type Selector (moved to bottom)
              React.createElement('div', { key: 'event-type-field' }, [
                React.createElement('label', { key: 'type-label', className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Event Type'),
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
              ]),

            ]),
            

          ]),
          activeTab === 'budget' && React.createElement(window.BudgetSummary, {
            key: 'budget-summary',
            eventId: cleanEventId,
            budgetItems,
            onBudgetChange: handleBudgetChange,
            onEditBudget: () => {
              // Show edit budget modal
              if (window.showModal && window.EditBudgetForm) {
                window.showModal(React.createElement(window.EditBudgetForm, {
                  eventId: cleanEventId,
                  budgetItems,
                  onSave: async (updatedItems) => {
                    try {
                      if (window.budgetAPI) {
                        await window.budgetAPI.saveBudgetItems(cleanEventId, updatedItems);
                        setBudgetItems(updatedItems);
                        setHasUnsavedChanges(true);
                        window.hideModal();
                        if (window.showToast) {
                          window.showToast('Budget saved successfully', 'success');
                        }
                        // Refresh budget data to ensure consistency
                        const refreshedBudget = await window.budgetAPI.getBudgetItems(cleanEventId);
                        setBudgetItems(refreshedBudget || []);
                      }
                    } catch (error) {
                      if (window.showToast) {
                        window.showToast('Failed to save budget: ' + error.message, 'error');
                      }
                    }
                  },
                  onCancel: () => {
                    window.hideModal();
                  }
                }));
              }
            }
          }),
          activeTab === 'tasks' && React.createElement(window.TaskManager, {
            key: 'task-manager',
            eventId: cleanEventId,
            tasks,
            onTasksUpdate: setTasks
          }),
          activeTab === 'collaborators' && React.createElement('div', { key: 'collaborators-tab' }, renderCollaboratorsTab()),
          activeTab === 'event-chat' && React.createElement('div', { 
            key: 'event-chat-tab',
            className: 'p-6'
          }, [
            React.createElement('div', { 
              key: 'chat-header',
              className: 'mb-6'
            }, [
              React.createElement('h3', { 
                key: 'chat-title', 
                className: 'text-xl font-semibold flex items-center gap-2 mb-2'
              }, [
                React.createElement('div', { key: 'chat-icon', className: 'icon-message-circle text-xl' }),
                'Event Chat'
              ]),
              React.createElement('p', { 
                key: 'chat-description',
                className: 'text-gray-600'
              }, 'Communicate with your event team in real-time')
            ]),
            React.createElement(window.GroupChatPanelV2, {
              key: 'event-chat-panel',
              eventId: cleanEventId,
              currentUser: user
            })
          ]),
          activeTab === 'staff' && React.createElement('div', { 
            key: 'staff-tab',
            className: 'p-6'
          }, [
            React.createElement('div', { 
              key: 'staff-header',
              className: 'mb-6'
            }, [
              React.createElement('h3', { 
                key: 'staff-title', 
                className: 'text-xl font-semibold flex items-center gap-2 mb-2'
              }, [
                React.createElement('div', { key: 'staff-icon', className: 'icon-users text-xl' }),
                'Staff Management'
              ]),
              React.createElement('p', { 
                key: 'staff-description',
                className: 'text-gray-600'
              }, 'Manage event staff assignments, roles, and contact information')
            ]),
            React.createElement(window.StaffManager, {
              key: 'staff-manager',
              eventId: cleanEventId,
              userRole: userRole
            })
          ])
        ].filter(Boolean)
      )
    ]);

  } catch (error) {
    return React.createElement('div', { className: 'p-6 text-center' },
      React.createElement('div', { className: 'text-red-600' }, 'Error loading edit form')
    );
  }
}

window.EditEventForm = EditEventForm;
