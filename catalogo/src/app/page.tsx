import CatalogoFiltros from "./CatalogoFiltros"

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

async function getCatalogo(): Promise<Item[]> {

  const res = await fetch(`${API_URL}/api/catalogo`, {
    cache: "no-store"
  })

  return res.json()

}

async function getCategorias(): Promise<Categoria[]> {

  const res = await fetch(
    `${API_URL}/api/catalogo-categorias`,
    { cache: "no-store" }
  )

  return res.json()

}

export default async function CatalogoPage() {

  const items = await getCatalogo()
  const categorias = await getCategorias()

  return (

    <main className="max-w-6xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-2 text-indigo-600">
        Catálogo de Computadoras y Refacciones PCMaker
      </h1>

      <p className="text-gray-600 mb-6">
        Consulta precios actualizados de computadoras, laptops,
        refacciones y accesorios disponibles en PCMaker.
      </p>

      <CatalogoFiltros
        categorias={categorias}
        itemsIniciales={items}
      />

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