'use client';

import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'Evolução' },
  { href: '/holdings', label: 'Posições' },
  { href: '/import', label: 'Importar' },
  { href: '/conta', label: 'Conta' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 sm:gap-6 font-[family-name:var(--font-manrope)] text-sm tracking-tight overflow-x-auto no-scrollbar whitespace-nowrap py-2 md:py-0">
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={`transition-colors shrink-0 ${
            pathname === link.href
              ? 'text-black font-semibold border-b-2 border-black pb-1'
              : 'text-slate-500 font-medium hover:text-slate-700'
          }`}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
