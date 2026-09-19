const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><body>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"></script>
  <script>
    setTimeout(() => {
      console.log("MINDAR keys:", window.MINDAR ? Object.keys(window.MINDAR) : null);
      if (window.MINDAR && window.MINDAR.IMAGE) console.log("IMAGE keys:", Object.keys(window.MINDAR.IMAGE));
    }, 1000);
  </script>
</body>`, { runScripts: "dangerously", resources: "usable" });
