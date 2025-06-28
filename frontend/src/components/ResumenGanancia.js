import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ResumenGanancia({ estado, preciosActuales }) {
    const [estadisticas, setEstadisticas] = useState(null);

    useEffect(() => {
        axios.get('http://localhost:5000/estadisticas')
            .then(response => setEstadisticas(response.data))
            .catch(error => console.error('Error al obtener estadísticas:', error));
    }, []);

    if (!estado || !preciosActuales) return null;

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
    const claseColor = sumaTotal >= 0 ? 'valor-verde' : 'valor-rojo';

    const traerMinutosHoras = (minutos) => {
        if (!minutos || isNaN(minutos)) return "0 min";

        const horas = Math.floor(minutos / 60);
        const min = Math.round(minutos % 60);

        if (horas > 0 && min > 0) return `${horas}h ${min}min`;
        if (horas > 0) return `${horas}h`;
        return `${min}min`;
    };

    
    return (
        <div className="tarjeta-estadistica">
            <h3>📈 Resumen de Posiciones Activas</h3>
            <p>Total acumulado: <span className={`valor-destacado ${claseColor}`}>{sumaTotal.toFixed(2)}%</span></p>
            <p>Promedio: <span className={`valor-destacado ${claseColor}`}>{promedio.toFixed(2)}%</span></p>
            <p>Operaciones activas: <span className="valor-destacado">{cantidad}</span></p>

            {estadisticas && (
                <>
                    <h3>📊 Historial General</h3>
                    <p>Total de operaciones: <span className="valor-destacado">{estadisticas.total_operaciones}</span></p>
                    <p>Ganadas: <span className="valor-verde">{estadisticas.operaciones_ganadas}</span> | 
                       Perdidas: <span className="valor-rojo">{estadisticas.operaciones_perdidas}</span></p>
                    <p>Aciertos: <span className="valor-destacado">{estadisticas.porcentaje_aciertos}%</span></p>
                    <p>ROI total: <span className={`valor-destacado ${estadisticas.retorno_total_porcentual >= 0 ? 'valor-verde' : 'valor-rojo'}`}>
                        {estadisticas.retorno_total_porcentual}%
                    </span></p>
                    <p>Ganancia estimada USD: <span className="valor-verde valor-destacado">${estadisticas.ganancia_estimada_usd}</span></p>
                    <p>Pérdida estimada USD: <span className="valor-rojo valor-destacado">${estadisticas.perdida_estimada_usd}</span></p>
                    <p>Duración promedio: <span className="valor-destacado">{traerMinutosHoras(estadisticas.duracion_promedio_minutos)}</span></p>
                </>
            )}
        </div>
    );
}

export default ResumenGanancia;
