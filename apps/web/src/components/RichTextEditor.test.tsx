import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import React from 'react';

// Mock react-simple-wysiwyg to avoid issues with contenteditable in jsdom
vi.mock('react-simple-wysiwyg', () => ({
  EditorProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Toolbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Editor: ({ value, onChange, placeholder }: any) => (
    <textarea 
      data-testid="mock-editor" 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
    />
  ),
  BtnBold: () => <button>Bold</button>,
  BtnItalic: () => <button>Italic</button>,
  BtnUnderline: () => <button>Underline</button>,
  BtnBulletList: () => <button>Bullet</button>,
  BtnNumberedList: () => <button>Number</button>,
  BtnLink: () => <button>Link</button>,
  BtnClearFormatting: () => <button>Clear</button>,
}));

describe('RichTextEditor Component', () => {
  it('renders with initial value', () => {
    render(<RichTextEditor value="Hello World" onChange={() => {}} />);
    const editor = screen.getByTestId('mock-editor');
    expect(editor).toHaveValue('Hello World');
  });

  it('calls onChange when text is entered', () => {
    const handleChange = vi.fn();
    render(<RichTextEditor value="" onChange={handleChange} />);
    const editor = screen.getByTestId('mock-editor');
    
    fireEvent.change(editor, { target: { value: 'New text' } });
    
    expect(handleChange).toHaveBeenCalledWith('New text');
  });

  it('renders placeholder', () => {
    render(<RichTextEditor value="" onChange={() => {}} placeholder="Enter text here..." />);
    const editor = screen.getByTestId('mock-editor');
    expect(editor).toHaveAttribute('placeholder', 'Enter text here...');
  });
});
