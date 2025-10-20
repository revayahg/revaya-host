// Environment configuration for development vs production
const getEnvironmentConfig = () => {
  const hostname = window.location.hostname;
  
  // FORCE development environment for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    const config = {
      url: 'https://drhzvzimmmdbsvwhlsxm.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaHp2emltbW1kYnN2d2hsc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTU0MDEsImV4cCI6MjA3NTA5MTQwMX0.0TzNSiZNa_lLImo9ol5DDUUwHoNVHxhQWY_kqoGO41w',
      environment: 'development'
    };
    return config;
  }
  
  // Production environment (deployed) - LIVE database
  const config = {
    url: 'https://mrjnkoijfrbsapykgfwj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yam5rb2lqZnJic2FweWtnZndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzIwOTEsImV4cCI6MjA2Mjg0ODA5MX0.Uj2OdgsCY0_PlWvmStfk8sacAw5CeULF_aluyeiD6_s',
    environment: 'production'
  };
  return config;
};

// Set global configuration
window.SUPABASE_CONFIG = getEnvironmentConfig();
window.SUPABASE_URL = window.SUPABASE_CONFIG.url;
window.SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
