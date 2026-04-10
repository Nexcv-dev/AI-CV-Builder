const fs = require('fs');
let content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

content = content.replace(/<SortableAccordionSection id="([^"]+)"/g, '<SortableAccordionSection key="$1" id="$1"');

fs.writeFileSync('src/components/CVForm.tsx', content);
