import re

with open('src/components/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("const { collection, query, where, getDocs } = await import('firebase/firestore');\\n        const { db } = await import('../lib/firebase');\\n        const { USERS_TABLE, mapUserFromDB } = await import('../lib/data');", "")

# wait, using regex is safer
content = re.sub(r"const { collection, query, where, getDocs } = await import\('firebase/firestore'\);\s*const { db } = await import\('../lib/firebase'\);\s*const { USERS_TABLE, mapUserFromDB } = await import\('../lib/data'\);", "", content)

with open('src/components/LoginScreen.tsx', 'w') as f:
    f.write(content)

