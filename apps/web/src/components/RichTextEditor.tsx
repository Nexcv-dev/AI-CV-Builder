import React from 'react';
import { 
  Editor, 
  EditorProvider, 
  Toolbar, 
  BtnBold, 
  BtnItalic, 
  BtnUnderline, 
  BtnBulletList, 
  BtnNumberedList, 
  BtnLink, 
  BtnClearFormatting 
} from 'react-simple-wysiwyg';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  labelId?: string;
  maxLength?: number;
}

export const RichTextEditor = React.memo(({ value, onChange, placeholder, id, labelId, maxLength }: RichTextEditorProps) => {
  const handleChange = (nextValue: string) => {
    onChange(maxLength ? nextValue.slice(0, maxLength) : nextValue);
  };

  return (
    <div
      className="rich-text-editor-container border border-gray-300 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 hover:border-gray-400 transition-all bg-white shadow-sm"
    >
      <EditorProvider>
        <Editor
          id={id}
          role="textbox"
          aria-labelledby={labelId}
          aria-multiline="true"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          containerProps={{ style: { border: 'none', minHeight: '120px' } }}
        >
          <Toolbar>
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnBulletList />
            <BtnNumberedList />
            <BtnLink />
            <BtnClearFormatting />
          </Toolbar>
        </Editor>
      </EditorProvider>
    </div>
  );
});
