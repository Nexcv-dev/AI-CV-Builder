const fs = require('fs');
let content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

const componentRegex = /const SortableAccordionSection = \(\{ id, title, icon: Icon, children \}: \{ key\?: string, id: string, title: string, icon: any, children: React\.ReactNode \}\) => \{[\s\S]*?return \([\s\S]*?<\/div>\n    \);\n  \};/m;

const match = content.match(componentRegex);
if (match) {
  console.log("Found component!");
} else {
  console.log("Component not found.");
}
