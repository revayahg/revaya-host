# AI Document-to-Tasks Feature

## Overview

The AI Document-to-Tasks feature allows users to upload documents (PDF, Word, Excel, images) and automatically generate task suggestions using AI analysis. This feature integrates seamlessly with the existing Kanban task management system.

## Features

- **Document Upload**: Drag-and-drop interface for uploading documents
- **AI Analysis**: Automatic text extraction and task suggestion generation
- **Task Review**: Editable modal for reviewing and customizing AI suggestions
- **Bulk Creation**: Create multiple tasks at once from AI suggestions
- **File Type Support**: PDF, Word, Excel, and image files
- **Document Limits**: Maximum 5 documents per event to control costs
- **Security**: RLS policies ensure users can only access their own documents

## Technical Implementation

### Database Schema

#### `event_documents` Table
- `id`: UUID primary key
- `event_id`: Foreign key to events table
- `file_name`: Original filename
- `file_path`: Storage path in Supabase
- `file_size`: File size in bytes
- `file_type`: MIME type
- `uploaded_by`: User who uploaded the document
- `uploaded_at`: Upload timestamp
- `processing_status`: 'pending', 'processing', 'completed', 'error'
- `ai_suggestions`: JSONB array of AI-generated tasks
- `tasks_created`: Number of tasks created from this document

#### `events` Table Addition
- `documents_processed_count`: Integer tracking document count (max 5)

### Storage

- **Bucket**: `event-documents` (private)
- **File Size Limit**: 10MB
- **Supported Types**: PDF, Word, Excel, images
- **RLS Policies**: Users can only access documents from events they collaborate on

### Edge Function

**File**: `supabase/functions/analyze-document-for-tasks/index.ts`

**Dependencies**:
- OpenAI API (GPT-4o-mini)
- pdf-parse for PDF text extraction
- Supabase client for database operations

**Process**:
1. Validate user permissions
2. Download file from storage
3. Extract text based on file type
4. Generate AI suggestions using OpenAI
5. Update database with results

### Frontend Components

#### `AIDocumentUploader`
- Drag-and-drop file upload
- File validation (type, size)
- Upload progress indicator
- Document list with status
- Error handling

#### `AITaskSuggestionsModal`
- Display AI suggestions in editable cards
- Inline editing for all task fields
- Bulk selection (select all/deselect all)
- Task creation with loading states

#### `TaskManager` Integration
- AI upload button in header
- Modal integration
- Bulk task creation
- Task list refresh

### API Layer

**File**: `utils/aiDocumentAPI.js`

**Functions**:
- `uploadDocument()`: Upload file and create database record
- `processDocument()`: Trigger AI analysis
- `getDocuments()`: Fetch documents for an event
- `getDocumentLimit()`: Check remaining uploads
- `deleteDocument()`: Remove document and file
- `pollForCompletion()`: Wait for AI processing

## Setup Instructions

### 1. Database Migration

Run the migration to create the required tables and policies:

```sql
-- Run: database/migrations/20251028000001_create_event_documents_table.sql
```

### 2. Storage Bucket

Create the storage bucket and set up RLS policies:

```sql
-- Run: database/scripts/create_event_documents_storage_bucket.sql
```

### 3. Edge Function Deployment

Deploy the AI analysis edge function:

```bash
supabase functions deploy analyze-document-for-tasks --linked
```

### 4. Environment Variables

Set up the OpenAI API key:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key --linked
```

### 5. Automated Deployment

Use the provided deployment script:

```bash
./deploy-ai-feature.sh
```

## Usage

### For Users

1. **Upload Document**: Click "AI Tasks" button in task manager
2. **Drag & Drop**: Upload PDF, Word, Excel, or image files
3. **Wait for Analysis**: AI processes the document (usually 10-30 seconds)
4. **Review Suggestions**: Edit task titles, descriptions, priorities, and due dates
5. **Create Tasks**: Select tasks to create and click "Create X Selected Tasks"

### For Developers

#### Adding New File Types

1. Update `aiDocumentAPI.js` allowed types
2. Add text extraction logic in edge function
3. Update storage bucket MIME types
4. Test with sample files

#### Customizing AI Prompts

Edit the prompt in `supabase/functions/analyze-document-for-tasks/index.ts`:

```typescript
const prompt = `You are an event planning assistant analyzing documents to extract actionable tasks.

Event: ${event.name}
Date: ${eventDateStr}
Location: ${event.location || 'TBD'}

Document content:
${extractedText}

Generate 1-10 specific, actionable tasks as JSON array:
[{
  "title": "Task title (max 100 chars)",
  "description": "Detailed description",
  "priority": "high|medium|low",
  "suggested_due_date": "YYYY-MM-DD or null",
  "reasoning": "Brief explanation"
}]

Rules:
- Focus on specific, actionable items
- Prioritize by urgency/importance
- Suggest realistic due dates before event
- Avoid duplicates/generic tasks
- Return valid JSON only`;
```

## Cost Management

### OpenAI API Costs
- **Model**: GPT-4o-mini
- **Cost**: ~$0.0004 per document analysis
- **Estimate**: ~$2 per 1000 events (5 docs each)

### Storage Costs
- **Estimate**: ~$10/month for 50GB (5000 events)
- **File Size Limit**: 10MB per document

### Limits
- **Documents per Event**: 5 maximum
- **File Size**: 10MB maximum
- **Processing Timeout**: 60 seconds

## Error Handling

### Common Issues

1. **File Too Large**: Shows error message, prevents upload
2. **Unsupported Format**: Shows message to create tasks manually
3. **AI Processing Failed**: Shows error, allows retry
4. **Document Limit Reached**: Prevents new uploads
5. **Network Issues**: Shows retry option

### Debugging

Check browser console for detailed error messages. Common debugging steps:

1. Verify OpenAI API key is set
2. Check Supabase logs for edge function errors
3. Ensure storage bucket exists and has correct policies
4. Verify RLS policies allow user access

## Security

### Row Level Security (RLS)

- Users can only access documents from events they own/collaborate on
- Insert: Event owner/editor only
- Select: Event owner/editor/viewer
- Update: Document uploader + event owner/editor
- Delete: Document uploader + event owner/editor

### File Validation

- MIME type validation
- File size limits
- File extension checking
- User permission verification

## Testing

### Test Cases

1. **PDF Upload**: Upload PDF with event planning content
2. **Word Document**: Upload DOCX with task lists
3. **Excel Spreadsheet**: Upload XLSX with schedules
4. **Image Files**: Upload PNG/JPG (should show manual creation message)
5. **File Size Limits**: Try uploading files > 10MB
6. **Document Limits**: Try uploading 6th document (should be blocked)
7. **Permission Tests**: Try accessing other users' documents
8. **Error Scenarios**: Test with corrupted files, network issues

### Sample Test Documents

Create test documents with:
- Event planning checklists
- Vendor contact lists
- Timeline schedules
- Budget breakdowns
- Venue requirements

## Future Enhancements

### Phase 2 Features

1. **OCR Support**: Extract text from images
2. **Advanced File Types**: Support for PowerPoint, Google Docs
3. **Batch Processing**: Upload multiple documents at once
4. **Template Recognition**: Recognize common event planning templates
5. **Smart Categorization**: Auto-categorize tasks by type
6. **Due Date Intelligence**: Better due date suggestions based on event timeline

### Integration Opportunities

1. **Calendar Integration**: Sync suggested due dates with calendar
2. **Vendor Matching**: Link tasks to relevant vendors
3. **Budget Integration**: Extract budget items from documents
4. **Timeline Generation**: Create event timelines from documents

## Support

For issues or questions:

1. Check the browser console for errors
2. Verify all setup steps are completed
3. Test with simple PDF documents first
4. Check Supabase logs for edge function errors
5. Ensure OpenAI API key is valid and has credits

## Changelog

### Version 1.0.0 (October 28, 2025)
- Initial implementation
- PDF text extraction
- AI task suggestion generation
- Drag-and-drop upload interface
- Task review and creation modal
- Document management and limits
- RLS security policies
