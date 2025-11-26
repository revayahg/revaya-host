/**
 * Unsubscribe Footer Generator
 * Generates standardized unsubscribe footer for marketing emails
 * File: utils/email/unsubscribeFooter.js
 */

window.generateUnsubscribeFooter = function(email, unsubscribeToken = null) {
    // Base URL for unsubscribe edge function
    // Include anon key for public access (email links can't send headers)
    const anonKey = window.SUPABASE_ANON_KEY || '';
    let unsubscribeUrl;
    
    if (unsubscribeToken) {
        // Point to frontend page which handles unsubscribe with proper authentication
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://www.revayahost.com'
        unsubscribeUrl = `${baseUrl}/#/unsubscribed?token=${unsubscribeToken}`;
    } else {
        unsubscribeUrl = 'https://www.revayahost.com/#/unsubscribed'; // Fallback if no token
    }
    
    // Base URL for preferences page
    const preferencesUrl = 'https://www.revayahost.com/#/preferences';
    
    return `
        <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
        &nbsp;•&nbsp;
        <a href="${preferencesUrl}" style="color:#64748B;text-decoration:underline;">Manage preferences</a>
        <br>
        <br>
        Revaya Hospitality Group LLC • 407 Lincoln Road, Ste 6H, Miami Beach, FL 33139 • 
        <a href="mailto:info@revayahg.com" style="color:#64748B;text-decoration:underline;">info@revayahg.com</a>
    `;
};

/**
 * Generate unsubscribe footer for edge functions (TypeScript/Deno)
 * Use this in edge functions that send emails
 */
window.getUnsubscribeFooterText = function(email, unsubscribeToken = null) {
    // Base URL for unsubscribe edge function
    // Include anon key for public access (email links can't send headers)
    // Note: This is for edge functions - they should pass anonKey as parameter
    // For client-side, use generateUnsubscribeFooter instead
    const unsubscribeUrl = unsubscribeToken 
        ? `https://mrjnkoijfrbsapykgfwj.supabase.co/functions/v1/unsubscribe?token=${unsubscribeToken}`
        : 'https://www.revayahost.com/#/unsubscribed';
    
    const preferencesUrl = 'https://www.revayahost.com/#/preferences';
    
    return `
        <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
        &nbsp;•&nbsp;
        <a href="${preferencesUrl}" style="color:#64748B;text-decoration:underline;">Manage preferences</a>
        <br>
        <br>
        Revaya Hospitality Group LLC • 407 Lincoln Road, Ste 6H, Miami Beach, FL 33139 • 
        <a href="mailto:info@revayahg.com" style="color:#64748B;text-decoration:underline;">info@revayahg.com</a>
    `;
};

