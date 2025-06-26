import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HistorialOperaciones() {
  const [historial, setHistorial] = useState([]); // Estado para datos del historial
  const [cargando, setCargando] = useState(true);   // Estado de carga
  const [error, setError] = useState(null);         // Estado de error

    useEffect(() => {
    console.log('🔥 Enviando petición a /history…');
    axios.get('http://127.0.0.1:5000/history')
        .then(res => {
        console.log('✅ /history respuesta:', res);
        setHistorial(res.data);
        setCargando(false);
        })
        .catch(err => {
        console.error('❌ Error en /history:', err);
        setError(err);
        setCargando(false);
        });
    }, []);

  if (cargando) return <p>Cargando historial...</p>;
  if (error) return <p>Error al cargar historial.</p>;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3>Historial de Operaciones</h3>
      <table className="tabla-estado">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Símbolo</th>
            <th>Acción</th>
            <th>Precio</th>
            <th>RSI</th>
            <th>% Cambio</th>
            <th>Precio Máx</th>
            <th>Precio Actual</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((op, idx) => (
            <tr key={idx}>
              <td>{op.fecha}</td>
              <td>{op.simbolo}</td>
              <td>{op.accion}</td>
              <td>{op.precio.toFixed(6)}</td>
              <td>{op.rsi.toFixed(2)}</td>
              <td>{op.cambio_pct ? op.cambio_pct.toFixed(2) + '%' : '-'}</td>
              <td>{op.precio_max ? op.precio_max.toFixed(6) : '-'}</td>
              <td>{op.precio_actual ? op.precio_actual.toFixed(6) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistorialOperaciones;