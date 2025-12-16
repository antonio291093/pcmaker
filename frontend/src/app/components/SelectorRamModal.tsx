// SelectorRamModal.tsx
import Swal from "sweetalert2";

interface HardwareItem {
  id?: number;
  descripcion: string;
  especificacion?: string;
}

interface SelectorRamModalProps {
  onSelect: (items: HardwareItem[]) => void;
  onCancel?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default async function SelectorRamModal({
  onSelect,
  onCancel,
}: SelectorRamModalProps) {
  try {
    const resp = await fetch(`${API_URL}/api/inventario/hardware/ram`, {
      credentials: "include",
    });
    const data: HardwareItem[] = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Sin resultados",
        text: "No hay memorias RAM registradas.",
      });
      onCancel?.();
      return;
    }

    const { isConfirmed, value } = await Swal.fire({
      title: "Seleccionar memoria RAM",
      html: `
        <div style="max-height:300px;overflow-y:auto;text-align:left;margin-top:10px">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">Sel.</th>
                <th style="text-align:left;">Descripción</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item, i) => `
                    <tr>
                      <td style="text-align:center;">
                        <input type="checkbox" id="ram-${i}" value="${item.descripcion}">
                      </td>
                      <td><label for="ram-${i}">${item.descripcion}</label></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Confirmar selección",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const seleccionados = data.filter(
          (_, i) =>
            (document.getElementById(`ram-${i}`) as HTMLInputElement)?.checked
        );
        return seleccionados;
      },
    });

    if (isConfirmed && value?.length) onSelect(value);
    else onCancel?.();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: "Ocurrió un error al cargar las memorias RAM.",
    });
    onCancel?.();
  }
}
