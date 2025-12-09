// app/layout.tsx
import './globals.css'; // Importa tus estilos globales (ej. Tailwind)
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body>
        {children}
      </body>
    </html>
  );
}
