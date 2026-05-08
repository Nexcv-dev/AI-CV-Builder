import React from 'react';
import { Link } from 'react-router-dom';

export const EditorFooter = () => {
  return (
    <div className="mt-8 pt-6 border-t border-gray-200/60 pb-8 flex flex-col items-center justify-center space-y-2 print:hidden">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-gray-500">
        <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
        <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
        <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
      </div>
      <div className="text-[10px] text-gray-400">
        © {new Date().getFullYear()} CV Builder | v{__APP_VERSION__}
      </div>
    </div>
  );
};
