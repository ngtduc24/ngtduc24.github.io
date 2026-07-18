import re

with open('src/components/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { getUserById } from '../lib/data';", "import { getUserById, USERS_TABLE, mapUserFromDB } from '../lib/data';")

with open('src/components/LoginScreen.tsx', 'w') as f:
    f.write(content)

