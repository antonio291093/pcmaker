'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from './components/Sidebar';
import InventoryCard from '../components/InventorySelectorCard';
import MaintenanceForm from './components/MaintenanceForm';
import HistoryTimeline from './components/HistoryTimeline';
import SpecsCard from './components/SpecsCard';
import CommissionCard from './components/CommissionCard';
import RecibirLote from '../components/RecibirLote'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DashboardPage() {
  const [active, setActive] = useState('inventario');
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/api/usuarios/me`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('No autenticado');
        return res.json();
      })
      .then(data => {
        if (data.user?.rol_id !== 2) {  // Validar que sea técnico (rol_id = 2)
          router.push('/login');  // Redirigir si no tiene permiso
        }
      })
      .catch(() => {
        router.push('/login');  // Redirigir si error o no autenticado
      })
  }, [router]);

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-auto lg:ml-24">
        {active === 'inventario' && <InventoryCard />}        
        {active === 'mantenimientos' && <MaintenanceForm />}
        {active === 'historial' && <HistoryTimeline />}
        {active === 'especificaciones' && <SpecsCard />}
        {active === 'comisiones' && <CommissionCard />}
        {active === 'lote' && <RecibirLote />}
      </main>
    </>
  );
}
