import React from 'react';

function TablaEstadoBot({ estado, preciosActuales }) {
  if (!estado || !preciosActuales) {
    return <p>Cargando datos...</p>;
  }

  const calcularPorcentaje = (precioActual, precioEntrada) => {
    // Validar que sean números válidos
    if (
      typeof precioActual !== 'number' ||
      typeof precioEntrada !== 'number' ||
      precioEntrada === 0
    ) {
      return 0;
    }
    return ((precioActual - precioEntrada) / precioEntrada) * 100;
  };

  return (
    <table className="tabla-estado">
      <thead>
        <tr>
          <th>Moneda</th>
          <th>En Posición</th>
          <th>RSI Actual</th>
          <th>Precio Entrada</th>
          <th>Precio Objetivo</th>
          <th>Precio Actual</th>
          <th>% Ganancia/Perdida</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(estado).map(([moneda, datos]) => {
          // Validar y asignar 0 si no existen o no son números
          const precioEntrada = Number(datos.precio_entrada) || 0;
          const precioObjetivo = Number(datos.precio_objetivo) || 0;
          const precioActual = Number(preciosActuales[moneda]) || 0;

          const porcentaje = calcularPorcentaje(precioActual, precioEntrada);

          return (
            <tr key={moneda}>
              <td>{moneda}</td>
              <td>{datos.en_posicion ? 'Sí' : 'No'}</td>
              <td>{datos.rsi !== null ? datos.rsi.toFixed(2) : '-'}</td>
              <td>{precioEntrada.toFixed(6)}</td>
              <td>{precioObjetivo.toFixed(6)}</td>
              <td>{precioActual.toFixed(6)}</td>
              <td
                style={{ color: porcentaje >= 0 ? 'green' : 'red', fontWeight: 'bold' }}
              >
                {porcentaje.toFixed(2)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default TablaEstadoBot;
