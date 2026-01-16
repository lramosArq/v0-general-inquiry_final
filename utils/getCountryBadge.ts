/**
 * Función para obtener las clases CSS apropiadas para badges de países
 * Devuelve clases de Tailwind CSS para colorear los badges según el país
 */
export function getCountryBadge(country: string): string {
  const countryStyles: Record<string, string> = {
    // Países europeos - tonos azules
    España: "bg-red-100 text-red-800 border-red-200",
    Francia: "bg-blue-100 text-blue-800 border-blue-200",
    Alemania: "bg-gray-100 text-gray-800 border-gray-200",
    Italia: "bg-green-100 text-green-800 border-green-200",
    "Reino Unido": "bg-indigo-100 text-indigo-800 border-indigo-200",

    // Países de Asia-Pacífico - tonos verdes y naranjas
    Australia: "bg-orange-100 text-orange-800 border-orange-200",
    "Nueva Zelanda": "bg-teal-100 text-teal-800 border-teal-200",
    Singapur: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Malasia: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Japón: "bg-rose-100 text-rose-800 border-rose-200",
    "Corea del Sur": "bg-purple-100 text-purple-800 border-purple-200",

    // Países del sudeste asiático - tonos cálidos
    Fiyi: "bg-cyan-100 text-cyan-800 border-cyan-200",
    Tailandia: "bg-amber-100 text-amber-800 border-amber-200",
    Filipinas: "bg-lime-100 text-lime-800 border-lime-200",
    Indonesia: "bg-orange-100 text-orange-800 border-orange-200",
    Vietnam: "bg-red-100 text-red-800 border-red-200",
    India: "bg-orange-100 text-orange-800 border-orange-200",

    // Estados Unidos - azul distintivo
    "Estados Unidos": "bg-blue-100 text-blue-800 border-blue-200",

    // Organizaciones internacionales
    UE: "bg-blue-100 text-blue-800 border-blue-200",
    OTAN: "bg-slate-100 text-slate-800 border-slate-200",
  }

  // Devolver estilo específico del país o estilo por defecto
  return countryStyles[country] || "bg-gray-100 text-gray-800 border-gray-200"
}
