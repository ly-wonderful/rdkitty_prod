// config.js
// Replace these with your actual Supabase Project URL and Anon Key
// You can find these in the Supabase Dashboard -> Settings -> API
const SUPABASE_URL = 'https://nkuvmepjslykfdlajguw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_W5tzUU8-XqBp92zvklfiQw_FVGHHpxj';

// Initialize the Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

