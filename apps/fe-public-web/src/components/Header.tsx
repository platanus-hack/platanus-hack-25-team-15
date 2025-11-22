'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Características', href: '#features' },
    { label: 'Cómo funciona', href: '#how-it-works' },
    { label: 'Testimonios', href: '#testimonials' },
    { label: 'Precios', href: '#pricing' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#2A2A2A] bg-[#0F0F0F]/80 backdrop-blur-sm">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SB</span>
            </div>
            <span className="font-bold text-lg">SecondBrain</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-[#999999] hover:text-[#E5E5E5] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA and Mobile Menu */}
          <div className="flex items-center gap-4">
            <a href="#" className="hidden sm:inline-block btn-primary text-sm">
              Comenzar Gratis
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-[#2A2A2A] py-4 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-2 py-2 text-[#999999] hover:text-[#E5E5E5] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a href="#" className="block btn-primary text-center w-full mt-4">
              Comenzar Gratis
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
