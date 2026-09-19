import { supabase } from './src/lib/supabase';
import { USERS_TABLE } from './src/lib/data';

async function test() {
  const { data, error } = await supabase.from(USERS_TABLE).insert({
    id: 'test-id',
    username: 'testuser',
    email: 'test@example.com'
  });
  console.log("Error:", error);
}
test();
