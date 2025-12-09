import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Sistema Integral de Gestión de Equipos y Mantenimientos",
  description:
    "Sistema para gestionar inventarios, ventas, mantenimientos, historial de equipos y comisiones con paneles personalizados para cada rol.",
  keywords: [
    "sistema gestión equipos",
    "dashboard técnico",
    "dashboard administrador",
    "dashboard ventas",
    "mantenimiento de hardware",
    "inventario de equipos",
    "registro de reparaciones",
    "comisiones ventas"
  ],
  openGraph: {
    title: "Sistema Integral de Gestión de Equipos y Mantenimientos",
    description: "Paneles personalizados para técnicos, administradores y ventas para gestionar equipos y procesos.",
    url: "https://tusitio.com",
    siteName: "Sistema Gestión de Equipos",
    images: [
      {
        url: "https://res.cloudinary.com/dfpubv5hp/image/upload/v1753993023/qrgenerador_trwz4k.png", // Cambia a tu logo o imagen representativa
        width: 1200,
        height: 630,
        alt: "Sistema Integral de Gestión de Equipos y Mantenimientos",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema Integral de Gestión de Equipos y Mantenimientos",
    description: "Paneles personalizados para cada usuario gestionar inventarios, ventas y mantenimientos.",
    images: [
      "https://res.cloudinary.com/dfpubv5hp/image/upload/v1753993023/qrgenerador_trwz4k.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (token) {
    // Redirige directamente al dashboard técnico para prueba
    redirect('/ventas');
  } else {
    redirect('/ventas');
  }
  return null;
}
