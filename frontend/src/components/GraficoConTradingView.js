import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";

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

function calcularEMA(datos, periodo = 14) {
  const resultado = [];
  const k = 2 / (periodo + 1);
  let ema = datos[0]?.value || 0;

  datos.forEach((p, i) => {
    if (i === 0) {
      resultado.push({ time: p.time, value: ema });
    } else {
      ema = p.value * k + ema * (1 - k);
      resultado.push({ time: p.time, value: ema });
    }
  });

  return resultado;
}

function calcularSMA(datos, periodo = 14) {
  const resultado = [];

  for (let i = periodo - 1; i < datos.length; i++) {
    const slice = datos.slice(i - periodo + 1, i + 1);
    const promedio = slice.reduce((acc, val) => acc + val.value, 0) / periodo;
    resultado.push({ time: datos[i].time, value: promedio });
  }

  return resultado;
}

function calcularMACD(datos, corto = 12, largo = 26, signal = 9) {
  const emaCorto = calcularEMA(datos, corto);
  const emaLargo = calcularEMA(datos, largo);

  const macd = emaCorto
    .slice(largo - corto)
    .map((p, i) => ({
      time: p.time,
      value: p.value - emaLargo[i].value,
    }));

  const signalLine = calcularEMA(macd, signal);
  const histogram = macd.map((p, i) => ({
    time: p.time,
    value: p.value - signalLine[i]?.value || 0,
  }));

  return { macd, signal: signalLine, histogram };
}

function calcularBollinger(datos, periodo = 20, desviacion = 2) {
  const bandas = [];

  for (let i = periodo - 1; i < datos.length; i++) {
    const slice = datos.slice(i - periodo + 1, i + 1);
    const media = slice.reduce((sum, v) => sum + v.value, 0) / periodo;

    const varianza = slice.reduce(
      (sum, v) => sum + Math.pow(v.value - media, 2),
      0
    ) / periodo;

    const desviacionEstandar = Math.sqrt(varianza);
    bandas.push({
      time: datos[i].time,
      upper: media + desviacion * desviacionEstandar,
      lower: media - desviacion * desviacionEstandar,
      media,
    });
  }

  return bandas;
}

const GraficoConTradingView = ({ moneda = "ETHUSDT", modo = "oscuroElegante", indicador }) => {
  const [intervalo, setIntervalo] = useState("1h");
  const [datosVelas, setDatosVelas] = useState([]);
  const contenedorRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const lineRef = useRef();

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
    if (!datosVelas || !candleRef.current || !volumeRef.current || !lineRef.current) return;

    
    const datosGrafico = datosVelas.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleRef.current.setData(datosGrafico);

    const datosVolumen = datosVelas.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close > c.open ? "#26a69a" : "#ef5350",
    }));
    volumeRef.current.setData(datosVolumen);

  const datosCierre = datosVelas.map((c) => ({ time: c.time, value: c.close }));

  if (indicador === "RSI") {
    const rsi = calcularRSI(datosCierre);
    lineRef.current.rsi = chartRef.current.addLineSeries({ color: tema.rsi, lineWidth: 2 });
    lineRef.current.rsi.setData(rsi);
  }

  if (indicador === "EMA") {
    const ema = calcularEMA(datosCierre);
    lineRef.current.ema = chartRef.current.addLineSeries({ color: "#f39c12", lineWidth: 2 });
    lineRef.current.ema.setData(ema);
  }

  if (indicador === "SMA") {
    const sma = calcularSMA(datosCierre);
    lineRef.current.sma = chartRef.current.addLineSeries({ color: "#3498db", lineWidth: 2 });
    lineRef.current.sma.setData(sma);
  }

  if (indicador === "MACD") {
    const { macd, signal, histogram } = calcularMACD(datosCierre);
    lineRef.current.macd = chartRef.current.addLineSeries({ color: "#9b59b6", lineWidth: 1 });
    lineRef.current.signal = chartRef.current.addLineSeries({ color: "#2ecc71", lineWidth: 1 });
    lineRef.current.histogram = chartRef.current.addHistogramSeries({ color: "#e74c3c", priceScaleId: "" });

    lineRef.current.macd.setData(macd);
    lineRef.current.signal.setData(signal);
    lineRef.current.histogram.setData(histogram);
  }

  if (indicador === "Bollinger") {
    const bandas = calcularBollinger(datosCierre);
    lineRef.current.upper = chartRef.current.addLineSeries({ color: "#8e44ad", lineWidth: 1 });
    lineRef.current.lower = chartRef.current.addLineSeries({ color: "#8e44ad", lineWidth: 1 });
    lineRef.current.media = chartRef.current.addLineSeries({ color: "#16a085", lineWidth: 1 });

    lineRef.current.upper.setData(bandas.map((b) => ({ time: b.time, value: b.upper })));
    lineRef.current.lower.setData(bandas.map((b) => ({ time: b.time, value: b.lower })));
    lineRef.current.media.setData(bandas.map((b) => ({ time: b.time, value: b.media })));
  }
}, [datosVelas, indicador, tema]);

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
