import re

with open('src/components/ARScanner.tsx', 'r') as f:
    content = f.read()

pattern = r"""        if \(!\(window as any\)\.MINDAR\) \{.*?const \{ Compiler \} = \(window as any\)\.MINDAR\.IMAGE;"""

replacement = """        let MindARThree, Compiler;
        try {
          const core = await import("https://esm.sh/mind-ar@1.2.5/dist/mindar-image.prod.js");
          const three = await import("https://esm.sh/mind-ar@1.2.5/dist/mindar-image-three.prod.js");
          Compiler = core.Compiler || (window as any).MINDAR?.IMAGE?.Compiler;
          MindARThree = three.MindARThree || (window as any).MINDAR?.IMAGE?.MindARThree;
        } catch (e) {
          console.error("ESM load failed", e);
          throw new Error("Lỗi tải thư viện MindAR");
        }"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/ARScanner.tsx', 'w') as f:
    f.write(new_content)
