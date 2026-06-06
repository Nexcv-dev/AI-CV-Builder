import CvImportJob, { ICvImportJob } from '../server-models/CvImportJob';
import { enqueueCvImportJob, isCvImportQueueConfigured } from './cvImportQueueService';

const CV_IMPORT_JOB_TTL_MS = Number(process.env.CV_IMPORT_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const UNCLEAR_CV_IMPORT_MESSAGE = 'We could not find clear resume details in this file. Please upload a clearer resume, a text-based PDF, or a LinkedIn profile PDF.';
const UNREADABLE_CV_IMPORT_MESSAGE = 'We could not read enough text from this file. Try a clearer image, a text-based PDF, or a LinkedIn profile PDF.';

const friendlyCvImportJobError = (error: any) => {
    const message = String(error?.message || '').trim();
    if (!message) return UNCLEAR_CV_IMPORT_MESSAGE;
    if (/could not read enough text/i.test(message)) return UNREADABLE_CV_IMPORT_MESSAGE;
    if (/No data returned|JSON|Unexpected token|Failed to process document|model|gemini|ai service|parse/i.test(message)) {
        return UNCLEAR_CV_IMPORT_MESSAGE;
    }
    return message;
};

export const cvImportJobExpiresAt = () => new Date(Date.now() + CV_IMPORT_JOB_TTL_MS);

export const createCvImportJob = async ({
    userId,
    base64Data,
    mimeType,
    quotaReserved,
}: {
    userId: string;
    base64Data: string;
    mimeType: string;
    quotaReserved: boolean;
}) => CvImportJob.create({
    userId,
    base64Data,
    mimeType,
    quotaReserved,
    status: 'queued',
    expiresAt: cvImportJobExpiresAt(),
});

export const queueCvImportJob = async (job: ICvImportJob) => {
    if (!isCvImportQueueConfigured()) return false;
    await enqueueCvImportJob(String(job._id));
    return true;
};

const aiImportSchema = (Type: any) => ({
    type: Type.OBJECT,
    properties: {
        personalInfo: {
            type: Type.OBJECT,
            properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                address: { type: Type.STRING },
                summary: { type: Type.STRING },
                dob: { type: Type.STRING },
                nic: { type: Type.STRING },
                gender: { type: Type.STRING },
                nationality: { type: Type.STRING },
                religion: { type: Type.STRING },
                maritalStatus: { type: Type.STRING },
            },
        },
        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING },
                    position: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
            },
        },
        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
            },
        },
        skills: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    level: { type: Type.INTEGER, description: '1 to 5' },
                    category: { type: Type.STRING, description: 'e.g., Frontend, Backend, Tools, Soft Skills' },
                },
            },
        },
        courses: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    institution: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                },
            },
        },
        languages: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    proficiency: { type: Type.STRING },
                },
            },
        },
        projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    link: { type: Type.STRING },
                },
            },
        },
        awards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    date: { type: Type.STRING },
                    issuer: { type: Type.STRING },
                },
            },
        },
        references: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    position: { type: Type.STRING },
                    company: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                },
            },
        },
    },
});

export const processCvImportJob = async (jobId: string, deps: Record<string, any>) => {
    const {
        User,
        Type,
        extractCvText,
        generateGeminiText,
        isPaidPlan,
        parseCvTextToStructuredData,
        rollbackCvImportQuota,
        sanitizeTextForPrompt,
        withImportMeta,
        logError,
        logEvent,
    } = deps;

    const job = await CvImportJob.findOneAndUpdate(
        { _id: jobId, status: 'queued' },
        { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
    );
    if (!job) return null;

    try {
        if (!job.base64Data) throw new Error('Import file data is missing.');

        const user = await User.findById(job.userId);
        if (!user) throw new Error('Import user was not found.');

        const { text: extractedText, usedOcr, ocrProvider, parsedCv, structuredProvider } = await extractCvText(job.base64Data, job.mimeType);
        const basicResult = parsedCv || parseCvTextToStructuredData(extractedText || '');

        let result: Record<string, any>;
        if (parsedCv) {
            result = withImportMeta(basicResult, {
                source: 'ai',
                extractedTextLength: extractedText.length,
                usedAi: true,
                usedOcr,
                ocrProvider,
                structuredProvider: structuredProvider || 'aws-lambda-ai',
                message: 'AI import completed in OCR Lambda.',
            });
        } else if (!isPaidPlan(user) || !process.env.GEMINI_API_KEY) {
            if (!extractedText.trim()) {
                throw new Error(UNREADABLE_CV_IMPORT_MESSAGE);
            }
            result = withImportMeta(basicResult, {
                source: 'basic',
                extractedTextLength: extractedText.length,
                usedAi: false,
                usedOcr,
                ocrProvider,
                structuredProvider: structuredProvider || 'app-basic',
                message: !process.env.GEMINI_API_KEY && isPaidPlan(user)
                    ? 'AI import is not configured, so basic extraction was used.'
                    : 'Basic import completed. Review each section before saving.',
            });
        } else {
            const prompt = `Extract the resume data from this CV/Resume document.
              Return a JSON object that strictly matches the following structure.
              Only put data into a section when it clearly belongs to that CV section.
              Do not move unrelated text into experience, education, skills, projects, courses, awards, languages, or references.
              For arrays like experience, education, skills, courses, languages, projects, and awards, extract only relevant details.
              Ensure dates are in a readable format (e.g., "Jan 2020", "2015").
              If a field is not found, leave it as an empty string or empty array.`;

            try {
                const jsonStr = await generateGeminiText(
                    [
                        {
                            inlineData: {
                                data: job.base64Data,
                                mimeType: job.mimeType,
                            },
                        },
                        ...(extractedText.trim()
                            ? [{ text: `OCR/text extraction fallback. Use this text only when it helps confirm the document content:\n${sanitizeTextForPrompt(extractedText)}` }]
                            : []),
                        prompt,
                    ],
                    {
                        responseMimeType: 'application/json',
                        responseSchema: aiImportSchema(Type),
                    }
                );
                if (!jsonStr) throw new Error('No data returned.');
                const cleanJson = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
                result = withImportMeta(JSON.parse(cleanJson), {
                    source: 'ai',
                    extractedTextLength: extractedText.length,
                    usedAi: true,
                    usedOcr,
                    ocrProvider,
                    structuredProvider: 'app-ai',
                    message: 'AI import completed.',
                });
            } catch (aiError) {
                logError?.('cv_import.job_ai_fallback', aiError, { usedOcr, extractedTextLength: extractedText.length, jobId: String(job._id) });
                if (!extractedText.trim()) throw aiError;
                result = withImportMeta(basicResult, {
                    source: 'basic',
                    extractedTextLength: extractedText.length,
                    usedAi: false,
                    usedOcr,
                    ocrProvider,
                    structuredProvider: structuredProvider || 'app-basic',
                    message: 'AI import failed, so basic OCR/text extraction was used.',
                });
            }
        }

        await CvImportJob.updateOne(
            { _id: job._id },
            {
                $set: {
                    status: 'ready',
                    result,
                    completedAt: new Date(),
                },
                $unset: { base64Data: '' },
            }
        );

        logEvent?.('info', 'cv_import.job_ready', {
            userId: String(job.userId),
            jobId: String(job._id),
            source: result.importMeta?.source,
        });
        return CvImportJob.findById(job._id);
    } catch (error: any) {
        await CvImportJob.updateOne(
            { _id: job._id },
            {
                $set: {
                    status: 'failed',
                    error: friendlyCvImportJobError(error).slice(0, 500),
                    completedAt: new Date(),
                },
                $unset: { base64Data: '' },
            }
        );
        if (job.quotaReserved) {
            const user = await User.findById(job.userId);
            if (user) await rollbackCvImportQuota(user).catch((rollbackError: any) => {
                logError?.('cv_import.job_quota_rollback_failed', rollbackError, { userId: String(job.userId), jobId: String(job._id) });
            });
        }
        logError?.('cv_import.job_failed', error, { userId: String(job.userId), jobId: String(job._id) });
        throw error;
    }
};

export const findUserCvImportJob = async (jobId: string, userId: string) => CvImportJob.findOne({ _id: jobId, userId });
