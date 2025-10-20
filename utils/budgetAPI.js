;(function () {
  // Production-compatible budgetAPI - uses event_budget_items table
  // This matches exactly what both development and production databases have
  // Updated 2025-01-04 - Fixed to use correct table structure

  const n = (v) => (v === '' || v == null || Number.isNaN(+v) ? 0 : +v);

  // Get budget items from event_budget_items table (both dev and prod have this)
  async function getBudgetItems(eventId) {
    if (!eventId) throw new Error('eventId required');

    try {
      const { data, error } = await window.supabaseClient
        .from('event_budget_items')
        .select('id,event_id,title,category,allocated,spent,description,created_by,created_at,updated_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching budget items:', error.message);
        throw error;
      }
      
      // Return the budget items with normalized field names
      const budgetItems = (data || []).map(it => ({ 
        ...it, 
        allocated: n(it.allocated), 
        spent: n(it.spent) 
      }));
      
      console.log('Retrieved budget items:', budgetItems.length, 'items');
      return budgetItems;
    } catch (error) {
      console.error('Budget API error:', error);
      return [];
    }
  }

  // Save budget items to event_budget_items table (both dev and prod have this)
  async function saveBudgetItems(eventId, items) {
    if (!eventId) throw new Error('eventId required');

    const list = Array.isArray(items) ? items : [];
    console.log('saveBudgetItems called with:', { eventId, itemsCount: list.length, items }); // Debug log
    
    try {
      const { data: { session } = {} } = await window.supabaseClient.auth.getSession();
      const userId = session?.user?.id || null;
      console.log('Session user ID:', userId); // Debug log

      // Prepare data for the table
      const cleanItems = list.map(it => {
        const cleanItem = {
          event_id: eventId,
          title: (it.title || it.item || it.name || '').trim() || 'New Item',
          category: it.category || null,
          allocated: n(it.allocated ?? it.amount ?? it.budget ?? it.value),
          spent: n(it.spent ?? it.actual ?? 0),
          description: it.description || null,
          created_by: userId,
          updated_at: new Date().toISOString(),
        };
        console.log('Cleaned item:', cleanItem); // Debug log
        return cleanItem;
      });

      console.log('Cleaned items for database:', cleanItems); // Debug log

      // Delete existing items and insert new ones
      console.log('Deleting existing budget items for event:', eventId); // Debug log
      const del = await window.supabaseClient
        .from('event_budget_items')
        .delete()
        .eq('event_id', eventId);
      
      if (del.error) {
        console.error('Error deleting existing budget items:', del.error);
        throw del.error;
      }

      console.log('Inserting new budget items:', cleanItems.length); // Debug log
      const ins = await window.supabaseClient
        .from('event_budget_items')
        .insert(cleanItems)
        .select('id,event_id,title,allocated,spent');
      
      if (ins.error) {
        console.error('Error inserting new budget items:', ins.error);
        throw ins.error;
      }
      
      console.log('Successfully saved budget items:', ins.data?.length || 0, 'items'); // Debug log
      const result = (ins.data || []).map(it => ({ 
        ...it, 
        allocated: n(it.allocated), 
        spent: n(it.spent) 
      }));
      console.log('Returning processed result:', result); // Debug log
      return result;
    } catch (error) {
      console.error('Budget save error:', error);
      throw error;
    }
  }

  // Make API available globally
  window.budgetAPI = { getBudgetItems, saveBudgetItems };
})();