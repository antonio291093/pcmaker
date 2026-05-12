warning: in the working copy of '.claude/settings.local.json', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/.claude/settings.local.json b/.claude/settings.local.json[m
[1mindex 931da57..dded540 100644[m
[1m--- a/.claude/settings.local.json[m
[1m+++ b/.claude/settings.local.json[m
[36m@@ -24,7 +24,8 @@[m
       "Bash(dir \"C:\\\\Users\\\\thebl\\\\OneDrive\\\\Documentos\\\\ReactProjects\\\\pcmaker\\\\frontend\\\\src\\\\app\\\\admin\\\\components\")",[m
       "Bash(dir \"C:\\\\Users\\\\thebl\\\\OneDrive\\\\Documentos\\\\ReactProjects\\\\pcmaker\\\\frontend\\\\src\\\\app\\\\ventas\\\\components\")",[m
       "Bash(dir \"C:\\\\Users\\\\thebl\\\\OneDrive\\\\Documentos\\\\ReactProjects\\\\pcmaker\\\\frontend\\\\src\\\\app\\\\tecnico\\\\components\")",[m
[31m-      "Bash(dir \"C:\\\\Users\\\\thebl\\\\OneDrive\\\\Documentos\\\\ReactProjects\\\\pcmaker\\\\backend\\\\src\\\\utils\\\\pdf\")"[m
[32m+[m[32m      "Bash(dir \"C:\\\\Users\\\\thebl\\\\OneDrive\\\\Documentos\\\\ReactProjects\\\\pcmaker\\\\backend\\\\src\\\\utils\\\\pdf\")",[m
[32m+[m[32m      "Bash(Remove-Item *)"[m
     ][m
   }[m
 }[m
[1mdiff --git a/frontend/src/app/tecnico/components/InventoryCard.tsx b/frontend/src/app/tecnico/components/InventoryCard.tsx[m
[1mdeleted file mode 100644[m
[1mindex 5e3e562..0000000[m
[1m--- a/frontend/src/app/tecnico/components/InventoryCard.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,57 +0,0 @@[m
[31m-import { useState } from "react";[m
[31m-import { motion } from "framer-motion";[m
[31m-import { FaMoneyBill, FaCheck, FaTimes, FaQuestion } from "react-icons/fa";[m
[31m-[m
[31m-const statusCatalog = [[m
[31m-  { id: 1, nombre: "Por revisar", icon: <FaQuestion className="text-yellow-500 text-2xl" /> },[m
[31m-  { id: 2, nombre: "Revisado - Por armar", icon: <FaCheck className="text-blue-500 text-2xl" /> },[m
[31m-  { id: 3, nombre: "Revisado - No funciona", icon: <FaTimes className="text-red-500 text-2xl" /> },[m
[31m-  { id: 4, nombre: "Armado", icon: <FaMoneyBill className="text-green-500 text-2xl" /> }[m
[31m-];[m
[31m-[m
[31m-const equipos = [[m
[31m-  { id: 1001, name: "Laptop HP G7", status_id: 1 },[m
[31m-  { id: 1002, name: "Desktop Optiplex", status_id: 4 },[m
[31m-  { id: 1003, name: "Monitor Samsung", status_id: 3 },[m
[31m-];[m
[31m-[m
[31m-export default function InventoryCards() {[m
[31m-  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);[m
[31m-  const filtered = selectedStatus ? equipos.filter(eq => eq.status_id === selectedStatus) : equipos;[m
[31m-  [m
[31m-  return ([m
[31m-    <motion.div className="w-full max-w-5xl mx-auto">[m
[31m-      {/* Tarjetas de estado */}[m
[31m-      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">[m
[31m-        {statusCatalog.map(st => ([m
[31m-          <button[m
[31m-            key={st.id}[m
[31m-            onClick={() => setSelectedStatus(st.id)}[m
[31m-            className={`flex flex-col items-center p-4 rounded-xl shadow-sm border[m
[31m-              ${selectedStatus === st.id ? "border-gray-300" : "border-transparent"}[m
[31m-              bg-white hover:bg-gray-50 transition`}[m
[31m-          >[m
[31m-            {st.icon}[m
[31m-            <span className="font-semibold text-md mt-2 text-gray-700">{st.nombre}</span>[m
[31m-            <span className="text-xs mt-1 text-gray-500">[m
[31m-              {equipos.filter(eq => eq.status_id === st.id).length} equipos[m
[31m-            </span>[m
[31m-          </button>[m
[31m-        ))}[m
[31m-      </div>[m
[31m-      {/* Tarjetas filtradas de equipos */}[m
[31m-      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">[m
[31m-        {filtered.map(eq => ([m
[31m-          <div key={eq.id} className="p-4 rounded-lg bg-white shadow-sm flex flex-col items-start">[m
[31m-            <span className="font-semibold text-gray-800">{eq.name}</span>[m
[31m-          </div>[m
[31m-        ))}[m
[31m-      </div>[m
[31m-      {selectedStatus && ([m
[31m-        <button className="mt-4 text-blue-600 underline" onClick={() => setSelectedStatus(null)}>[m
[31m-          Mostrar todos[m
[31m-        </button>[m
[31m-      )}[m
[31m-    </motion.div>[m
[31m-  );[m
[31m-}[m
