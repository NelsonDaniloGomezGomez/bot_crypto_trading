import React from 'react';

function TablaEstadoBot({ estado, preciosActuales }) {
  if (!estado || !preciosActuales) {
    return <p style={{ textAlign: 'center', color: '#999' }}>Cargando datos...</p>;
  }

  const calcularPorcentaje = (precioActual, precioEntrada) => {
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
    <div style={{ overflowX: 'auto' }}>
      <table className="tabla-estado">
        <thead>
          <tr>
            <th>Moneda</th>
            <th>En Posición</th>
            <th>RSI</th>
            <th>Entrada</th>
            <th>Objetivo</th>
            <th>Actual</th>
            <th>% Variación</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(estado).map(([moneda, datos]) => {
            const precioEntrada = Number(datos.precio_entrada) || 0;
            const precioObjetivo = Number(datos.precio_objetivo) || 0;
            const precioActual = Number(preciosActuales[moneda]) || 0;
            const porcentaje = calcularPorcentaje(precioActual, precioEntrada);

            const claseColor =
              porcentaje >= 0 ? 'porcentaje-verde' : 'porcentaje-rojo';

            return (
              <tr key={moneda}>
                <td>{moneda}</td>
                <td>
                  {datos.en_posicion ? (
                    <span className="tag-posicion">✔ Activa</span>
                  ) : (
                    <span className="tag-fuera">Fuera</span>
                  )}
                </td>
                <td>{datos.rsi !== null ? datos.rsi.toFixed(2) : '-'}</td>
                <td>{precioEntrada.toFixed(6)}</td>
                <td>{precioObjetivo.toFixed(6)}</td>
                <td>{precioActual.toFixed(6)}</td>
                <td className={claseColor}>
                  {porcentaje.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TablaEstadoBot;
