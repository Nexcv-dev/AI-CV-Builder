import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200/80 py-8 mt-auto print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} CV Builder. All rights reserved. | v{__APP_VERSION__}
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link to="/about" className="hover:text-gray-900 transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms & Conditions</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};
