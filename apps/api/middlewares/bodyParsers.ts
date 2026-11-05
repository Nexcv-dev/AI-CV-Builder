import express, { type Express, type Request, type Response, type NextFunction } from 'express';

const defaultJsonParser = express.json({ limit: '1mb' });
export const cvImportJsonParser = express.json({ limit: '14mb' });
export const pdfJsonParser = express.json({ limit: '5mb' });
export const imageUploadJsonParser = express.json({ limit: '2mb' });
export const htmlPdfJsonParser = express.json({ limit: '300kb' });
export const adminTemplateJsonParser = express.json({ limit: '6mb' });

export const configureDefaultJsonParser = (app: Express) => {
    // Default JSON limit for most endpoints. Larger payloads are allowed only on specific routes.
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path === '/api/parse-cv' || req.path === '/api/generate-pdf' || req.path === '/api/pdf-jobs' || req.path === '/api/profile-images' || req.path === '/api/html-pdf-jobs' || req.path === '/api/lemonsqueezy/webhook' || req.path.startsWith('/api/admin/templates')) {
            return next();
        }
        return defaultJsonParser(req, res, next);
    });
};
