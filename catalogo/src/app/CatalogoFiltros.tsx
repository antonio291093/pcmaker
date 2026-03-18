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

type Sucursal = {
  id: number
  nombre: string
}


export default function CatalogoFiltros({
  categorias,
  sucursales,
  itemsIniciales
}: {
  categorias: Categoria[]
  sucursales: Sucursal[]
  itemsIniciales: Item[]
}) {

  const [items, setItems] = useState<Item[]>(itemsIniciales)
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null)
  const [sucursalActiva, setSucursalActiva] = useState<number | null>(null)

  async function cargarFiltros(
    categoriaId: number | null,
    sucursalId: number | null
  ) {
    setCategoriaActiva(categoriaId)
    setSucursalActiva(sucursalId)

    let url = `${API_URL}/api/catalogo?`

    const params = new URLSearchParams()

    if (categoriaId) {
      params.append("categoria_catalogo_id", categoriaId.toString())
    }

    if (sucursalId) {
      params.append("sucursal_id", sucursalId.toString())
    }

    url += params.toString()

    const res = await fetch(url)
    const data = await res.json()

    setItems(data)
  }

  return (

    <>

      {/* BOTONES */}
      <div className="flex flex-wrap gap-2 mb-6">

        <button
          onClick={() => cargarFiltros(null, sucursalActiva)}
          className={`px-4 py-2 rounded border ${
            categoriaActiva === null
            ? "bg-indigo-600 text-white"
            : "bg-white"
          }`}
        >
          Todos
        </button>

        {/* SUCURSALES */}        
          <button
            onClick={() => cargarFiltros(categoriaActiva, null)}
            className={`px-4 py-2 rounded border ${
              sucursalActiva === null
                ? "bg-indigo-600 text-white"
                : "bg-white"
            }`}
          >
            Todas las sucursales
          </button>

          {sucursales.map(suc => (

            <button
              key={suc.id}
              onClick={() => cargarFiltros(categoriaActiva, suc.id)}
              className={`px-4 py-2 rounded border ${
                sucursalActiva === suc.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white"
              }`}
            >
              {suc.nombre}
            </button>

          ))}        

        {categorias.map(cat => (

          <button
            key={cat.id}
            onClick={() => cargarFiltros(cat.id, sucursalActiva)}
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