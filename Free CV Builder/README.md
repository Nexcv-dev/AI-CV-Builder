<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/543e310e-acdb-4619-8c9a-e7f4e2ff2b9a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing

The project uses **Vitest** for unit testing and **v8** for code coverage reporting.

### Running Tests
- Run all tests: `npm run test`
- Run tests once (CI mode): `npm run test:run`
- Run tests with coverage report: `npm run test:coverage`

### What's Covered
The test suite includes 19 unit tests covering:
- **Backend Logic**: Sanitization of input text, secure HTML generation for PDF templates, and data escaping.
- **Frontend Components**: Rendering of CV profiles, template-specific layout validation (Modern, Classic, Professional), and library-agnostic component behavior.
- **Rich Text Editor**: Value management and change event handling.

Coverage reports are generated in the `coverage/` directory after running the coverage command.
