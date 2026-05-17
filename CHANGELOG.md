# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-17

### Added
- **Startup Template**: Added a new modern CV template layout (`startup`) with unique structural styling.
- **Minimalist Template**: Added a clean, spacious, typography-focused `minimalist` template option.
- **Billing & Payments**: Integrated fully fledged pricing and plan management models (`userPlan`, `cvQuota`, `CvCreationQuotaModel`, `DownloadQuotaModel`).
- **Pricing & Checkout Pages**: Created `PricingPage.tsx` and `CheckoutPage.tsx` with full support for PayHere payment gateways (including official high-visibility dark/long banner integration).
- **Refund Policy Page**: Added `RefundPolicy.tsx` to handle standard refund compliance along with dynamic `/refund-policy` routing.
- **Micro-animations**: Dynamic sliding gradient underline hover effect (`.nav-link-hover`) added to header navigation links.
- **Quality Assurance**: Added Vitest test suites (`CVForm_logic.test.tsx`, `CVPreview.test.tsx`, and backend `pdf_generation.test.ts`) covering CV creation state, side-by-side builder live layouts, and Puppeteer server-side PDF exports.
- **Stand-alone Mockup Templates**: Added 7 full HTML/Tailwind templates in the root folder (`bold`, `creative`, `elegant`, `executive`, `split`, `startup`, and `studio`) for layout preview testing and visual design iteration.

### Changed
- **Autofill Dark Theme Support**: Added key CSS overrides in `index.css` to prevent default browser autofill behavior from turning form input backgrounds white in dark mode.
- **Mobile Responsive Layouts**: Set checkout page input font sizes to `16px` to prevent default iOS/Android zoom-focus alignments.
- **Distraction-Free Layouts**: Dynamically hid the global application footer on key conversion page routes (Checkout, Reset Password, Dashboard).
- **Monthly Plan Pricing Wording**: Synced "30 days" text to "LKR 2199" in builder upgrade prompts and synchronized pricing plans between Home and Landing views.

### Fixed
- **Text Wrapping**: Resolved critical rendering bugs across multiple fields (Experience, Education, Projects, and Skills descriptions) where long inputs did not break/wrap and overflowed template borders.
- **Reset Password Robustness**: Fixed authentication email reset flows to include strict verification checks, loading indicators, and error-handling popups.
