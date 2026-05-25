# Contributing to NexCV

Thank you for your interest in contributing to NexCV! We welcome pull requests, bug reports, and feature suggestions.

## 1. Getting Started

### Prerequisites
*   Node.js (v18+)
*   MongoDB (Local instance or Atlas URI)
*   Git

### Local Setup
1.  Fork and clone the repository.
2.  Navigate to the main application directory:
    ```bash
    cd "Free CV Builder"
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Create a `.env` file based on the examples provided in the `README.md`.
5.  Start the development servers (runs both React and Express concurrently):
    ```bash
    npm run dev:all
    ```

## 2. Development Workflow

### Branching Strategy
*   `main` is the stable production branch.
*   Create feature branches off `main` (e.g., `feature/add-new-template`, `bugfix/fix-pdf-timeout`).

### Code Style & Linting
*   This project uses TypeScript and ESLint.
*   Before committing, always ensure your code passes the linting checks:
    ```bash
    npm run lint
    ```
*   Format your code using Prettier (if configured in your IDE).

### Testing
*   We use Vitest for both frontend and backend testing.
*   To run the test suite:
    ```bash
    npm run test:run
    ```
*   If you add a new feature, please include relevant tests. If you fix a bug, add a test that prevents regression.

## 3. Making a Pull Request (PR)
1.  Commit your changes with clear, descriptive commit messages.
2.  Push your branch to your fork.
3.  Open a Pull Request against the `main` branch of this repository.
4.  In your PR description, clearly explain:
    *   What problem you are solving.
    *   How you solved it.
    *   Any new environment variables or dependencies introduced.
5.  Wait for a maintainer to review your code.

## 4. Reporting Bugs
If you find a bug but cannot fix it yourself, please open an Issue. Provide:
*   Steps to reproduce the bug.
*   Expected behavior vs. actual behavior.
*   Browser and OS version.
*   Any relevant error logs from the browser console or server terminal.
