// FILE: supabase-client.js
// This is the FIXED version

const SUPABASE_URL = 'https://akaydadhkvpvyajnsvki.supabase.co';      // Paste your Project URL here
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXlkYWRoa3Zwdnlham5zdmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTUzMDgsImV4cCI6MjA3MzQzMTMwOH0.sfrQ1ToVf2UnCir-vx6CTC8NSYjCy_htTKpPX09Ivio'; // Paste your anon (public) key here

// Get the createClient function from the global 'supabase' object (loaded by the SDK script)
const { createClient } = supabase;

// Create our one-and-only client instance and name it 'supaClient'
// All other scripts MUST use this 'supaClient' variable.
const supaClient = createClient(SUPABASE_URL, SUPABASE_KEY);