import CatalogoGrid from "./CatalogoGrid"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type Item = {
  id: number
  precio: string
  imagen: string
  sucursal: string
}

async function getCatalogo(): Promise<Item[]> {

  const res = await fetch(`${API_URL}/api/catalogo`, {
    cache: "no-store"
  })

  if (!res.ok) {
    throw new Error("Error cargando catálogo")
  }

  return res.json()
}

export default async function CatalogoPage() {

  const items = await getCatalogo()

  return (

    <main className="max-w-6xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-2 text-indigo-600">
        Catálogo de Computadoras y Refacciones PCMaker
      </h1>

      <p className="text-gray-600 mb-6">
        Consulta precios actualizados de computadoras, laptops,
        refacciones y accesorios disponibles en PCMaker.
      </p>

      <CatalogoGrid items={items} />      

      <section className="mt-10 text-gray-600 text-sm">

        <h2 className="font-semibold text-lg mb-2">
          PCMaker
        </h2>

        <p>
          PCMaker ofrece computadoras, laptops, componentes y refacciones.
          Nuestro catálogo se actualiza
          constantemente con nuevos productos y precios.
        </p>

      </section>

    </main>

  )

}