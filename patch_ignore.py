import re

with open('src/components/ARScanner.tsx', 'r') as f:
    content = f.read()

pattern = r"""          const core = await import\("https://esm.sh/mind-ar@1.2.5/dist/mindar-image.prod.js"\);
          const three = await import\("https://esm.sh/mind-ar@1.2.5/dist/mindar-image-three.prod.js"\);"""

replacement = """          // @ts-ignore
          const core = await import("https://esm.sh/mind-ar@1.2.5/dist/mindar-image.prod.js");
          // @ts-ignore
          const three = await import("https://esm.sh/mind-ar@1.2.5/dist/mindar-image-three.prod.js");"""

new_content = re.sub(pattern, replacement, content)

with open('src/components/ARScanner.tsx', 'w') as f:
    f.write(new_content)
