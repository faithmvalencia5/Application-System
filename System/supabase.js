import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://kauaozunssdyemqfzqtm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWFvenVuc3NkeWVtcWZ6cXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDg0NDAsImV4cCI6MjA5NjQ4NDQ0MH0.5JFtXtHvtxRzsbIfvch5YuXSVSKNX1zk751MBZx39fw'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

window.supabaseClient = supabase