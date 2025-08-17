"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SimpleSidebarProps {
  currentPage?: string;
}

const SimpleSidebar: React.FC<SimpleSidebarProps> = ({ currentPage }) => {
  const pathname = usePathname();
  
  // Auto-detect current page from pathname if not provided
  const detectCurrentPage = () => {
    if (currentPage) return currentPage;
    
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/courses') return 'courses';
    if (pathname === '/marketplace') return 'marketplace';
    if (pathname === '/library') return 'library';
    if (pathname === '/discussions') return 'discussions';
    if (pathname === '/messages') return 'messages';
    if (pathname === '/settings') return 'settings';
    
    return '';
  };

  const activePage = detectCurrentPage();

  const menuItems = [
    { id: 'dashboard', href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'courses', href: '/courses', icon: '📚', label: 'Kurslarım' },
    { id: 'marketplace', href: '/marketplace', icon: '🛒', label: 'Kurs Mağazası' },
    { id: 'library', href: '/library', icon: '📖', label: 'Kütüphane' },
    { id: 'discussions', href: '/discussions', icon: '💬', label: 'Tartışmalar' },
    { id: 'messages', href: '/messages', icon: '✉️', label: 'Mesajlar' },
    { id: 'settings', href: '/settings', icon: '⚙️', label: 'Ayarlar' }
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 fixed h-full z-40">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">7P Education</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default SimpleSidebar;
