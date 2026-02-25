"use client"

import { useEffect, useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type Item = {
  id: number
  precio: string
  imagen: string
  sucursal: string
}

export default function CatalogoGrid({ items }: { items: Item[] }) {

  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null)

  // cerrar con ESC
  useEffect(() => {

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImagenSeleccionada(null)
      }
    }

    window.addEventListener("keydown", handleEsc)

    return () => window.removeEventListener("keydown", handleEsc)

  }, [])


  return (
    <>

      {/* GRID */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {items.map(item => (

          <article
            key={item.id}
            className="
              border border-gray-200
              rounded-xl
              overflow-hidden
              shadow-sm
              bg-white
              hover:shadow-lg
              hover:scale-[1.02]
              transition duration-200
            "
          >

            <img
              src={`${API_URL}${item.imagen}`}
              alt={`Producto PCMaker precio ${item.precio}`}
              loading="lazy"
              onClick={() =>
                setImagenSeleccionada(`${API_URL}${item.imagen}`)
              }
              className="
                w-full
                h-48
                object-cover
                cursor-zoom-in
                transition
                hover:opacity-95
              "
            />

            <div className="p-3">

              <div className="font-bold text-lg text-indigo-600">
                ${item.precio}
              </div>

              <div className="text-sm text-gray-500">
                Disponible en {item.sucursal}
              </div>

            </div>

          </article>

        ))}

      </div>



      {/* MODAL PREMIUM */}

      {imagenSeleccionada && (

        <div
          className="
            fixed inset-0
            bg-black/80
            backdrop-blur-sm
            flex items-center justify-center
            z-50
            animate-fadeIn
          "
          onClick={() => setImagenSeleccionada(null)}
        >

          {/* CONTENEDOR */}

          <div
            className="
              relative
              max-w-[95vw]
              max-h-[95vh]
              animate-zoomIn
            "
            onClick={(e) => e.stopPropagation()}
          >

            {/* BOTON CERRAR */}

            <button
              onClick={() => setImagenSeleccionada(null)}
              className="
                absolute
                -top-4
                -right-4
                bg-white
                w-10
                h-10
                rounded-full
                shadow-lg
                text-xl
                hover:scale-110
                transition
              "
            >
              ✕
            </button>


            {/* IMAGEN */}

            <img
              src={imagenSeleccionada}
              className="
                rounded-xl
                shadow-2xl
                max-h-[90vh]
                max-w-[90vw]
                object-contain
                select-none
              "
            />


          </div>

        </div>

      )}

    </>
  )
}