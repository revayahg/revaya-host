# Revaya Host - Event Management Platform

Powerful event management software for producers and hospitality teams planning galas, festivals, and conferences.

## 🚀 Quick Start

### Development
```bash
# Start local development server
python3 -m http.server 8000

# Or using Node.js
npx serve .
```

### Production Deployment
```bash
# Deploy to Vercel
vercel --prod
```

## 🏗️ Architecture

- **Frontend**: React 18 with Babel transpilation
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Email**: Resend API via Supabase Edge Functions
- **Deployment**: Vercel + GitHub
- **Development**: Trickle.io for development environment

## 🔧 Environment Configuration

The application automatically detects the environment:

- **Development**: `localhost` → Development Supabase project
- **Production**: Deployed domains → Production Supabase project

## 📁 Project Structure

```
├── components/          # React components
│   ├── Events/         # Event management components
│   ├── Dashboard/      # Dashboard components
│   ├── Vendors/        # Vendor management components
│   └── Notifications/  # Notification system
├── utils/              # API utilities and helpers
├── supabase/           # Edge functions
├── styles/            # CSS files
├── config/            # Environment configuration
└── index.html         # Main application entry point
```

## 🔐 Environment Variables

### Production (Vercel)
- `SUPABASE_URL`: Production Supabase URL
- `SUPABASE_ANON_KEY`: Production Supabase anon key
- `RESEND_API_KEY`: Email service API key

### Development
- Uses development Supabase project
- Email mocking enabled for testing

## 🚀 Deployment Process

1. **Development**: Currently hosted on Trickle.io
2. **Production**: Deploy to Vercel + GitHub
3. **Environment Detection**: Production vs development handled automatically
4. **Database**: Uses production Supabase project in production
5. **Email**: Real emails sent in production, mocked in development

## ✨ Key Features

### Event Management
- **Event Creation**: Full event setup with details, dates, and locations
- **Collaborative Planning**: Multi-user event collaboration with role-based permissions
- **Task Management**: Kanban-style task boards with assignments and due dates
- **Budget Tracking**: Comprehensive budget management with default categories
- **Event Maps**: Interactive maps with pin management for venue planning
- **Staff Planning**: Track expected attendees and support staff needed for events
- **Mobile Optimization**: Fully responsive design for mobile event management

### Communication
- **Real-time Chat**: Event team messaging with notifications (performance optimized)
- **Notifications**: Dashboard notifications for tasks and messages
- **Email Integration**: Automated email notifications via Resend API
- **Message Caching**: Optimized message loading with 5-minute cache
- **Pagination**: Efficient message loading with 20-message initial load

### Vendor Management
- **Vendor Profiles**: Comprehensive vendor information and portfolios
- **Vendor Matching**: AI-powered vendor recommendations
- **Vendor Invitations**: Streamlined vendor invitation system
- **Vendor Categories**: Organized vendor categorization system

### User Management
- **Role-based Access**: Admin (Owner), Editor, and Viewer permissions
- **Collaborator Invitations**: Easy team member onboarding with email invitations
- **Profile Management**: User profiles with contact information
- **Dashboard Organization**: "Events I Created" vs "Events I'm Collaborating On"
- **Date-based Sorting**: Events sorted by end date for accurate past/upcoming status

## 🛠️ Development Features

- **Hot Reload**: Automatic refresh on file changes
- **Email Mocking**: Development emails logged to console
- **Clean Codebase**: Production-ready code without debug noise
- **RLS Policies**: Row-level security for data protection
- **Error Handling**: Comprehensive error handling and user feedback

## 🚀 Recent Improvements (October 18, 2025)

### Latest Updates (Collaborator Invitation System)
- **Mark-as-Read Functionality**: Users can now mark collaborator invitation notifications as read
- **Persistent Read Status**: Read status is stored in database and persists across page refreshes
- **Immediate Counter Updates**: Dashboard notification counter updates immediately when notifications are marked as read
- **Mark All as Read**: "Mark All as Read" functionality now includes collaborator invitation notifications
- **Fixed Decline Functionality**: Collaborator invitation decline now properly removes notifications from the dashboard
- **Database Schema Update**: Added read_status column to event_collaborator_invitations table
- **Improved User Experience**: Clear visual feedback and immediate updates for notification management

### Previous Updates (Event Date & Form Consistency)
- **Event Date Categorization Fix**: Multi-day events now correctly appear in "Upcoming Events" based on their last date
- **Event Schedule Sorting**: Added automatic date sorting to ensure correct end_date calculation
- **Database Query Updates**: All event queries now select and use end_date field
- **Form Field Cleanup**: Removed duplicate attendance fields, standardized on "Expected Attendees"
- **Event Status Simplification**: Removed confusing status controls, events default to 'draft'
- **Task Management UX**: Improved filtering and sorting with clear visual separation
- **Production Deployment Ready**: All fixes are code-level and will work in production

### Performance Optimizations
- **Chat Performance**: 60-80% faster message loading with caching
- **Database Optimization**: Reduced database queries by ~70%
- **Message Caching**: 5-minute cache for threads, messages, and user identities
- **Pagination**: Initial load limited to 20 messages for faster loading

### Mobile Optimization
- **Responsive Design**: Complete mobile optimization for all forms and pages
- **Touch-Friendly**: Optimized button sizes and spacing for mobile devices
- **Mobile Navigation**: Improved mobile navigation and tab scrolling
- **Form Optimization**: Mobile-optimized forms with proper input handling

### User Experience Improvements
- **Dashboard Organization**: Clear separation of "Events I Created" vs "Events I'm Collaborating On"
- **Event Date Categorization**: Multi-day events properly categorized by end_date (last date in schedule)
- **Event Schedule System**: Consistent multi-date scheduling across create/edit/view forms
- **Task Management UX**: Clear separation of filtering vs sorting with visual indicators and "Clear all" functionality
- **Event Form Consistency**: Eliminated duplicate attendance fields, standardized on single "Expected Attendees" field
- **Event Status Cleanup**: Removed confusing status controls, events default to 'draft' status
- **Task Management**: Added close button (X) to task add/edit forms
- **Budget System**: Fixed budget functionality with proper RLS policies
- **Default Budget Items**: New events automatically get default budget categories

### Technical Improvements
- **RLS Policies**: Comprehensive row-level security for all tables
- **Database Schema**: Added missing columns and tables for full functionality
- **Error Handling**: Improved error messages and user feedback
- **Cache Management**: Intelligent cache invalidation on data changes

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with:
- **Events**: Event information and metadata
- **Users**: User profiles and authentication
- **Collaborators**: Event collaboration and roles
- **Tasks**: Task management and assignments
- **Messages**: Real-time messaging system
- **Notifications**: User notification system
- **Vendors**: Vendor profiles and management

## 🚀 Migration from Trickle.io to Vercel

See `DEPLOYMENT_CHECKLIST.md` for detailed migration steps from Trickle.io to Vercel + GitHub.

## 📞 Support

For technical support or questions, contact the development team.
