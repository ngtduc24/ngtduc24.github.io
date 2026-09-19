import re

with open('src/components/LoginScreen.tsx', 'r') as f:
    content = f.read()

# Make sure we import what we need
if "from 'firebase/firestore'" not in content:
    content = content.replace("import { auth } from '../lib/firebase';", "import { auth, db } from '../lib/firebase';\nimport { collection, query, where, getDocs } from 'firebase/firestore';")

# Find the block we want to replace
target_block = """    if (!targetUserMetadata) {
      try {
        const { data: sbUser, error: sbError } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike."${usernameClean}",email.ilike."${usernameClean}"`)
          .maybeSingle();
        if (sbUser && !sbError) {
          targetUserMetadata = {
            id: sbUser.id,
            username: sbUser.username,
            fullName: sbUser.full_name,
            email: sbUser.email,
            role: sbUser.role,
            permissions: sbUser.permissions || [],
            createdAt: sbUser.created_at,
          } as any;
        }
      } catch (e) {
        console.warn("Supabase check user failed:", e);
      }
    }"""

replacement_block = """    if (!targetUserMetadata) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const { USERS_TABLE, mapUserFromDB } = await import('../lib/data');
        
        // Cố gắng tìm trong Firebase Firestore trước vì đây là database chính cho users
        const usersRef = collection(db, USERS_TABLE);
        const emailQuery = query(usersRef, where("email", "==", usernameClean));
        const emailDocs = await getDocs(emailQuery);
        
        if (!emailDocs.empty) {
          const docData = emailDocs.docs[0];
          targetUserMetadata = mapUserFromDB({ id: docData.id, ...docData.data() }) as any;
        } else {
          const usernameQuery = query(usersRef, where("username", "==", usernameClean));
          const usernameDocs = await getDocs(usernameQuery);
          if (!usernameDocs.empty) {
            const docData = usernameDocs.docs[0];
            targetUserMetadata = mapUserFromDB({ id: docData.id, ...docData.data() }) as any;
          }
        }
        
        // Nếu vẫn không tìm thấy trong Firebase, thử tìm fallback trong Supabase
        if (!targetUserMetadata) {
          const { data: sbUser, error: sbError } = await supabase
            .from('users')
            .select('*')
            .or(`username.ilike."${usernameClean}",email.ilike."${usernameClean}"`)
            .maybeSingle();
          if (sbUser && !sbError) {
            targetUserMetadata = {
              id: sbUser.id,
              username: sbUser.username,
              fullName: sbUser.full_name,
              email: sbUser.email,
              role: sbUser.role,
              permissions: sbUser.permissions || [],
              createdAt: sbUser.created_at,
            } as any;
          }
        }
      } catch (e) {
        console.warn("Lấy thông tin user thất bại:", e);
      }
    }"""

content = content.replace(target_block, replacement_block)

with open('src/components/LoginScreen.tsx', 'w') as f:
    f.write(content)

