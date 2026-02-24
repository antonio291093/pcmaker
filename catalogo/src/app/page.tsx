'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL

type Item = {
  id: number
  precio: string
  imagen: string
  sucursal: string
}

export default function CatalogoPage() {

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    fetch(`${API_URL}/api/catalogo`)
      .then(res => res.json())
      .then(data => {

        setItems(data)
        setLoading(false)

      })

  }, [])

  if (loading) {
    return (
      <div className="p-10 text-center">
        Cargando catálogo...
      </div>
    )
  }

  return (

    <div className="max-w-6xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Catálogo PCMaker
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {items.map(item => (

          <div
            key={item.id}
            className="
              border rounded-lg
              overflow-hidden
              shadow-sm
              bg-white
            "
          >

            <img
              src={`${API_URL}${item.imagen}`}
              className="w-full h-48 object-cover"
            />

            <div className="p-3">

              <div className="font-semibold text-lg">

                ${item.precio}

              </div>

              <div className="text-sm text-gray-500">

                {item.sucursal}

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  )

}