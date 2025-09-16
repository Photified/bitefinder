// FILE: supabase-client.js
// This is the FIXED version

const SUPABASE_URL = 'https://lnsykgrjtgugnxufvruj.supabase.co';      // Paste your Project URL here
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuc3lrZ3JqdGd1Z254dWZ2cnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTk2MjMsImV4cCI6MjA3MzYzNTYyM30.vwW4ziHiq-Wsx0eit78WHafQJ7vsfJ-4KY4bhbwniWw'; // Paste your anon (public) key here

// Get the createClient function from the global 'supabase' object (loaded by the SDK script)
const { createClient } = supabase;

// Create our one-and-only client instance and name it 'supaClient'
// All other scripts MUST use this 'supaClient' variable.
const supaClient = createClient(SUPABASE_URL, SUPABASE_KEY);
