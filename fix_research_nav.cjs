const fs = require('fs');
let content = fs.readFileSync('src/components/cms/ResearchLecturesNavCMS.tsx', 'utf8');

// Add props type
content = content.replace(
  'export default function ResearchLecturesNavCMS() {',
  `export default function ResearchLecturesNavCMS({ filterTab }: { filterTab?: 'academia' | 'navigation' }) {`
);

// Modify activeSubTab initialization
content = content.replace(
  "const [activeSubTab, setActiveSubTab] = useState<'research' | 'lectures' | 'nav'>('research');",
  "const [activeSubTab, setActiveSubTab] = useState<'research' | 'lectures' | 'nav'>(filterTab === 'navigation' ? 'nav' : 'research');\n  \n  // Cập nhật tab nếu prop thay đổi\n  React.useEffect(() => {\n    if (filterTab === 'navigation') setActiveSubTab('nav');\n    else if (filterTab === 'academia' && activeSubTab === 'nav') setActiveSubTab('research');\n  }, [filterTab]);"
);

// Modify the tab mapping to filter based on `filterTab`
const tabsRegex = /\{\[\s*\{\s*id:\s*'research'[\s\S]*?\}\s*\]\.map/m;
const match = content.match(tabsRegex);

if (match) {
  content = content.replace(tabsRegex, 
    `{[
          { id: 'research', title: 'Công bố Nghiên cứu', icon: Sparkles },
          { id: 'lectures', title: 'Bài giảng & Học liệu', icon: BookOpen },
          { id: 'nav', title: 'Điều hướng (Navigation)', icon: Compass }
        ].filter(tab => {
          if (filterTab === 'academia') return tab.id === 'research' || tab.id === 'lectures';
          if (filterTab === 'navigation') return tab.id === 'nav';
          return true;
        }).map`
  );
}

fs.writeFileSync('src/components/cms/ResearchLecturesNavCMS.tsx', content);
