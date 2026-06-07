import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlToPdf from './HtmlToPdf';

vi.mock('../components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

vi.mock('../components/AppShellHeader', () => ({
  AppShellHeader: () => <header data-testid="app-shell-header" />,
}));

vi.mock('../utils/api', () => ({
  ApiError: class ApiError extends Error {
    data?: unknown;
  },
  apiFetch: vi.fn(async () => ({
    quota: { limit: null, used: 0, remaining: null, reached: false },
  })),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/html-to-pdf']}>
      <HtmlToPdf />
    </MemoryRouter>,
  );
}

describe('HtmlToPdf preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows authoring rules and switches long readable PDFs with the pager', async () => {
    renderPage();

    expect(screen.getByText('HTML rules for best PDF output')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([`<html><head><style>
      body { margin: 0; background: white; }
      .page { width: 210mm; min-height: 297mm; padding: 18mm; }
    </style></head><body><main class="page"><section style="height:3360px">Three pages</section></main></body></html>`], 'three-pages.html', {
      type: 'text/html',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const frame = await screen.findByTitle('HTML PDF preview');
    expect(frame).toHaveAttribute('scrolling', 'no');
    expect(frame).toHaveAttribute('sandbox', expect.stringContaining('allow-same-origin'));
    expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('margin:0!important'));
    expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('body>.cv:first-child{margin-block:0!important;}'));
    expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('@page{size:A4;margin:0;}'));
    expect(frame.getAttribute('srcdoc')?.lastIndexOf('nexcv-preview-frame-style')).toBeGreaterThan(0);

    const documentElementSetProperty = vi.fn();
    const bodySetProperty = vi.fn();
    const firstBlock = document.createElement('main');
    Object.defineProperty(firstBlock, 'scrollHeight', { configurable: true, value: 3392 });
    Object.defineProperty(firstBlock, 'offsetHeight', { configurable: true, value: 3392 });
    firstBlock.getBoundingClientRect = vi.fn(() => ({
      bottom: 2200,
      height: 2200,
      left: 0,
      right: 794,
      top: 0,
      width: 794,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      value: {
        documentElement: { scrollHeight: 3392, offsetHeight: 3392, style: { setProperty: documentElementSetProperty } },
        body: { children: [firstBlock], scrollHeight: 3392, offsetHeight: 3392, style: { setProperty: bodySetProperty } },
        querySelectorAll: () => [firstBlock],
      },
    });
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: {
        getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
      },
    });

    fireEvent.load(frame);

    expect(documentElementSetProperty).toHaveBeenCalledWith('padding', '0', 'important');
    expect(bodySetProperty).toHaveBeenCalledWith('padding', '0', 'important');

    await waitFor(() => expect(screen.getByText('1 / 4')).toBeInTheDocument());
    expect(screen.getByText(/too long for a readable single-page PDF/i)).toBeInTheDocument();
    expect(frame).toHaveStyle('transform: translateY(-0px) scale(0.625)');

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(frame).toHaveStyle('transform: translateY(-1123px) scale(0.625)');

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('rejects uploads that do not satisfy PDF rules', async () => {
    renderPage();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['<html><body><main>Hello</main></body></html>'], 'bad.html', {
      type: 'text/html',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/HTML file needs a few fixes before export/i)).toBeInTheDocument();
    expect(screen.queryByTitle('HTML PDF preview')).not.toBeInTheDocument();
  });
});
