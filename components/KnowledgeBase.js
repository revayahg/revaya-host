function KnowledgeBase() {
  try {
    const [events, setEvents] = React.useState([]);
    const [activeEventId, setActiveEventId] = React.useState(null);
    const [documents, setDocuments] = React.useState([]);
    const [uploading, setUploading] = React.useState(false);
    const [loadingEvents, setLoadingEvents] = React.useState(true);

    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const session = await window.getSessionWithRetry?.(3, 150);
        
        if (!session?.user?.id) {
          setEvents([]);
          setLoadingEvents(false);
          return;
        }

        // Get events user created
        const { data: ownedEvents, error: ownedError } = await window.supabaseClient
          .from('events')
          .select('*')
          .eq('user_id', session.user.id);

        if (ownedError) {
        }

        // Get events user is invited to as vendor
        const { data: invitedEvents, error: invitedError } = await window.supabaseClient
          .from('event_invitations')
          .select(`
            event_id,
            events (*)
          `)
          .eq('receiving_user_id', session.user.id)
          .eq('response', 'accepted');

        if (invitedError) {
        }

        // Combine and deduplicate events
        const allEvents = [];
        const eventIds = new Set();

        // Add owned events
        if (ownedEvents) {
          ownedEvents.forEach(event => {
            if (!eventIds.has(event.id)) {
              allEvents.push({ ...event, access_type: 'owner' });
              eventIds.add(event.id);
            }
          });
        }

        // Add invited events
        if (invitedEvents) {
          invitedEvents.forEach(invitation => {
            if (invitation.events && !eventIds.has(invitation.events.id)) {
              allEvents.push({ ...invitation.events, access_type: 'vendor' });
              eventIds.add(invitation.events.id);
            }
          });
        }

        // Sort by created_at
        allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setEvents(allEvents);
        
        if (allEvents.length > 0 && !activeEventId) {
          setActiveEventId(allEvents[0].id);
        }
      } catch (error) {
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

    const loadEventDocuments = async (eventId) => {
      if (!eventId) return;
      
      try {
        const { data, error } = await window.supabaseClient
          .from('knowledge_documents')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (error) {
          window.showToast?.('Failed to load documents', 'error');
          setDocuments([]);
        } else {
          setDocuments(data || []);
        }
      } catch (error) {
        setDocuments([]);
      }
    };

    const handleFileUpload = async (file, eventId) => {
      try {
        // Validate file type on frontend
        const coreTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const isImage = file.type.startsWith('image/');
        
        if (!coreTypes.includes(file.type) && !isImage) {
          window.showToast?.('Only PDF, DOCX, or image files are allowed.', 'error');
          return;
        }

        setUploading(true);
        const result = await window.knowledgeBaseAPI.uploadDocument(file, eventId);
        window.showToast?.('Document uploaded successfully', 'success');
        await loadEventDocuments(eventId);
        return result;
      } catch (error) {
        window.showToast?.(`Upload failed: ${error.message}`, 'error');
        throw error;
      } finally {
        setUploading(false);
      }
    };

    React.useEffect(() => {
      loadEvents();
    }, []);

    React.useEffect(() => {
      if (activeEventId) {
        loadEventDocuments(activeEventId);
      }
    }, [activeEventId]);

    return React.createElement(window.KnowledgeBaseContent, {
      events,
      activeEventId,
      setActiveEventId,
      documents,
      uploading,
      setUploading,
      loadingEvents,
      loadEventDocuments,
      handleFileUpload
    });
  } catch (error) {
    return React.createElement('div', {
      className: 'container mx-auto px-4 py-8 text-center'
    },
      React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Knowledge Base'),
      React.createElement('p', { className: 'text-red-600' }, 'Error loading knowledge base. Please try again.')
    );
  }
}

window.KnowledgeBase = KnowledgeBase;