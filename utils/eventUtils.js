function getVendorSuggestions(eventType, eventDetails = {}) {
  try {
    // Static mappings for immediate suggestions
    const eventSuggestions = {
      'Street Festival': [
        'Food Trucks',
        'Beer Vendors',
        'Non-Alcoholic Beverages',
        'DJs',
        'Live Bands / Musicians',
        'Face Painters / Body Art',
        'Interactive Art / Installations',
        'Portable Staging',
        'Tents & Canopies',
        'Portable Toilets / Wash Stations',
        'Security Personnel',
        'EMT / Medical Services',
        'Cleanup / Waste Management'
      ],
      'Music Festival': [
        'DJs',
        'Live Bands / Musicians',
        'Stage Hosts / MCs',
        'Food Trucks',
        'Beer Vendors',
        'Mobile Bars',
        'Portable Staging',
        'Lighting & Sound Equipment',
        'Portable Toilets / Wash Stations',
        'Security Personnel',
        'EMT / Medical Services',
        'Parking / Traffic Control'
      ],
      'Food Fair': [
        'Food Trucks',
        'Mobile Bars',
        'Dessert Vendors',
        'Tables & Chairs',
        'Tents & Canopies',
        'Power / Generators',
        'DJs',
        'Live Bands / Musicians',
        'Security Personnel',
        'Cleanup / Waste Management'
      ],
      'Corporate Event': [
        'Catering Services',
        'Coffee / Tea Vendors',
        'Non-Alcoholic Beverages',
        'Tables & Chairs',
        'Lighting & Sound Equipment',
        'Power / Generators',
        'Event Coordinators',
        'Check-In Staff / Guest Services',
        'Photography / Videography',
        'Social Media Marketing'
      ],
      'Pride Festival': [
        'DJs',
        'Live Bands / Musicians',
        'Drag Performers',
        'Stage Hosts / MCs',
        'Food Trucks',
        'Mobile Bars',
        'Beer Vendors',
        'Interactive Art / Installations',
        'Photo Booths',
        'Security Personnel',
        'EMT / Medical Services',
        'Portable Toilets / Wash Stations',
        'Cleanup / Waste Management'
      ],
      'Cultural Festival': [
        'Food Trucks',
        'Cultural Performers',
        'Live Bands / Musicians',
        'Interactive Art / Installations',
        'Tables & Chairs',
        'Tents & Canopies',
        'Security Personnel',
        'EMT / Medical Services',
        'Photography / Videography'
      ]
    };

    // If the event type isn't in our predefined list, return default suggestions
    const suggestions = eventSuggestions[eventType] || [
      'Event Coordinators',
      'Security Personnel',
      'Food Trucks',
      'DJs',
      'Photography / Videography',
      'Tables & Chairs',
      'Cleanup / Waste Management'
    ];

    return suggestions;
  } catch (error) {
    return [];
  }
}

function getTaskSuggestions(category, eventType) {
  try {
    const defaultTasks = {
      'Food & Beverage': [
        'Create detailed menu requirements',
        'Schedule food safety inspections',
        'Coordinate vendor setup times'
      ],
      'Entertainment': [
        'Create performance schedule',
        'Prepare stage equipment list',
        'Schedule sound checks'
      ],
      'Security': [
        'Create security staffing plan',
        'Develop emergency response plan',
        'Schedule security briefing'
      ],
      'Staging & Equipment': [
        'Create layout plan',
        'Schedule equipment delivery',
        'Arrange power requirements'
      ],
      'Vendors': [
        'Create vendor requirements document',
        'Schedule vendor orientation',
        'Collect insurance certificates'
      ]
    };

    const eventSpecificTasks = {
      'Street Festival': {
        'Food & Beverage': [
          'Coordinate food truck parking layout',
          'Set up handwashing stations'
        ],
        'Security': [
          'Create street closure schedule',
          'Coordinate with local police'
        ]
      },
      'Music Festival': {
        'Entertainment': [
          'Create stage plot diagrams',
          'Schedule performer check-ins'
        ],
        'Staging & Equipment': [
          'Plan backstage areas',
          'Create load-in schedule'
        ]
      },
      'Corporate Event': {
        'Food & Beverage': [
          'Collect dietary restrictions',
          'Plan coffee break schedule'
        ],
        'Vendors': [
          'Create name badges',
          'Set up registration desk'
        ]
      }
    };

    // Get category-specific tasks
    let tasks = defaultTasks[category] || [];

    // Add event-specific tasks if they exist
    if (eventSpecificTasks[eventType]?.[category]) {
      tasks = [...tasks, ...eventSpecificTasks[eventType][category]];
    }

    // If no specific tasks found, return generic tasks
    if (tasks.length === 0) {
      tasks = [
        `Create ${category} requirements document`,
        `Schedule ${category} coordination meeting`,
        `Review ${category} setup timeline`
      ];
    }

    return tasks;
  } catch (error) {
    return [
      `Plan ${category} requirements`,
      `Schedule ${category} coordination`
    ];
  }
}

// Create a task with proper structure including vendor assignment support
function createTask(title, category, type = 'custom', description = '', assigneeVendorId = null) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    title,
    description,
    category,
    type,
    status: 'pending',
    createdAt: new Date().toISOString(),
    dueDate: null,
    assignedTo: null,
    priority: 'medium',
    assignee_vendor_id: assigneeVendorId,
    visible_to_vendor: true
  };
}

// Converts "11:00 AM" or "11:00" into "HH:MM:SS"
function toPgTime(t) {
  if (!t) return null;
  
  // Convert to string and trim
  const timeStr = String(t).trim();
  
  // Return null for empty strings
  if (timeStr === '' || timeStr === 'null' || timeStr === 'undefined') {
    return null;
  }

  // Already 24h format like "18:00" or "18:00:00"?
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const [h, m, s] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const minute = parseInt(m, 10);
    
    // Validate hour and minute ranges
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    
    return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${(s||'00').padStart(2,'0')}`;
  }

  // 12h format like "11:00 AM" or "11:00 PM"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let [_, hh, mm, ap] = match;
    let hour = parseInt(hh, 10);
    const minute = parseInt(mm, 10);
    
    // Validate minute range
    if (minute < 0 || minute > 59) {
      return null;
    }
    
    // Validate hour range for 12h format
    if (hour < 1 || hour > 12) {
      return null;
    }
    
    // Convert to 24h format
    if (/pm/i.test(ap) && hour !== 12) {
      hour += 12;
    } else if (/am/i.test(ap) && hour === 12) {
      hour = 0;
    }
    
    return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;
  }

  // If we can't parse it, return null instead of the original value
  console.warn('toPgTime: Unable to parse time format:', t);
  return null;
}

function scheduleFromStartEnd(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime) return [];
  const st = toPgTime(startTime);
  const et = toPgTime(endTime);

  // Same-day
  if (!endDate || endDate === startDate) {
    return [{ date: startDate, startTime: st, endTime: et || st }];
  }

  // Multi-day: split into two days
  return [
    { date: startDate, startTime: st, endTime: '23:59:00' },
    { date: endDate,   startTime: '00:00:00', endTime: et || '23:59:00' },
  ];
}

// Comprehensive validation for event schedule data
function validateEventSchedule(schedule) {
  if (!Array.isArray(schedule)) {
    return { valid: false, error: 'Schedule must be an array' };
  }
  
  // Allow empty schedules - events don't need to have dates/times
  if (schedule.length === 0) {
    return { valid: true };
  }
  
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    
    // Check if item exists and is an object
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Schedule item ${i} must be an object` };
    }
    
    // Skip validation for empty items (items with no date)
    if (!item.date || typeof item.date !== 'string' || item.date.trim() === '') {
      continue; // Skip this item - it's empty and that's okay
    }
    
    // Validate date format (YYYY-MM-DD) only if date is provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(item.date.trim())) {
      return { valid: false, error: `Schedule item ${i} date must be in YYYY-MM-DD format` };
    }
    
    // Validate start time (optional)
    if (item.startTime && item.startTime.trim() !== '') {
      // Convert and validate start time only if provided
      const startTime = toPgTime(item.startTime);
      if (!startTime) {
        return { valid: false, error: `Schedule item ${i} has invalid start time format: ${item.startTime}` };
      }
    }
    
    // Validate end time (optional, but if provided must be valid)
    if (item.endTime) {
      const endTime = toPgTime(item.endTime);
      if (!endTime) {
        return { valid: false, error: `Schedule item ${i} has invalid end time format: ${item.endTime}` };
      }
    }
  }
  
  return { valid: true };
}

// Sanitize event schedule data before saving
function sanitizeEventSchedule(schedule) {
  if (!Array.isArray(schedule)) {
    return [];
  }
  
  return schedule
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const sanitized = {
        date: item.date ? String(item.date).trim() : null,
        startTime: item.startTime ? String(item.startTime).trim() : null,
        endTime: item.endTime ? String(item.endTime).trim() : null
      };
      
      // Convert times to proper format (only if provided)
      if (sanitized.startTime && sanitized.startTime !== '') {
        const convertedStartTime = toPgTime(sanitized.startTime);
        sanitized.startTime = convertedStartTime || null;
      } else {
        sanitized.startTime = null;
      }
      
      if (sanitized.endTime && sanitized.endTime !== '') {
        const convertedEndTime = toPgTime(sanitized.endTime);
        sanitized.endTime = convertedEndTime || null;
      } else {
        sanitized.endTime = null;
      }
      
      return sanitized;
    })
    .filter(item => item.date && item.date.trim() !== ''); // Only keep entries with valid dates (times are optional)
}

window.getVendorSuggestions = getVendorSuggestions;
window.getTaskSuggestions = getTaskSuggestions;
window.createTask = createTask;
window.toPgTime = toPgTime;
window.scheduleFromStartEnd = scheduleFromStartEnd;
window.validateEventSchedule = validateEventSchedule;
window.sanitizeEventSchedule = sanitizeEventSchedule;

// Helper functions for time normalization and date formatting
window.normalizeTime12h = function normalizeTime12h(v) {
    if (v == null || v === '') return 'Not set';
    
    // unwrap common shapes: {target:{value}}, {value}
    if (typeof v === 'object') {
        if (v?.target?.value) v = v.target.value;
        else if (v?.value) v = v.value;
        else v = String(v);
    }
    
    const s = String(v).trim();
    
    // Return 'Not set' for empty strings or null values
    if (s === '' || s === 'null' || s === 'undefined') {
        return 'Not set';
    }
    
    // Already 12h like "6:00 PM" -> normalize casing/spacing
    const ampmMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])$/);
    if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const m = ampmMatch[2];
        const ap = ampmMatch[3].toUpperCase();
        if (h === 0) h = 12;
        if (h > 12) h = h - 12;
        return `${h}:${m} ${ap}`;
    }
    
    // 24h like "18:05" or "18:05:00" -> convert to 12h
    const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m24) {
        let h = parseInt(m24[1], 10);
        const m = m24[2];
        
        // Validate hour range
        if (h < 0 || h > 23) {
            return 'Invalid time';
        }
        
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12; 
        if (h === 0) h = 12;
        return `${h}:${m} ${ap}`;
    }
    
    // If we can't parse it, return the original value or 'Invalid time'
    return s || 'Invalid time';
};

window.formatLongDate = function formatLongDate(d) {
    if (!d || d === '' || d === 'null' || d === 'undefined') return 'Date not set';
    
    try {
        // Handle different date formats
        let dateStr = String(d).trim();
        
        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
            return date.toLocaleDateString(undefined, {
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'
            });
        }
        
        // Try parsing as a general date
        const date = new Date(d);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        return date.toLocaleDateString(undefined, {
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric'
        });
    } catch (error) { 
        console.warn('formatLongDate error:', error, 'for input:', d);
        return 'Invalid date';
    }
};
