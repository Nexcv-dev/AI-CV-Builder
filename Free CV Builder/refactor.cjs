const fs = require('fs');
let content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

// 1. Extract the component
const componentRegex = /  const SortableAccordionSection = \(\{ id, title, icon: Icon, children \}: \{ key\?: string, id: string, title: string, icon: any, children: React\.ReactNode \}\) => \{[\s\S]*?return \([\s\S]*?<\/div>\n    \);\n  \};\n/m;

const match = content.match(componentRegex);
if (!match) {
  console.log("Component not found!");
  process.exit(1);
}

const componentCode = match[0];
content = content.replace(componentCode, '');

// 2. Modify the component code
let newComponentCode = componentCode.replace(
  `const SortableAccordionSection = ({ id, title, icon: Icon, children }: { key?: string, id: string, title: string, icon: any, children: React.ReactNode }) => {`,
  `const SortableAccordionSection = ({ id, title, icon: Icon, children, isOpen, onToggle }: { key?: string, id: string, title: string, icon: any, children: React.ReactNode, isOpen: boolean, onToggle: () => void }) => {`
);

newComponentCode = newComponentCode.replace(
  `const isOpen = expandedSection === id;`,
  ``
);

newComponentCode = newComponentCode.replace(
  `onClick={() => setExpandedSection(isOpen ? null : id)}`,
  `type="button"\n            onClick={onToggle}`
);

// Remove the leading spaces for the component definition
newComponentCode = newComponentCode.split('\n').map(line => line.replace(/^  /, '')).join('\n');

// 3. Insert the component before CVForm
content = content.replace(
  `export default function CVForm({ cvData, setCvData }: CVFormProps) {`,
  `${newComponentCode}\nexport default function CVForm({ cvData, setCvData }: CVFormProps) {`
);

// 4. Update the usages
content = content.replace(
  /<SortableAccordionSection key="([^"]+)" id="([^"]+)" title="([^"]+)" icon=\{([^}]+)\}>/g,
  `<SortableAccordionSection key="$1" id="$2" title="$3" icon={$4} isOpen={expandedSection === '$2'} onToggle={() => setExpandedSection(expandedSection === '$2' ? null : '$2')}>`
);

fs.writeFileSync('src/components/CVForm.tsx', content);
console.log("Refactoring complete!");
