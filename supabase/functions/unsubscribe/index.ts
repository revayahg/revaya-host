import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Secure CORS configuration
const allowedOrigins = [
  'https://revayahost.com',
  'https://www.revayahost.com',
  'http://localhost:8000',
  'https://localhost:8000',
  'https://127.0.0.1:8000',
  'http://127.0.0.1:8000'
]

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  }
}

// Redirect URL after successful unsubscribe
// Use development URL if SUPABASE_URL is development, otherwise use production
function getConfirmUrl() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  // Development database: drhzvzimmmdbsvwhlsxm
  // Production database: mrjnkoijfrbsapykgfwj
  if (supabaseUrl.includes('drhzvzimmmdbsvwhlsxm')) {
    return 'http://localhost:8000/#/unsubscribed'
  }
  return 'https://www.revayahost.com/#/unsubscribed'
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get token and format from query parameters
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const format = url.searchParams.get('format') || 'redirect' // 'redirect' or 'json'

    if (!token) {
      // No token provided
      if (format === 'json') {
        return new Response(JSON.stringify({ success: false, error: 'Missing token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return Response.redirect(getConfirmUrl() + '?error=invalid_token', 302)
    }
    
    // Validate UUID format for security (unsubscribe tokens are UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(token)) {
      // Invalid token format
      if (format === 'json') {
        return new Response(JSON.stringify({ success: false, error: 'Invalid token format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return Response.redirect(getConfirmUrl(), 302)
    }

    // Create Supabase client (using service role for admin access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials')
      if (format === 'json') {
        return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return Response.redirect(getConfirmUrl() + '?error=server_error', 302)
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Try to find and update the contact/profile with this unsubscribe token
    // First, try profiles table (if it exists)
    let updateResult = await supabaseClient
      .from('profiles')
      .update({ 
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('unsubscribe_token', token)
      .select('id, email')
      .maybeSingle()

    // If not found in profiles, try contacts table (if it exists)
    if (!updateResult.data || updateResult.error) {
      updateResult = await supabaseClient
        .from('contacts')
        .update({ 
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('unsubscribe_token', token)
        .select('id, email')
        .maybeSingle()
    }

    // If still not found, try vendors table (some users might be vendors)
    if (!updateResult.data || updateResult.error) {
      updateResult = await supabaseClient
        .from('vendor_profiles')
        .update({ 
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('unsubscribe_token', token)
        .select('id, email')
        .maybeSingle()
    }

    // Log the result
    if (updateResult.data) {
      console.log('✅ Unsubscribed:', updateResult.data.email || updateResult.data.id)
    } else {
      console.log('⚠️ Token not found or already used:', token)
    }

    // Return response based on format requested
    if (format === 'json') {
      // Return JSON response for frontend calls
      return new Response(JSON.stringify({ 
        success: !!updateResult.data,
        message: updateResult.data ? 'Successfully unsubscribed' : 'Token not found'
      }), {
        status: updateResult.data ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Always redirect to confirmation page (even if token not found, for security)
    // This prevents attackers from discovering valid emails by testing tokens
    return Response.redirect(getConfirmUrl(), 302)

  } catch (error) {
    console.error('❌ Unsubscribe error:', error)
    
    // Return JSON error if format=json was requested
    if (format === 'json') {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Server error processing unsubscribe request'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Redirect to confirmation page on error (don't expose error details)
    return Response.redirect(getConfirmUrl(), 302)
  }
})

