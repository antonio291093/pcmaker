'use client'

import { useEffect, useState } from "react"
import CatalogoGrid from "./CatalogoGrid"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type Item = {
  id: number
  precio: string
  imagen: string
  sucursal: string
}

type Categoria = {
  id: number
  descripcion: string
}

export default function CatalogoFiltros({
  categorias,
  itemsIniciales
}: {
  categorias: Categoria[]
  itemsIniciales: Item[]
}) {

  const [items, setItems] = useState<Item[]>(itemsIniciales)
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null)

  async function cargarCategoria(id: number | null) {

    setCategoriaActiva(id)

    let url = `${API_URL}/api/catalogo`

    if (id) {
      url += `?categoria_catalogo_id=${id}`
    }

    const res = await fetch(url)

    const data = await res.json()

    setItems(data)

  }

  return (

    <>

      {/* BOTONES */}
      <div className="flex flex-wrap gap-2 mb-6">

        <button
          onClick={() => cargarCategoria(null)}
          className={`px-4 py-2 rounded border ${
            categoriaActiva === null
            ? "bg-indigo-600 text-white"
            : "bg-white"
          }`}
        >
          Todos
        </button>

        {categorias.map(cat => (

          <button
            key={cat.id}
            onClick={() => cargarCategoria(cat.id)}
            className={`px-4 py-2 rounded border ${
              categoriaActiva === cat.id
              ? "bg-indigo-600 text-white"
              : "bg-white"
            }`}
          >
            {cat.descripcion}
          </button>

        ))}

      </div>

      <CatalogoGrid items={items} />

    </>

  )
}