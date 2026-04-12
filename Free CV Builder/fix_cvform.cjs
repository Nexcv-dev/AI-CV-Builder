const fs = require('fs');
let content = fs.readFileSync('src/components/CVForm.tsx', 'utf8');

// Remove the wrongly placed optimize section
const optimizeSectionRegex = /<SortableAccordionSection key="optimize"[\s\S]*?<\/SortableAccordionSection>\n                      <SortableAccordionSection key="personalDetails"/;
content = content.replace(optimizeSectionRegex, '<SortableAccordionSection key="personalDetails"');

// Now insert it correctly, outside the DndContext, right after the title input
const optimizeSectionCode = `
        <div className="px-6 py-4">
          <div className="border border-blue-200 rounded-xl mb-6 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'optimize' ? null : 'optimize')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center font-semibold text-blue-800">
                <Target size={18} className="mr-2 text-blue-600" />
                Optimize for Job (AI ATS Scoring)
              </div>
              <ChevronDown size={18} className={\`text-blue-500 transition-transform duration-300 \${expandedSection === 'optimize' ? 'rotate-180' : ''}\`} />
            </button>
            
            {expandedSection === 'optimize' && (
              <div className="p-5 border-t border-blue-100 bg-white">
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
                  <div className="mt-6 bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
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
            )}
          </div>
        </div>
`;

content = content.replace(
  /<div className="animate-in fade-in duration-300">/,
  `<div className="animate-in fade-in duration-300">\n${optimizeSectionCode}`
);

fs.writeFileSync('src/components/CVForm.tsx', content);
