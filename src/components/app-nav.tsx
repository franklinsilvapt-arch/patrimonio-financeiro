'use client';

import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'Evolução' },
  { href: '/holdings', label: 'Posições' },
  { href: '/import', label: 'Importar' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium">
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={`transition-colors hover:text-foreground/80 ${
            pathname === link.href ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
