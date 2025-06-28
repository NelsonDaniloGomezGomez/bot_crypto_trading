import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";

function calcularRSI(datos, periodo = 14) {
  const resultados = [];
  let ganancias = 0,
    perdidas = 0;

  for (let i = 1; i < datos.length; i++) {
    const cambio = datos[i].value - datos[i - 1].value;
    if (cambio > 0) ganancias += cambio;
    else perdidas -= cambio;

    if (i >= periodo) {
      if (i === periodo) {
        ganancias /= periodo;
        perdidas /= periodo;
      } else {
        ganancias = (ganancias * (periodo - 1) + Math.max(cambio, 0)) / periodo;
        perdidas = (perdidas * (periodo - 1) + Math.max(-cambio, 0)) / periodo;
      }
      const rs = perdidas === 0 ? 100 : ganancias / perdidas;
      resultados.push({ time: datos[i].time, value: 100 - 100 / (1 + rs) });
    }
  }
  return resultados;
}

const GraficoConTradingView = ({ moneda = "ETHUSDT", modo = "oscuroElegante" }) => {
  const [intervalo, setIntervalo] = useState("1h");
  const [datosVelas, setDatosVelas] = useState([]);
  const contenedorRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const lineRef = useRef();

  const colores = {
    oscuro: {
      fondo: "rgb(30, 36, 49, 0.22)",
      texto: "#333",
      grid: "#2e3440",
      cruzColor: "#f0b90b",
      velaUp: "#26a69a",
      velaDown: "#ef5350",
      volumenUp: "#26a69a",
      volumenDown: "#ef5350",
      rsi: "#f0b90b",
    },
    claro: {
      fondo: "rgba(255, 255, 255, 0.1)",
      texto: "#2c3e50",
      grid: "#dfe6e9",
      cruzColor: "#f0b90b",
      velaUp: "#4caf50",
      velaDown: "#e53935",
      volumenUp: "#4caf50",
      volumenDown: "#e53935",
      rsi: "#f0b90b",
    },
  };

  const tema = useMemo(() => {
    return modo === "claroProfesional" ? colores.claro : colores.oscuro;
  }, [modo]);

  useEffect(() => {
    const obtenerVelas = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/velas?symbol=${moneda}&interval=${intervalo}`
        );
        const data = await res.json();
        const formateadas = data.map((item) => ({
          time: Math.floor(item.time / 1000),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        }));
        setDatosVelas(formateadas);
      } catch (e) {
        console.error("Error al obtener velas:", e);
      }
    };
    if (moneda) obtenerVelas();
  }, [moneda, intervalo]);

  useEffect(() => {
    if (!contenedorRef.current) return;

    // Eliminar chart anterior si existía
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      lineRef.current = null;
    }

    const chart = createChart(contenedorRef.current, {
      width: contenedorRef.current.clientWidth,
      height: 500,
      layout: {
        backgroundColor: tema.fondo,
        textColor: tema.texto,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      },
      grid: {
        vertLines: { color: tema.grid },
        horzLines: { color: tema.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: tema.cruzColor, width: 2, style: 3 },
        horzLine: { color: tema.cruzColor, width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: tema.grid },
      timeScale: { borderColor: tema.grid, timeVisible: true, secondsVisible: false },
    });

    chartRef.current = chart;

    candleRef.current = chart.addCandlestickSeries({
      upColor: tema.velaUp,
      downColor: tema.velaDown,
      borderUpColor: tema.velaUp,
      borderDownColor: tema.velaDown,
      wickUpColor: tema.velaUp,
      wickDownColor: tema.velaDown,
    });

    volumeRef.current = chart.addHistogramSeries({
      color: tema.volumenUp,
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    lineRef.current = chart.addLineSeries({
      color: tema.rsi,
      lineWidth: 2,
    });

    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.2, bottom: 0.2 } });

    const handleResize = () => {
      if (contenedorRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: contenedorRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleRef.current = null;
        volumeRef.current = null;
        lineRef.current = null;
      }
    };
  }, [tema]);

  // al cambiar solo el fondo, reaplica al canvas
  useEffect(() => {
    const canvases = contenedorRef.current?.querySelectorAll("canvas");
    canvases?.forEach((canvas) => {
      canvas.style.backgroundColor = tema.fondo;
    });
  }, [tema.fondo]);

  useEffect(() => {
    if (!datosVelas.length) return;

    candleRef.current.setData(datosVelas);

    const volData = datosVelas.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close > c.open ? tema.volumenUp : tema.volumenDown,
    }));
    volumeRef.current.setData(volData);

    const closeData = datosVelas.map((c) => ({ time: c.time, value: c.close }));
    lineRef.current.setData(calcularRSI(closeData));
  }, [datosVelas, tema]);

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <label htmlFor="intervalo">Intervalo:</label>
        <select
          id="intervalo"
          value={intervalo}
          onChange={(e) => setIntervalo(e.target.value)}
          style={{ marginLeft: 8, padding: "4px 8px", borderRadius: 4 }}
        >
          <option value="1m">1 minuto</option>
          <option value="5m">5 minutos</option>
          <option value="15m">15 minutos</option>
          <option value="1h">1 hora</option>
          <option value="4h">4 horas</option>
          <option value="1d">1 día</option>
        </select>
      </div>
      {/* Contenedor con fondo dinámico */}
      <div
        ref={contenedorRef}
        style={{
          width: "100%",
          height: 500,
          backgroundColor: tema.fondo,
        }}
      />
    </>
  );
};

export default GraficoConTradingView;
