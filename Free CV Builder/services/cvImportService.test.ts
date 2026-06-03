import { describe, expect, it, vi } from 'vitest';
import { extractCvText, parseCvTextToStructuredData } from './cvImportService';

describe('cv import parser', () => {
  it('extracts clear section data while ignoring unrelated lines', () => {
    const parsed = parseCvTextToStructuredData(`
Jane Perera
jane@example.com
+94 77 123 4567

Experience
Software Engineer at NexCV Technologies
Jan 2022 - Present
Built resume import workflows.

Education
BSc Computer Science
University of Colombo
2018 - 2021

Skills
React, TypeScript, AWS
This is a long sentence that should not become a skill.

Languages
English - Fluent
Sinhala - Native
`);

    expect(parsed.personalInfo.fullName).toBe('Jane Perera');
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Software Engineer',
        company: 'NexCV Technologies',
        startDate: 'Jan 2022',
        endDate: 'Present',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'BSc Computer Science',
        institution: 'University of Colombo',
      }),
    ]);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(['React', 'TypeScript', 'AWS']);
    expect(parsed.languages).toEqual([
      { name: 'English', proficiency: 'Fluent' },
      { name: 'Sinhala', proficiency: 'Native' },
    ]);
  });

  it('does not force ambiguous OCR lines into structured sections', () => {
    const parsed = parseCvTextToStructuredData(`
Experience
Completed Bachelor of Information Technology
University of Moratuwa
2019 - 2022

Education
Worked with customers and improved daily operations.

Skills
Managed customer requests and prepared monthly sales reports.
2020 - 2023

References
Available upon request
`);

    expect(parsed.experience).toEqual([]);
    expect(parsed.education).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.references).toEqual([]);
  });

  it('keeps sidebar personal data out of two-column work and education sections', () => {
    const parsed = parseCvTextToStructuredData(`
DETAILS
jane.doe@exam
ple.com
+1 234 567 890
New York, NY

PERSONAL INFO
1990-01-01
199012345678
FEMALE
AMERICAN
CHRISTIANITY
SINGLE

SKILLS
JAVASCRIPT
TYPESCRIPT
REACT
NODE.JS
TAILWIND CSS
GIT

JANE DOE
PROFILE
A highly motivated and detail-oriented professional with experience in software development and project management.

EXPERIENCE
Jan 2020 - Present
0
AMERICAN
CHRISTIANITY
Senior Software Engineer
Tech Solutions Inc.
Led a team of 5 engineers to develop a scalable web application.

EDUCATION
Sep 2015 - May 2019
Bachelor of Science in Computer Science
State University
Graduated with Honors. Coursework included Data Structures, Algorithms, and Web Development.
TAILWIND CSS GIT
`);

    expect(parsed.personalInfo.fullName).toBe('Jane Doe');
    expect(parsed.personalInfo.email).toBe('jane.doe@example.com');
    expect(parsed.personalInfo.phone).toBe('+1 234 567 890');
    expect(parsed.personalInfo.nic).toBe('199012345678');
    expect(parsed.personalInfo.gender).toBe('FEMALE');
    expect(parsed.personalInfo.nationality).toBe('AMERICAN');
    expect(parsed.personalInfo.religion).toBe('CHRISTIANITY');
    expect(parsed.personalInfo.maritalStatus).toBe('SINGLE');
    expect(parsed.personalInfo.summary).toBe('A highly motivated and detail-oriented professional with experience in software development and project management.');
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Senior Software Engineer',
        company: 'Tech Solutions Inc.',
        startDate: 'Jan 2020',
        endDate: 'Present',
        description: '<ul><li>Led a team of 5 engineers to develop a scalable web application.</li></ul>',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'Bachelor of Science in Computer Science',
        institution: 'State University',
        description: '<ul><li>Graduated with Honors. Coursework included Data Structures, Algorithms, and Web Development.</li></ul>',
      }),
    ]);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(['JavaScript', 'TypeScript', 'React', 'Node.js', 'Tailwind CSS', 'Git']);
  });

  it('splits multiple experience and education entries into separate records', () => {
    const parsed = parseCvTextToStructuredData(`
EXPERIENCE
Senior Software Engineer
Tech Solutions Inc.
Jan 2020 - Present
Led platform migration work.

Frontend Developer
Creative Apps Ltd.
Jun 2017 - Dec 2019
Built React dashboards.

EDUCATION
Bachelor of Science in Computer Science
State University
Sep 2015 - May 2019
Graduated with Honors.

Diploma in Software Engineering
Tech Institute
Jan 2014 - Dec 2014
Completed practical software training.
`);

    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Senior Software Engineer',
        company: 'Tech Solutions Inc.',
        startDate: 'Jan 2020',
        endDate: 'Present',
        description: '<ul><li>Led platform migration work.</li></ul>',
      }),
      expect.objectContaining({
        position: 'Frontend Developer',
        company: 'Creative Apps Ltd.',
        startDate: 'Jun 2017',
        endDate: 'Dec 2019',
        description: '<ul><li>Built React dashboards.</li></ul>',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'Bachelor of Science in Computer Science',
        institution: 'State University',
        startDate: 'Sep 2015',
        endDate: 'May 2019',
        description: '<ul><li>Graduated with Honors.</li></ul>',
      }),
      expect.objectContaining({
        degree: 'Diploma in Software Engineering',
        institution: 'Tech Institute',
        startDate: 'Jan 2014',
        endDate: 'Dec 2014',
        description: '<ul><li>Completed practical software training.</li></ul>',
      }),
    ]);
  });

  it('keeps multiple body lines as rich-text bullets', () => {
    const parsed = parseCvTextToStructuredData(`
EXPERIENCE
Senior Software Engineer
Tech Solutions Inc.
Jan 2020 - Present
Led a team of 5 engineers to develop a scalable web application.
Mentored junior developers and conducted code reviews.
Improved system performance by 30%.
`);

    expect(parsed.experience[0].description).toBe(
      '<ul><li>Led a team of 5 engineers to develop a scalable web application.</li><li>Mentored junior developers and conducted code reviews.</li><li>Improved system performance by 30%.</li></ul>'
    );
  });

  it('parses the Bimantha-style compact CV layout', () => {
    const parsed = parseCvTextToStructuredData(`
BIMANTHA PERERA
Address: 47/G/9 Samithpura Mattakuliya Co.15
Phone: 072 696 2288 / 077 544 9755
Email: www.bimanthaperera@gmail.com

PROFESSIONAL SUMMARY
A creative and driven professional with skills in software engineering, graphic design, and content creation. I enjoy solving problems by combining technical and creative thinking. Passionate about learning, mentoring, and helping others grow. Also interested in digital marketing and how technology supports business success.

EXPERIENCE
Transport Assistant
SITREK Group, Colombo 02
Sep 2024 - Present
Managed daily logistics operations and driver payment systems
Oversaw and maintained over 50+ GPS tracking devices to ensure accurate real-time vehicle monitoring
Resolved operational issues, improving efficiency and communication
Coordinated between management, drivers, and clients for seamless workflow
Leveraged Excel and TMS tools to enhance organization and reporting
Key Contributions:
Improved payment processing efficiency through automation
Enhanced client satisfaction scores
Reduced operational challenges
Mentored 6 junior staff, increasing their performance in six months

EDUCATION
Higher National Diploma (HND) in Software Engineering
ICBT Campus
Jan 2024 - Ongoing
GCE Advanced Level (A/L) - Biology, Physics, Chemistry
St. Benedict's College, Colombo-13
Jan 2020 - Jan 2022
GCE Ordinary Level (O/L)
Christ King College, Wattala

SKILLS
Technical: Java, HTML, C++, Python,
Tools: Microsoft Excel, TMS, Data Reconciliation
Soft Skills: Problem Solving, Stress Management, Leadership, Communication, Time Management
Languages: Sinhala, English, Tamil
Other: Graphic Design, Research, Documentation
`);

    expect(parsed.personalInfo.fullName).toBe('Bimantha Perera');
    expect(parsed.personalInfo.email).toBe('www.bimanthaperera@gmail.com');
    expect(parsed.personalInfo.phone).toBe('072 696 2288 / 077 544 9755');
    expect(parsed.personalInfo.address).toBe('47/G/9 Samithpura Mattakuliya Co.15');
    expect(parsed.personalInfo.summary).toContain('creative and driven professional');
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Transport Assistant',
        company: 'SITREK Group, Colombo 02',
        startDate: 'Sep 2024',
        endDate: 'Present',
      }),
    ]);
    expect(parsed.experience[0].description).toContain('<li>Managed daily logistics operations and driver payment systems</li>');
    expect(parsed.experience[0].description).toContain('<li>Improved payment processing efficiency through automation</li>');
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'Higher National Diploma (HND) in Software Engineering',
        institution: 'ICBT Campus',
        startDate: 'Jan 2024',
        endDate: 'Ongoing',
      }),
      expect.objectContaining({
        degree: 'GCE Advanced Level (A/L) - Biology, Physics, Chemistry',
        institution: "St. Benedict's College, Colombo-13",
        startDate: 'Jan 2020',
        endDate: 'Jan 2022',
      }),
      expect.objectContaining({
        degree: 'GCE Ordinary Level (O/L)',
        institution: 'Christ King College, Wattala',
      }),
    ]);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(expect.arrayContaining([
      'Java',
      'HTML',
      'C++',
      'Python',
      'Microsoft Excel',
      'TMS',
      'Problem Solving',
      'Leadership',
      'Graphic Design',
    ]));
    expect(parsed.languages.map((language) => language.name)).toEqual(['Sinhala', 'English', 'Tamil']);
  });

  it('parses sidebar career and academic CV layouts', () => {
    const parsed = parseCvTextToStructuredData(`
MARK SMITH
Head Teacher

CONTACT
Address
Daisyloom, St Pauls Square
Birmingham B18 6NY
Phone
0123 456 7890
Email
info@dayjob.com
LinkedIn
linkedin.com/yourname

PROFILE
Mark is an outgoing, ambitious, and confident individual, whose passion for head teaching is equally matched by his experience in it.

CAREER
2016 - Present
Head Teacher
School name
Responsible for assisting in the complete educational and social development of pupils under the direction and guidance of the head teacher.

2015 - 2016
Head Teacher
School name
Planning & delivering well structured lessons which engage & motivate students.

SKILLS
Developing and implementing continuous improvement in all teaching, educational and recreational processes.
Knowledge of related administrative & clerical procedures.

ACADEMIC
2011 - 2014
Course details
University name
2009 - 2011
Course details
College name
`);

    expect(parsed.personalInfo.fullName).toBe('Mark Smith');
    expect(parsed.personalInfo.email).toBe('info@dayjob.com');
    expect(parsed.personalInfo.phone).toBe('0123 456 7890');
    expect(parsed.experience.length).toBe(2);
    expect(parsed.experience[0]).toEqual(expect.objectContaining({
      position: 'Head Teacher',
      company: 'School name',
      startDate: '2016',
      endDate: 'Present',
    }));
    expect(parsed.experience[0].description).toContain('complete educational and social development');
    expect(parsed.education.length).toBe(2);
    expect(parsed.education[0]).toEqual(expect.objectContaining({
      degree: 'Course details',
      institution: 'University name',
      startDate: '2011',
      endDate: '2014',
    }));
  });

  it('parses header-line teacher CV layouts with core qualifications', () => {
    const parsed = parseCvTextToStructuredData(`
EMILY WILLIAMS
Bridgeport, CT 06606  (555) 555-5555  example@example.com

PERSONAL SUMMARY
Focused and attentive, recently graduated Ph.D. student, Assistant Professor of English experienced in cultivating welcoming and engaging learning environments.

CORE QUALIFICATIONS
Writing coursework
Student needs assessment
Class instruction
Student records management
Student research guidance
MS Office expertise
Outlook and Gmail
Tutoring

EDUCATION
Ph.D.: English Language And Literature
Yale University - New Haven, CT
Master of Arts: Writing
Albertus Magnus College - New Haven, CT
Bachelor of Arts: English
Southern Connecticut State University - New Haven, CT

WORK EXPERIENCE
ASSISTANT PROFESSOR OF ENGLISH 09/2019 to Current
Housatonic Community College, Bridgeport, CT
Provided guidance and supervision to 20 master's degree students while giving academic support to Professors and other faculty members.
Tracked materials and exercises to illustrate the application of course concepts.

ASSISTANT ENGLISH INSTRUCTOR 09/2016 to 06/2019
Sacred Heart University, Fairfield, CT
Evaluated college students' abilities and grasp of English language.
Evaluated and revised lesson plans and course content.
`);

    expect(parsed.personalInfo.fullName).toBe('Emily Williams');
    expect(parsed.personalInfo.email).toBe('example@example.com');
    expect(parsed.personalInfo.phone).toBe('(555) 555-5555');
    expect(parsed.personalInfo.summary).toContain('recently graduated Ph.D. student');
    expect(parsed.skills.map((skill) => skill.name)).toEqual(expect.arrayContaining([
      'Writing coursework',
      'Student needs assessment',
      'MS Office expertise',
      'Tutoring',
    ]));
    expect(parsed.education).toEqual([
      expect.objectContaining({ degree: 'Ph.D.: English Language And Literature', institution: 'Yale University - New Haven, CT' }),
      expect.objectContaining({ degree: 'Master of Arts: Writing', institution: 'Albertus Magnus College - New Haven, CT' }),
      expect.objectContaining({ degree: 'Bachelor of Arts: English', institution: 'Southern Connecticut State University - New Haven, CT' }),
    ]);
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'ASSISTANT PROFESSOR OF ENGLISH',
        company: 'Housatonic Community College, Bridgeport, CT',
        startDate: '09/2019',
        endDate: 'Current',
      }),
      expect.objectContaining({
        position: 'ASSISTANT ENGLISH INSTRUCTOR',
        company: 'Sacred Heart University, Fairfield, CT',
        startDate: '09/2016',
        endDate: '06/2019',
      }),
    ]);
    expect(parsed.experience[0].description).toContain('Provided guidance and supervision');
  });

  it('marks unsupported import input with no OCR provider', async () => {
    const result = await extractCvText(Buffer.from('hello').toString('base64'), 'text/plain');

    expect(result).toEqual({ text: '', usedOcr: false, ocrProvider: 'none' });
  });

  it('does not run local document parsing when AWS OCR is configured', async () => {
    const originalFunctionName = process.env.OCR_LAMBDA_FUNCTION_NAME;
    const originalUrl = process.env.OCR_LAMBDA_URL;
    process.env.OCR_LAMBDA_FUNCTION_NAME = 'test-ocr-lambda';
    delete process.env.OCR_LAMBDA_URL;
    vi.resetModules();

    const { extractCvText: extractWithAwsConfigured } = await import('./cvImportService');
    const imageResult = await extractWithAwsConfigured(Buffer.from('not an image').toString('base64'), 'image/png');
    const pdfResult = await extractWithAwsConfigured(Buffer.from('not a pdf').toString('base64'), 'application/pdf');

    expect(imageResult).toEqual({ text: '', usedOcr: false, ocrProvider: 'aws-lambda' });
    expect(pdfResult).toEqual({ text: '', usedOcr: false, ocrProvider: 'aws-lambda' });

    if (originalFunctionName === undefined) delete process.env.OCR_LAMBDA_FUNCTION_NAME;
    else process.env.OCR_LAMBDA_FUNCTION_NAME = originalFunctionName;
    if (originalUrl === undefined) delete process.env.OCR_LAMBDA_URL;
    else process.env.OCR_LAMBDA_URL = originalUrl;
    vi.resetModules();
  });
});
