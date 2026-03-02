import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {

  metadataBase: new URL("https://catalogo.pcmaker.mx"),

  title: {
    default: "Catálogo PCMaker | Computadoras y Refacciones en Saltillo",
    template: "%s | Catálogo PCMaker"
  },

  description:
    "Catálogo de computadoras, laptops, refacciones y accesorios disponibles en PCMaker Saltillo. Consulta precios actualizados y disponibilidad.",

  keywords: [
    "computadoras saltillo",
    "pc gamer saltillo",
    "refacciones pc saltillo",
    "laptops saltillo",
    "catalogo pcmaker",
    "pcmaker saltillo",
    "componentes pc mexico"
  ],

  authors: [{ name: "PCMaker" }],

  creator: "PCMaker",

  openGraph: {
    title: "Catálogo PCMaker",
    description:
      "Consulta el catálogo actualizado de computadoras y refacciones PCMaker en Saltillo.",

    url: "https://catalogo.pcmaker.mx",

    siteName: "PCMaker",

    locale: "es_MX",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: "https://catalogo.pcmaker.mx",
  },

};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="light">

      <body className="bg-white text-gray-800">        

        {/* HEADER estilo ERP */}

        <header className="border-b border-gray-200 shadow-sm">

          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">

            <img
              src="/pcmaker.png"
              className="h-12 w-12 rounded-full shadow"
              alt="PCMaker Logo"
            />

            <div>

              <div className="font-bold text-lg text-indigo-600">
                PCMaker
              </div>

              <div className="text-sm text-gray-500">
                Catálogo de productos
              </div>

            </div>

          </div>

        </header>

        {children}

      </body>

    </html>
  );
}