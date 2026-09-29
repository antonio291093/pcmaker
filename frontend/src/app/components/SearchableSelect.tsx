'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SearchableOption<T extends string | number> {
  value: T;
  label: string;
}

interface SearchableSelectProps<T extends string | number> {
  options: SearchableOption<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  placeholder?: string;
  disabled?: boolean;
  noResultsText?: string;
  className?: string;
  ariaLabel?: string;
}

// Minúsculas y sin acentos: "Almacenamiento" coincide con "almacenamiento"
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function SearchableSelect<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
  noResultsText = 'Sin resultados',
  className = '',
  ariaLabel,
}: SearchableSelectProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const seleccionada = options.find(o => o.value === value);

  // Cada palabra escrita debe aparecer en la etiqueta: "ddr4 16" encuentra "DDR4 - 3200 MHz - 16 GB"
  const filtradas = useMemo(() => {
    const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return options;
    return options.filter(o => {
      const label = normalizar(o.label);
      return terminos.every(t => label.includes(t));
    });
  }, [options, busqueda]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  // Mantener visible la opción activa al navegar con el teclado
  useEffect(() => {
    if (!abierto) return;
    const el = listaRef.current?.children[activo] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activo, abierto]);

  const abrir = () => {
    if (disabled || abierto) return;
    const indiceSeleccionada = options.findIndex(o => o.value === value);
    setBusqueda('');
    setActivo(indiceSeleccionada >= 0 ? indiceSeleccionada : 0);
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  const seleccionar = (opcion: SearchableOption<T>) => {
    onChange(opcion.value);
    cerrar();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!abierto) abrir();
        else setActivo(i => Math.min(i + 1, filtradas.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActivo(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        // Evita que Enter envíe el formulario que contiene al select
        e.preventDefault();
        if (abierto && filtradas[activo]) seleccionar(filtradas[activo]);
        else abrir();
        break;
      case 'Escape':
        cerrar();
        break;
      case 'Tab':
        cerrar();
        break;
    }
  };

  return (
    <div ref={contenedorRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtradas[activo] ? `${listboxId}-${activo}` : undefined}
        aria-label={ariaLabel ?? placeholder}
        className="border rounded-md p-2 pr-14 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder={seleccionada ? seleccionada.label : placeholder}
        value={abierto ? busqueda : seleccionada?.label ?? ''}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setActivo(0);
          if (!abierto) setAbierto(true);
        }}
        onFocus={abrir}
        onClick={abrir}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
      />

      <div className="absolute inset-y-0 right-2 flex items-center gap-1 text-gray-400">
        {seleccionada && !disabled && (
          <button
            type="button"
            aria-label="Limpiar selección"
            className="px-1 hover:text-gray-600"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              cerrar();
            }}
          >
            ×
          </button>
        )}
        <span aria-hidden="true" className="pointer-events-none">▾</span>
      </div>

      {abierto && (
        <ul
          id={listboxId}
          ref={listaRef}
          role="listbox"
          // Evita que el input pierda el foco al hacer click en la lista
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">{noResultsText}</li>
          ) : (
            filtradas.map((opcion, i) => (
              <li
                key={String(opcion.value)}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={opcion.value === value}
                onClick={() => seleccionar(opcion)}
                onMouseEnter={() => setActivo(i)}
                className={`px-3 py-2 cursor-pointer
                  ${i === activo ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                  ${opcion.value === value ? 'font-semibold' : ''}`}
              >
                {opcion.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
