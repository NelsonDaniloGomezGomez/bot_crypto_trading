import React, { useEffect, useState } from 'react';
import axios from 'axios';

function PreciosActuales() {
  const [precios, setPrecios] = useState({});

  const obtenerPrecios = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/precios');
      setPrecios(response.data);
    } catch (error) {
      console.error('Error al obtener precios:', error);
    }
  };

  // Se ejecuta al montar y cada 10 segundos
  useEffect(() => {
    obtenerPrecios();
    const intervalo = setInterval(obtenerPrecios, 10000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <h3>Precios actuales</h3>
      <table className="tabla-estado">
        <thead>
          <tr>
            <th>Cripto</th>
            <th>Precio (USDT)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(precios).map(([simbolo, precio]) => (
            <tr key={simbolo}>
              <td>{simbolo}</td>
              <td>{precio.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PreciosActuales;