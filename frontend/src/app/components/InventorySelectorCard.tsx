import { useState } from "react";
import { FaLaptop, FaTools, FaMicrochip } from "react-icons/fa";
import InventoryEquiposSection from "./InventoryEquiposSection";
import InventoryHardwareSection from "./InventoryHardwareSection";
import InventoryComponentsSection from "./InventoryComponentsSection";

type InventoryType = "equipos" | "hardware" | "componentes" | null;

export default function InventorySelectorCard() {
  const [selected, setSelected] = useState<InventoryType>(null);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => setSelected("equipos")}
          className={`flex flex-col items-center py-8 rounded-xl shadow-sm border
            ${selected === "equipos" ? "border-blue-400" : "border-transparent"}
            bg-white hover:bg-gray-50 transition`}
        >
          <FaLaptop className="text-blue-500 text-3xl mb-2" />
          <span className="font-semibold text-lg text-gray-800">Equipos</span>
        </button>
        <button
          onClick={() => setSelected("hardware")}
          className={`flex flex-col items-center py-8 rounded-xl shadow-sm border
            ${selected === "hardware" ? "border-green-400" : "border-transparent"}
            bg-white hover:bg-gray-50 transition`}
        >
          <FaTools className="text-green-500 text-3xl mb-2" />
          <span className="font-semibold text-lg text-gray-800">Hardware</span>
        </button>
        <button
          onClick={() => setSelected("componentes")}
          className={`flex flex-col items-center py-8 rounded-xl shadow-sm border
            ${selected === "componentes" ? "border-purple-400" : "border-transparent"}
            bg-white hover:bg-gray-50 transition`}
        >
          <FaMicrochip className="text-purple-500 text-3xl mb-2" />
          <span className="font-semibold text-lg text-gray-800">Componentes</span>
        </button>
      </div>

      {/* Render corresponding section */}
      {selected === "equipos" && <InventoryEquiposSection />}
      {selected === "hardware" && <InventoryHardwareSection />}
      {selected === "componentes" && <InventoryComponentsSection />}

      {/* Optional: add a "regresar" button */}
      {selected && (
        <button className="mt-6 text-blue-600 underline" onClick={() => setSelected(null)}>
          Regresar
        </button>
      )}
    </div>
  );
}
