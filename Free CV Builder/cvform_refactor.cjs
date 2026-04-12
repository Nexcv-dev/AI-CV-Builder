const fs = require('fs');
let content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

// Add imports
content = content.replace(
  "import { Plus, Trash2, Loader2, Upload, User, Briefcase, GraduationCap, Wrench, Palette, Star, FileText, BookOpen, Globe, FolderGit2, Trophy, ChevronDown, ChevronUp, Image as ImageIcon, GripVertical } from 'lucide-react';",
  "import { Plus, Trash2, Loader2, Upload, User, Briefcase, GraduationCap, Wrench, Palette, Star, FileText, BookOpen, Globe, FolderGit2, Trophy, ChevronDown, ChevronUp, Image as ImageIcon, GripVertical, Target, CheckCircle2 } from 'lucide-react';"
);

// Add state for analyzing
content = content.replace(
  "const [activeMainTab, setActiveMainTab] = useState<'content' | 'design'>('content');",
  "const [activeMainTab, setActiveMainTab] = useState<'content' | 'design'>('content');\n  const [isAnalyzing, setIsAnalyzing] = useState(false);"
);

// Add handleAnalyzeATS function
const handleAnalyzeATSRegex = /  const handleAIRewrite = async/;
const handleAnalyzeATSCode = `  const handleAnalyzeATS = async () => {
    if (!cvData.jobDescription) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = \`Analyze this CV against the following Job Description.
      Return a JSON object with two properties:
      1. "score": a number from 0 to 100 representing the match percentage.
      2. "feedback": an array of exactly 3 strings, each being a bullet point on how to improve the CV for this job.
      
      Job Description:
      \${cvData.jobDescription}
      
      CV Data:
      \${JSON.stringify(cvData.personalInfo)}
      \${JSON.stringify(cvData.experience)}
      \${JSON.stringify(cvData.education)}
      \${JSON.stringify(cvData.skills)}\`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'feedback']
          }
        }
      });
      
      const result = JSON.parse(response.text);
      setCvData(prev => ({ ...prev, atsScore: result.score, atsFeedback: result.feedback }));
    } catch (error) {
      console.error("Error analyzing ATS score:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIRewrite = async`;

content = content.replace(handleAnalyzeATSRegex, handleAnalyzeATSCode);

// Add title input at the top of the form
const titleInputCode = `
        <div className="p-6 border-b border-gray-200 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-1">CV Title</label>
          <input
            type="text"
            value={cvData.title || ''}
            onChange={(e) => setCvData({ ...cvData, title: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-semibold text-lg"
            placeholder="e.g., Senior Frontend Developer"
          />
        </div>
`;

content = content.replace(
  /<div className="flex border-b border-gray-200 bg-white sticky top-0 z-20">/,
  titleInputCode + '        <div className="flex border-b border-gray-200 bg-white sticky top-0 z-20">'
);

// Add Optimize for Job section
const optimizeSectionCode = `
                      <SortableAccordionSection key="optimize" id="optimize" title="Optimize for Job" icon={Target} isOpen={expandedSection === 'optimize'} onToggle={() => setExpandedSection(expandedSection === 'optimize' ? null : 'optimize')}>
                        <div className="p-5 border-t border-gray-100 bg-blue-50/30">
                          <p className="text-sm text-gray-600 mb-4">Paste the job description you are applying for to get an AI-powered ATS score and improvement suggestions.</p>
                          <textarea
                            value={cvData.jobDescription || ''}
                            onChange={(e) => setCvData({ ...cvData, jobDescription: e.target.value })}
                            placeholder="Paste Job Description here..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 min-h-[150px] mb-4"
                          />
                          <button
                            type="button"
                            onClick={handleAnalyzeATS}
                            disabled={isAnalyzing || !cvData.jobDescription}
                            className="flex items-center justify-center w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAnalyzing ? (
                              <><Loader2 size={18} className="mr-2 animate-spin" /> Analyzing...</>
                            ) : (
                              <><Target size={18} className="mr-2" /> Analyze CV Score</>
                            )}
                          </button>

                          {cvData.atsScore !== undefined && (
                            <div className="mt-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-800">ATS Match Score</h4>
                                <div className={\`text-2xl font-bold \${cvData.atsScore >= 80 ? 'text-green-600' : cvData.atsScore >= 60 ? 'text-yellow-600' : 'text-red-600'}\`}>
                                  {cvData.atsScore}%
                                </div>
                              </div>
                              
                              {cvData.atsFeedback && cvData.atsFeedback.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-3">Improvement Suggestions:</h5>
                                  <ul className="space-y-2">
                                    {cvData.atsFeedback.map((feedback, idx) => (
                                      <li key={idx} className="flex items-start text-sm text-gray-600">
                                        <CheckCircle2 size={16} className="text-blue-500 mr-2 mt-0.5 shrink-0" />
                                        <span>{feedback}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </SortableAccordionSection>
`;

content = content.replace(
  /<SortableAccordionSection key="personalDetails"/,
  optimizeSectionCode + '                      <SortableAccordionSection key="personalDetails"'
);

fs.writeFileSync('src/components/CVForm.tsx', content);
