const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
content = content.replace(
  "import CVPreview from './components/CVPreview';",
  "import CVPreview from './components/CVPreview';\nimport Dashboard from './components/Dashboard';"
);

// Add states
const stateRegex = /export default function App\(\) \{\n  const \[cvData, setCvData\] = useState<CVData>\(initialData\);\n  const \[template, setTemplate\] = useState<'classic' \| 'modern'>\('classic'\);\n  const \[isGeneratingPDF, setIsGeneratingPDF\] = useState\(false\);\n  const \[mobileView, setMobileView\] = useState<'edit' \| 'preview'>\('edit'\);\n  const \[scale, setScale\] = useState\(1\);/m;

const newStates = `export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [cvs, setCvs] = useState<CVData[]>(() => {
    const saved = localStorage.getItem('savedCVs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved CVs', e);
      }
    }
    return [initialData];
  });
  const [cvData, setCvData] = useState<CVData>(initialData);
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(1);

  // Auto-save effect
  useEffect(() => {
    if (view === 'editor') {
      setCvs(prev => {
        const updated = prev.map(cv => cv.id === cvData.id ? { ...cvData, lastModified: Date.now() } : cv);
        localStorage.setItem('savedCVs', JSON.stringify(updated));
        return updated;
      });
    }
  }, [cvData, view]);

  // Save on cvs change
  useEffect(() => {
    localStorage.setItem('savedCVs', JSON.stringify(cvs));
  }, [cvs]);

  const handleCreateNew = () => {
    const newCV: CVData = {
      ...initialData,
      id: Date.now().toString(),
      title: 'Untitled CV',
      lastModified: Date.now(),
    };
    setCvs(prev => [newCV, ...prev]);
    setCvData(newCV);
    setView('editor');
  };

  const handleEdit = (id: string) => {
    const cvToEdit = cvs.find(cv => cv.id === id);
    if (cvToEdit) {
      setCvData(cvToEdit);
      setView('editor');
    }
  };

  const handleDuplicate = (id: string) => {
    const cvToDuplicate = cvs.find(cv => cv.id === id);
    if (cvToDuplicate) {
      const newCV: CVData = {
        ...cvToDuplicate,
        id: Date.now().toString(),
        title: \`\${cvToDuplicate.title} (Copy)\`,
        lastModified: Date.now(),
      };
      setCvs(prev => [newCV, ...prev]);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this CV?')) {
      setCvs(prev => prev.filter(cv => cv.id !== id));
    }
  };

  const handleDownloadFromDashboard = async (cv: CVData) => {
    setCvData(cv);
    setView('editor');
    setTimeout(() => {
      // We can't directly call handleDownloadPDF here because it's defined later,
      // but we can just switch to editor and let the user click download.
    }, 100);
  };
`;

content = content.replace(stateRegex, newStates);

// Update render
const renderRegex = /return \([\s\S]*?\);\n\}/m;

const newRender = `return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden print:h-auto print:bg-white print:overflow-visible">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between p-4 sm:px-8 sm:h-16 shrink-0 z-10 print:hidden gap-4 sm:gap-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center cursor-pointer" onClick={() => setView('dashboard')}>
            <LayoutTemplate className="mr-2 text-blue-600" />
            CV Builder
          </h1>
          
          {/* Mobile View Toggle */}
          {view === 'editor' && (
            <div className="flex lg:hidden bg-gray-100 p-1 rounded-lg border border-gray-200 ml-4">
              <button
                onClick={() => setMobileView('edit')}
                className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${mobileView === 'edit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}\`}
              >
                Edit
              </button>
              <button
                onClick={() => setMobileView('preview')}
                className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${mobileView === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}\`}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        
        {view === 'editor' && (
          <div className="flex flex-wrap items-center justify-center gap-3 sm:space-x-6 w-full sm:w-auto">
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setTemplate('classic')}
                className={\`px-4 py-1.5 text-sm font-medium rounded-md transition-colors \${template === 'classic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}\`}
              >
                Classic
              </button>
              <button
                onClick={() => setTemplate('modern')}
                className={\`px-4 py-1.5 text-sm font-medium rounded-md transition-colors \${template === 'modern' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}\`}
              >
                Modern
              </button>
            </div>
            
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Download size={18} className="mr-2" />
              )}
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {view === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto">
          <Dashboard
            cvs={cvs}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onDownload={handleDownloadFromDashboard}
          />
        </div>
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col lg:flex-row print:block print:overflow-visible">
          {/* Left Panel - Form */}
          <div className={\`w-full lg:w-1/2 h-full overflow-y-auto border-r border-gray-200 bg-white print:hidden \${mobileView === 'preview' ? 'hidden lg:block' : 'block'}\`}>
            <CVForm cvData={cvData} setCvData={setCvData} />
          </div>
          
          {/* Right Panel - Preview */}
          <div 
            className={\`w-full lg:w-1/2 h-full overflow-y-auto bg-gray-100 p-4 sm:p-8 print:w-full print:p-0 print:bg-white print:block \${mobileView === 'edit' ? 'hidden lg:block' : 'block'}\`}
          >
            <div 
              ref={previewContainerRef}
              className="max-w-[210mm] mx-auto origin-top transition-transform duration-200 ease-in-out print:transform-none print:max-w-none"
              style={{ transform: \`scale(\${scale})\`, transformOrigin: 'top center' }}
            >
              <div ref={contentRef} className="shadow-2xl print:shadow-none bg-white">
                <CVPreview data={cvData} template={template} />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}`;

content = content.replace(renderRegex, newRender);

fs.writeFileSync('src/App.tsx', content);
