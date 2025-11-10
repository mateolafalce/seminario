import React, { useCallback, useState } from 'react';
import AltaCancha from '../../canchas/AltaCancha';
import VerCanchasInline from '../../../canchas/pages/VerCanchasInline';

export default function GestionCanchas() {
  const [refresh, setRefresh] = useState(false);
  const triggerRefresh = useCallback(() => setRefresh((v) => !v), []);

  return (
    <div className="space-y-6">
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-white font-semibold text-lg mb-3">Crear cancha</h2>
        <AltaCancha onCreated={triggerRefresh} />
      </section>

      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-white font-semibold text-lg mb-3">Listado de canchas</h2>
        <VerCanchasInline refresh={refresh} />
      </section>
    </div>
  );
}
