import { supabase } from './src/lib/supabase';

async function test() {
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  console.log("Error:", error?.message);
  if (data) {
     console.log("Columns:", data.length > 0 ? Object.keys(data[0]) : "No rows");
  }
}
test();
