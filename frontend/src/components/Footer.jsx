import React from 'react';
import { APP_NAME, SUPPORT_EMAIL } from '../../constants';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">SD</div>
              <span className="text-xl font-bold text-white">{APP_NAME}</span>
            </div>
            <p className="text-sm text-slate-400">Secure enterprise document routing and payments.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-blue-400">Home</a></li>
              <li><a href="/about" className="hover:text-blue-400">About</a></li>
              <li><a href="/login" className="hover:text-blue-400">Login</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Contact</h4>
            <p className="text-sm">{SUPPORT_EMAIL}</p>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {APP_NAME}.
        </div>
      </div>
    </footer>
  );
}