'use client';

import { Mail, Github, Twitter } from 'lucide-react';

const footerLinks = {
  Producto: [
    { label: 'Características', href: '#' },
    { label: 'Precios', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  Empresa: [
    { label: 'Acerca de', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contacto', href: '#' },
  ],
  Legal: [
    { label: 'Privacidad', href: '#' },
    { label: 'Términos', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] bg-[#1A1A1A]/20">
      <div className="container-custom py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <span className="font-bold">SecondBrain</span>
            </div>
            <p className="text-sm text-[#999999]">
              Tu segundo cerebro para gestionar conocimiento sin esfuerzo.
            </p>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-semibold mb-4">{section}</h4>
              <nav className="space-y-2">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-[#999999] hover:text-[#E5E5E5] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-[#2A2A2A] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#999999]">
            © 2024 SecondBrain. Todos los derechos reservados.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={18} />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
            <a
              href="mailto:hello@secondbrain.app"
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
              aria-label="Email"
            >
              <Mail size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
