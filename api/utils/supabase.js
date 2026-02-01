const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load environment variables explicitly here

// Ensure Environment Variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Error: Missing Supabase Environment Variables');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
