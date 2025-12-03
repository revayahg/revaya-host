import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "npm:openai@^4.20.0"
import pdfParse from "npm:pdf-parse@^1.1.1"
import JSZip from "https://esm.sh/jszip@3.10.1"

// Secure CORS configuration
const allowedOrigins = [
  'https://revayahost.com',
  'https://www.revayahost.com',
  'https://localhost:8000',
  'http://localhost:8000',
  'https://127.0.0.1:8000',
  'http://127.0.0.1:8000'
]

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  }
}

interface DocumentRecord {
  id: string
  event_id: string
  file_name: string
  file_path: string
  file_type: string
  processing_status: string
}

interface EventContext {
  name: string
  start_date: string | null
  end_date: string | null
  date: string | null
  location: string | null
  event_type: string | null
}

interface TaskSuggestion {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  suggested_due_date: string | null
  reasoning: string
}

// Server-side file validation function
function validateDocumentFile(document: DocumentRecord): { valid: boolean; error?: string } {
  // Check required fields exist
  if (!document.file_type) {
    return { valid: false, error: 'Missing file type' }
  }
  
  // Handle file_size as number, string, or bigint from database
  const fileSize = typeof document.file_size === 'string' 
    ? parseInt(document.file_size, 10) 
    : typeof document.file_size === 'bigint'
    ? Number(document.file_size)
    : document.file_size
    
  if (typeof fileSize !== 'number' || isNaN(fileSize) || fileSize <= 0) {
    return { valid: false, error: 'Missing or invalid file size' }
  }
  
  if (!document.file_name) {
    return { valid: false, error: 'Missing file name' }
  }
  
  if (!document.file_path) {
    return { valid: false, error: 'Missing file path' }
  }
  
  // Validate file type - expanded to include more document formats
  const allowedTypes = [
    // PDF
    'application/pdf',
    // Word documents
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    // Excel documents
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    // Text documents
    'text/plain', // .txt
    'text/rtf', // .rtf
    'text/csv', // .csv
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/x-icon'
  ]
  
  if (!allowedTypes.includes(document.file_type)) {
    return { valid: false, error: 'Unsupported file type' }
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (fileSize > maxSize) {
    return { valid: false, error: 'File size exceeds limit' }
  }
  
  // Validate file name (prevent path traversal)
  if (document.file_name.includes('..') || document.file_name.includes('/') || document.file_name.includes('\\')) {
    return { valid: false, error: 'Invalid file name' }
  }
  
  // Validate file path format
  if (!document.file_path.startsWith(document.event_id + '/')) {
    return { valid: false, error: 'Invalid file path' }
  }
  
  return { valid: true }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Declare document_id outside try block for error handling
  let document_id: string | undefined = undefined

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    document_id = body.document_id
    const event_id = body.event_id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    if (!document_id || !event_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate UUID format for security (prevent injection attempts)
    if (!uuidRegex.test(document_id) || !uuidRegex.test(event_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch document record and verify permissions
    const { data: document, error: docError } = await supabaseClient
      .from('event_documents')
      .select('*')
      .eq('id', document_id)
      .eq('event_id', event_id)
      .single()

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Server-side file validation
    const validationResult = validateDocumentFile(document)
    if (!validationResult.valid) {
      // Update document status to error
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'error',
          ai_suggestions: { error: validationResult.error }
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'Invalid file data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to processing
    await supabaseClient
      .from('event_documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id)

    // Fetch event context
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('name, start_date, end_date, date, location, event_type')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      await supabaseClient
        .from('event_documents')
        .update({ processing_status: 'error' })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download file from Supabase Storage
    console.log('Downloading file from storage:', document.file_path)
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('event-documents')
      .download(document.file_path)

    if (fileError) {
      console.error('File download error:', fileError)
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'error',
          ai_suggestions: { error: `File download failed: ${fileError.message}` }
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: `Failed to download file: ${fileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!fileData) {
      console.error('File data is null or undefined')
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'error',
          ai_suggestions: { error: 'File data is empty' }
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'File data is empty' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('File downloaded successfully, size:', fileData.size)

    // Extract text based on file type
    let extractedText = ''
    
    try {
      console.log('Processing file type:', document.file_type)
      
      if (document.file_type === 'application/pdf') {
        console.log('Processing PDF file...')
        const arrayBuffer = await fileData.arrayBuffer()
        const pdfData = await pdfParse(arrayBuffer)
        extractedText = pdfData.text
        console.log('PDF text extracted, length:', extractedText.length)
        console.log('PDF text preview:', extractedText.substring(0, 200))
      } else if (document.file_type === 'text/plain' || document.file_type === 'text/csv') {
        // For text files, read directly as text
        console.log('Processing text file...')
        extractedText = await fileData.text()
        console.log('Text file extracted, length:', extractedText.length)
        console.log('Text preview:', extractedText.substring(0, 200))
      } else if (document.file_type === 'text/rtf') {
        // RTF files need basic parsing (strip RTF codes)
        console.log('Processing RTF file...')
        const rtfText = await fileData.text()
        // Basic RTF stripping - remove control words and braces
        extractedText = rtfText
          .replace(/\{[^}]*\}/g, '') // Remove RTF groups
          .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
          .replace(/[{}]/g, '') // Remove remaining braces
          .trim()
        console.log('RTF text extracted, length:', extractedText.length)
      } else if (document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX files are ZIP archives containing XML files
        console.log('Processing DOCX file...')
        try {
          const arrayBuffer = await fileData.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          // Extract text from word/document.xml
          const documentXml = await zip.file('word/document.xml')?.async('string')
          if (!documentXml) {
            throw new Error('Could not find word/document.xml in DOCX file')
          }
          
          // Parse XML and extract text content
          // Word XML uses <w:t> tags for text content
          // Extract text from <w:t> tags and handle line breaks
          let textParts: string[] = []
          const textTagRegex = /<w:t[^>]*>([^<]*)<\/w:t>/gi
          let match
          while ((match = textTagRegex.exec(documentXml)) !== null) {
            if (match[1]) {
              textParts.push(match[1])
            }
          }
          
          // If no <w:t> tags found, fall back to removing all XML tags
          if (textParts.length === 0) {
            extractedText = documentXml
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          } else {
            // Join text parts and normalize whitespace
            extractedText = textParts
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
          }
          
          // Decode XML entities (needed for both paths)
          extractedText = extractedText
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
          
          console.log('DOCX text extracted, length:', extractedText.length)
          console.log('DOCX text preview:', extractedText.substring(0, 200))
        } catch (docxError) {
          console.error('DOCX extraction error:', docxError)
          throw new Error(`Failed to extract text from DOCX: ${docxError.message}`)
        }
      } else if (document.file_type === 'application/msword') {
        // Legacy .doc files are binary format - harder to parse without specialized library
        // For now, return a message suggesting conversion
        extractedText = 'Legacy Word document (.doc) detected. Please convert to DOCX or PDF for AI analysis.'
      } else if (document.file_type === 'application/vnd.ms-excel' || 
                 document.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // For Excel files, we'll need to implement cell parsing
        // For now, return a message suggesting manual task creation
        extractedText = 'Excel file detected. Please manually create tasks or convert to CSV/TXT for AI analysis.'
      } else if (document.file_type.startsWith('image/')) {
        // For images, we'll need OCR implementation
        // For now, return a message suggesting manual task creation
        extractedText = 'Image file detected. OCR analysis not yet implemented. Please manually create tasks.'
      } else {
        extractedText = 'Unsupported file type for AI analysis.'
      }
    } catch (extractError) {
      console.error('Text extraction error:', extractError)
      await supabaseClient
        .from('event_documents')
        .update({ processing_status: 'error' })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to extract text from document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no text extracted or unsupported format, return early
    if (!extractedText || extractedText.includes('detected') || extractedText.includes('not yet implemented')) {
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'completed',
          ai_suggestions: [{
            title: 'Manual Task Creation Required',
            description: extractedText,
            priority: 'medium',
            suggested_due_date: null,
            reasoning: 'This file type requires manual task creation or conversion to PDF'
          }]
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ 
          suggestions: [{
            title: 'Manual Task Creation Required',
            description: extractedText,
            priority: 'medium',
            suggested_due_date: null,
            reasoning: 'This file type requires manual task creation or conversion to PDF'
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      await supabaseClient
        .from('event_documents')
        .update({ processing_status: 'error' })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Prepare event context for AI prompt
    const eventDate = event.start_date || event.end_date || event.date
    const eventDateStr = eventDate ? new Date(eventDate).toLocaleDateString() : 'TBD'
    
    // Create AI prompt
    const prompt = `You are an event planning assistant analyzing documents to extract actionable tasks.

Event: ${event.name}
Date: ${eventDateStr}
Location: ${event.location || 'TBD'}
Event Type: ${event.event_type || 'General Event'}

Document content:
${extractedText.substring(0, 8000)} ${extractedText.length > 8000 ? '...[truncated]' : ''}

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
- Return valid JSON only`

    // Call OpenAI API
    console.log('Calling OpenAI API...')
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert event planning assistant. Always respond with valid JSON arrays only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })
      console.log('OpenAI API call successful')
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError)
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'error',
          ai_suggestions: { error: `OpenAI API error: ${openaiError.message || 'Unknown error'}` }
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ 
          error: 'AI service error',
          details: openaiError.message || 'Failed to call OpenAI API'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      console.error('No response content from OpenAI')
      await supabaseClient
        .from('event_documents')
        .update({ 
          processing_status: 'error',
          ai_suggestions: { error: 'No response from AI service' }
        })
        .eq('id', document_id)
      
      return new Response(
        JSON.stringify({ error: 'No response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('OpenAI response received, length:', aiResponse.length)

    // Parse AI response
    let suggestions: TaskSuggestion[]
    try {
      console.log('Raw AI response:', aiResponse)
      
      // Clean the response - sometimes AI returns markdown code blocks
      let cleanedResponse = aiResponse.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('Cleaned AI response:', cleanedResponse)
      
      suggestions = JSON.parse(cleanedResponse)
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array')
      }
      
      console.log('Parsed suggestions:', suggestions)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response was:', aiResponse)
      
      // Fallback: create a generic suggestion
      suggestions = [{
        title: 'Review Document Content',
        description: 'Please review the uploaded document and create relevant tasks manually.',
        priority: 'medium',
        suggested_due_date: null,
        reasoning: 'AI analysis failed, manual review required'
      }]
    }

    // Update document with AI suggestions
    await supabaseClient
      .from('event_documents')
      .update({ 
        processing_status: 'completed',
        ai_suggestions: suggestions
      })
      .eq('id', document_id)

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    
    // Try to update document status to error if we have document_id
    if (document_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: req.headers.get('Authorization')! },
            },
          }
        )
        await supabaseClient
          .from('event_documents')
          .update({ processing_status: 'error' })
          .eq('id', document_id)
      } catch (updateError) {
        console.error('Failed to update document status:', updateError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
