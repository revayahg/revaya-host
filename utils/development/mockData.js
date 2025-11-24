// Mock data for the event demo
const mockVendors = [
  {
    name: 'Cinema Paradiso',
    type: 'Venue Partner',
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'
  },
  {
    name: 'Block 40 Food Hall',
    type: 'Food & Beverage',
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
  },
  {
    name: 'Spice Club',
    type: 'Food Vendor',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0'
  },
  {
    name: 'The Greek Joint',
    type: 'Food Vendor',
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83'
  },
  {
    name: 'Sunset Club',
    type: 'Entertainment',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745'
  },
  {
    name: 'Street Eats',
    type: 'Food Truck',
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb'
  }
];

const mockTasks = [
  {
    title: 'Finalize vendor contracts',
    status: 'in-progress',
    dueDate: '2024-01-15',
    assignedTo: 'Sarah Johnson',
    urgent: true
  },
  {
    title: 'Complete permit applications',
    status: 'completed',
    dueDate: '2024-01-10',
    assignedTo: 'Mike Chen',
    urgent: false
  },
  {
    title: 'Schedule security briefing',
    status: 'not_started',
    dueDate: '2024-01-20',
    assignedTo: 'David Wilson',
    urgent: true
  },
  {
    title: 'Review stage layouts',
    status: 'in-progress',
    dueDate: '2024-01-18',
    assignedTo: 'Lisa Anderson',
    urgent: false
  },
  {
    title: 'Confirm food truck locations',
    status: 'completed',
    dueDate: '2024-01-12',
    assignedTo: 'Sarah Johnson',
    urgent: false
  }
];

// Make mock data available globally
window.mockVendors = mockVendors;
window.mockTasks = mockTasks;
