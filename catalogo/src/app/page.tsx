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

type Sucursal = {
  id: number
  nombre: string
}

async function getSucursales(): Promise<Sucursal[]> {
  const res = await fetch(`${API_URL}/api/sucursales`, {
    cache: "no-store"
  })

  return res.json()
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

  try {
    const statusRes = await fetch(
      `${API_URL}/api/admin/servicio/status`,
      { cache: 'no-store' }
    )
    const { activo } = await statusRes.json()

    if (!activo) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="text-8xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Catálogo No Disponible
            </h1>
            <p className="text-gray-500 text-lg">
              El catálogo está temporalmente fuera de servicio.
              <br />
              Vuelve pronto.
            </p>
          </div>
        </div>
      )
    }
  } catch { /* fail open */ }

  const items = await getCatalogo()
  const categorias = await getCategorias()
  const sucursales = await getSucursales()

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
        sucursales={sucursales}
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