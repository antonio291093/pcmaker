'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Ajusta esto según cómo manejes auth
    const token = localStorage.getItem('token');

    if (token) {
      router.replace('/login');
    } else {
      router.replace('/login'); // o /login si después lo cambias
    }
  }, [router]);

  return null;
}
