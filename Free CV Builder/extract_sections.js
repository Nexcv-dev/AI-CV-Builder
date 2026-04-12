const fs = require('fs');
const content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

const match = content.match(/<AccordionSection id="personal"[\s\S]*?<\/AccordionSection>/);
if (match) {
  console.log("Found personal section");
}
