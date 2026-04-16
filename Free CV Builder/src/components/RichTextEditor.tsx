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
}

export const RichTextEditor = React.memo(({ value, onChange, placeholder, id }: RichTextEditorProps) => {
  return (
    <div className="rich-text-editor-container border border-gray-300 rounded-lg overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 hover:border-gray-400 transition-all bg-white">
      <EditorProvider>
        <Editor
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
