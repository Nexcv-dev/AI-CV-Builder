const fs = require('fs');

const content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

// We need to replace AccordionSection with SortableAccordionSection
// We need to add imports for dnd-kit
// We need to add GripVertical to lucide-react imports
// We need to change expandedSection state type
// We need to add sensors and handleDragEnd
// We need to wrap the content tab with DndContext and SortableContext
// We need to split personal into personalDetails and summary

let newContent = content;

// 1. Add dnd-kit imports
const dndImports = `import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';\n`;

newContent = newContent.replace("import { GoogleGenAI, Type } from '@google/genai';", "import { GoogleGenAI, Type } from '@google/genai';\n" + dndImports);

// 2. Add GripVertical to lucide-react imports
newContent = newContent.replace("import { Plus, Trash2, Loader2, Upload, User, Briefcase, GraduationCap, Wrench, Palette, Star, FileText, BookOpen, Globe, FolderGit2, Trophy, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Layout, Image as ImageIcon } from 'lucide-react';", "import { Plus, Trash2, Loader2, Upload, User, Briefcase, GraduationCap, Wrench, Palette, Star, FileText, BookOpen, Globe, FolderGit2, Trophy, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Layout, Image as ImageIcon, GripVertical } from 'lucide-react';");

// 3. Change expandedSection state type
newContent = newContent.replace("const [expandedSection, setExpandedSection] = useState<'personal' | 'experience' | 'education' | 'skills' | 'courses' | 'languages' | 'projects' | 'awards' | null>('personal');", "const [expandedSection, setExpandedSection] = useState<string | null>('personalDetails');");

// 4. Add sensors and handleDragEnd inside CVForm
const sensorsAndDragEnd = `
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCvData((prev) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id as string);
        const newIndex = prev.sectionOrder.indexOf(over.id as string);
        return {
          ...prev,
          sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex),
        };
      });
    }
  };
`;

newContent = newContent.replace("const fileInputRef = useRef<HTMLInputElement>(null);", "const fileInputRef = useRef<HTMLInputElement>(null);\n" + sensorsAndDragEnd);

// 5. Replace AccordionSection with SortableAccordionSection
const oldAccordionSection = `  const AccordionSection = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children: React.ReactNode }) => {
    const isOpen = expandedSection === id;
    return (
      <div className="border border-gray-200 rounded-xl mb-4 bg-white overflow-hidden shadow-sm">
        <button
          onClick={() => setExpandedSection(isOpen ? null : id as any)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center font-semibold text-gray-800">
            <Icon size={18} className="mr-2 text-blue-600" />
            {title}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>
        {isOpen && <div className="p-5 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">{children}</div>}
      </div>
    );
  };`;

const newAccordionSection = `  const SortableAccordionSection = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children: React.ReactNode }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : 1,
    };

    const isOpen = expandedSection === id;
    
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className={\`border border-gray-200 rounded-xl mb-4 bg-white overflow-hidden shadow-sm \${isDragging ? 'opacity-50 shadow-lg relative' : ''}\`}
      >
        <div className="w-full flex items-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <div 
            {...attributes} 
            {...listeners} 
            className="p-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex items-center justify-center"
          >
            <GripVertical size={18} />
          </div>
          <button
            onClick={() => setExpandedSection(isOpen ? null : id)}
            className="flex-1 flex items-center justify-between p-4 pl-0"
          >
            <div className="flex items-center font-semibold text-gray-800">
              <Icon size={18} className="mr-2 text-blue-600" />
              {title}
            </div>
            {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
          </button>
        </div>
        {isOpen && <div className="p-5 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">{children}</div>}
      </div>
    );
  };`;

newContent = newContent.replace(oldAccordionSection, newAccordionSection);

// 6. Split personal into personalDetails and summary
// We will extract the content of personal section and split it.
const personalSectionRegex = /<AccordionSection id="personal" title="Personal Information" icon=\{User\}>([\s\S]*?)<\/AccordionSection>/;
const personalMatch = newContent.match(personalSectionRegex);

if (personalMatch) {
  const personalContent = personalMatch[1];
  
  // Find the summary part
  const summaryRegex = /<div className="md:col-span-2">\s*<label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary<\/label>[\s\S]*?<\/div>/;
  const summaryMatch = personalContent.match(summaryRegex);
  
  if (summaryMatch) {
    const summaryContent = summaryMatch[0];
    const personalDetailsContent = personalContent.replace(summaryContent, '');
    
    const newPersonalDetailsSection = `<SortableAccordionSection id="personalDetails" title="Personal Details" icon={User}>${personalDetailsContent}</SortableAccordionSection>`;
    const newSummarySection = `<SortableAccordionSection id="summary" title="Professional Summary" icon={FileText}>\n              <div className="grid grid-cols-1 gap-5">\n                ${summaryContent}\n              </div>\n            </SortableAccordionSection>`;
    
    newContent = newContent.replace(personalMatch[0], newPersonalDetailsSection + '\n            ' + newSummarySection);
  }
}

// 7. Replace all other AccordionSection with SortableAccordionSection
newContent = newContent.replace(/<AccordionSection/g, '<SortableAccordionSection');
newContent = newContent.replace(/<\/AccordionSection>/g, '</SortableAccordionSection>');

// 8. Wrap the content tab with DndContext and SortableContext
// The content tab is inside:
// {activeMainTab === 'content' && (
//   <div className="animate-in fade-in duration-300">
//     <SortableAccordionSection ...
// We need to extract all SortableAccordionSections and put them in a map, then render them based on sectionOrder.

const sectionsRegex = /(<SortableAccordionSection id="([^"]+)"[\s\S]*?<\/SortableAccordionSection>)/g;
const sectionsMap = {};
let match;
while ((match = sectionsRegex.exec(newContent)) !== null) {
  sectionsMap[match[2]] = match[1];
}

// Now replace the entire content of the content tab
const contentTabRegex = /{activeMainTab === 'content' && \(\s*<div className="animate-in fade-in duration-300">[\s\S]*?<\/div>\s*\)}/;

const newContentTab = `{activeMainTab === 'content' && (
          <div className="animate-in fade-in duration-300">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cvData.sectionOrder} strategy={verticalListSortingStrategy}>
                {cvData.sectionOrder.map((sectionKey) => {
                  switch (sectionKey) {
                    case 'personalDetails':
                      return (
                        ${sectionsMap['personalDetails']}
                      );
                    case 'summary':
                      return (
                        ${sectionsMap['summary']}
                      );
                    case 'experience':
                      return (
                        ${sectionsMap['experience']}
                      );
                    case 'education':
                      return (
                        ${sectionsMap['education']}
                      );
                    case 'skills':
                      return (
                        ${sectionsMap['skills']}
                      );
                    case 'courses':
                      return (
                        ${sectionsMap['courses']}
                      );
                    case 'languages':
                      return (
                        ${sectionsMap['languages']}
                      );
                    case 'projects':
                      return (
                        ${sectionsMap['projects']}
                      );
                    case 'awards':
                      return (
                        ${sectionsMap['awards']}
                      );
                    default:
                      return null;
                  }
                })}
              </SortableContext>
            </DndContext>
          </div>
        )}`;

newContent = newContent.replace(contentTabRegex, newContentTab);

fs.writeFileSync('src/components/CVForm.tsx', newContent);
