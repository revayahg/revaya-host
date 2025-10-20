window.parseEmails = function parseEmails(raw) {
  if (!raw) return [];
  // Extract emails from anything (commas, semicolons, newlines, "Name <email>")
  const matches = String(raw).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map(e => e.trim().toLowerCase()))];
};

window.isValidEmail = function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
};