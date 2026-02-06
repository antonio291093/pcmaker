import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import 'sweetalert2/dist/sweetalert2.min.css';
import { Equipo } from './Types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Interfaz mínima para sucursal
interface Sucursal {
  id: number;
  nombre: string;
}

export default function EquipoTraspasoModal({
  equipo,
  onTransfer,
  onClose
}: {
  equipo: Equipo;
  onTransfer: (nuevoEquipo: Equipo) => void;
  onClose: () => void;
}) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setSucursales(data))
      .catch(() => setSucursales([]));
  }, []);

  useEffect(() => {
    if (!equipo || sucursales.length === 0) return;

    Swal.fire({
      title: "Traspaso de sucursal",
      html: `
        <div style='display:flex;flex-direction:column;gap:15px'>
          <label>Equipo: <strong>${equipo.nombre}</strong></label>
          <select id="sucursalSelect" class="swal2-input" style="width:100%">
            ${sucursales.map(
              (s) =>
                `<option value="${s.id}" ${
                  s.id === equipo.sucursal_id ? "selected" : ""
                }>${s.nombre}</option>`
            ).join("")}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Transferir",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const select: any = document.getElementById("sucursalSelect");
        const value = select ? parseInt(select.value) : undefined;
        return value;
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const endpoint = equipo.origen === "tecnico"
              ? `${API_URL}/api/equipos/${equipo.id}`
              : `${API_URL}/api/inventario/${equipo.id}/traspaso`

          const resp = await fetch(endpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sucursal_id: result.value }),
          });
          const actualizado = await resp.json();
          if (resp.ok) {
            Swal.fire({
              icon: "success",
              title: "Traspaso realizado",
              text: `El equipo ha sido transferido correctamente.`,
              timer: 1700,
              showConfirmButton: false,
            });
            onTransfer({ ...equipo, ...actualizado });
          } else {
            throw new Error(actualizado.message || "Error al transferir equipo");
          }
        } catch (err: any) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message,
          });
        }
      } else {
        onClose();
      }
    });
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo, sucursales]);

  return null;
}
