import React from 'react';

function ResumenGanancia({ estado, preciosActuales }) {
    if (!estado || !preciosActuales) {
        return null;
    }

    const calcularPorcentaje = (precioActual, precioEntrada) => {
        if (!precioEntrada || precioEntrada === 0) return 0;
        return ((precioActual - precioEntrada) / precioEntrada) * 100;
    };

    let sumaTotal = 0;
    let cantidad = 0;

    Object.entries(estado).forEach(([moneda, datos]) => {
        if (datos.en_posicion) {
            const precioActual = preciosActuales[moneda] || 0;
            const porcentaje = calcularPorcentaje(precioActual, datos.precio_entrada);
            sumaTotal += porcentaje;
            cantidad++;
        }
    });

    const promedio = cantidad > 0 ? sumaTotal / cantidad : 0;
    const claseColor = sumaTotal >= 0 ? 'verde' : 'rojo';

    return (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <h3>Resumen de Posiciones Activas</h3>
            <p style={{ fontWeight: 'bold' }}>
                Total acumulado:{' '}
                <span className={claseColor}>{sumaTotal.toFixed(2)}%</span>
            </p>
            <p>
                Promedio: <span>{promedio.toFixed(2)}%</span>
            </p>
            <p>
                Operaciones activas: <span>{cantidad}</span>
            </p>
        </div>
    );
}

export default ResumenGanancia;
