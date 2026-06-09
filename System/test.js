import { supabase } from './supabase.js'

async function testConnection() {

    const { data, error } = await supabase
        .from('applications')
        .select('*')

    console.log('Data:', data)
    console.log('Error:', error)
}

testConnection()