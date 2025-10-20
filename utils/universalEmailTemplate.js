// Universal Email Template - Compatible with ALL email clients
// Updated 2025-01-14 - Universal compatibility across Outlook, Gmail, Apple Mail, etc.

window.UniversalEmailTemplate = {
  /**
   * Creates a universal email template that works across all email clients
   * @param {Object} config - Email configuration
   * @param {string} config.title - Email title/header
   * @param {string} config.subtitle - Email subtitle
   * @param {string} config.content - Main email content (HTML)
   * @param {string} config.preheader - Preheader text (hidden preview)
   * @param {Object} config.buttons - Button configuration
   * @param {string} config.footer - Footer text
   * @param {string} config.headerColor - Header background color (hex)
   * @param {string} config.buttonColor - Button background color (hex)
   * @param {string} config.logoText - Logo text (default: "RH")
   * @returns {string} Complete HTML email
   */
  createEmail({
    title = "Notification",
    subtitle = "",
    content = "",
    preheader = "",
    buttons = [],
    footer = "This email was sent via Revaya Host event management platform.",
    headerColor = "#667eea",
    buttonColor = "#10b981",
    logoText = "RH"
  }) {
    // Generate buttons HTML
    let buttonsHTML = "";
    if (buttons && buttons.length > 0) {
      buttonsHTML = buttons.map(button => `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 5px;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: ${button.color || buttonColor};">
              <a href="${button.url}" 
                 style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; color: #ffffff; border-radius: 6px; background-color: ${button.color || buttonColor};">
                ${button.text}
              </a>
            </td>
          </tr>
        </table>
      `).join("");
    }

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Outlook-specific fixes */
        .outlook-group-fix { width: 100%; }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .mobile-center { text-align: center !important; }
            .mobile-padding { padding: 15px !important; }
            .mobile-font-large { font-size: 20px !important; }
            .mobile-font-small { font-size: 14px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
    <!-- Preheader text -->
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader}
    </div>
    
    <!-- Main email table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 20px; background-color: ${headerColor};">
                            <!-- Logo -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background-color: ${this.darkenColor(headerColor, 20)}; width: 60px; height: 60px; border-radius: 50%; font-size: 24px; font-weight: bold; color: #ffffff; line-height: 60px;">
                                        ${logoText}
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Title -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                                <tr>
                                    <td align="center" style="color: #ffffff; font-size: 28px; font-weight: bold; line-height: 1.2; font-family: Arial, sans-serif;">
                                        ${title}
                                    </td>
                                </tr>
                                ${subtitle ? `
                                <tr>
                                    <td align="center" style="color: #e2e8f0; font-size: 16px; line-height: 1.4; font-family: Arial, sans-serif; padding-top: 8px;">
                                        ${subtitle}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 20px; background-color: #ffffff;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="color: #374151; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif; text-align: left;">
                                        ${content}
                                    </td>
                                </tr>
                                
                                <!-- CTA Buttons -->
                                ${buttonsHTML ? `
                                <tr>
                                    <td align="center" style="padding: 30px 0 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            ${buttonsHTML}
                                        </table>
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #6b7280; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                                        ${footer}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  },

  /**
   * Helper function to darken a hex color
   * @param {string} hex - Hex color code
   * @param {number} percent - Percentage to darken (0-100)
   * @returns {string} Darkened hex color
   */
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  },

  /**
   * Creates a content box with styling
   * @param {string} content - HTML content
   * @param {string} borderColor - Left border color
   * @returns {string} Styled content box HTML
   */
  createContentBox(content, borderColor = "#667eea") {
    return `
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${borderColor};">
        ${content}
      </div>
    `;
  },

  /**
   * Creates a styled paragraph
   * @param {string} text - Text content
   * @param {string} color - Text color (optional)
   * @returns {string} Styled paragraph HTML
   */
  createParagraph(text, color = "#4a5568") {
    return `<p style="color: ${color}; margin: 12px 0; font-size: 16px; line-height: 1.6;">${text}</p>`;
  },

  /**
   * Creates a styled heading
   * @param {string} text - Heading text
   * @param {number} level - Heading level (1-6)
   * @param {string} color - Text color (optional)
   * @returns {string} Styled heading HTML
   */
  createHeading(text, level = 3, color = "#2d3748") {
    const size = level === 1 ? "24px" : level === 2 ? "20px" : level === 3 ? "18px" : "16px";
    return `<h${level} style="color: ${color}; font-size: ${size}; font-weight: 600; margin: 0 0 8px 0; line-height: 1.2;">${text}</h${level}>`;
  }
};

// Make it globally available
window.createUniversalEmail = window.UniversalEmailTemplate.createEmail.bind(window.UniversalEmailTemplate);
window.createContentBox = window.UniversalEmailTemplate.createContentBox.bind(window.UniversalEmailTemplate);
window.createParagraph = window.UniversalEmailTemplate.createParagraph.bind(window.UniversalEmailTemplate);
window.createHeading = window.UniversalEmailTemplate.createHeading.bind(window.UniversalEmailTemplate);
