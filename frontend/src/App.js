import React, { useState, useEffect } from "react";
import axios from "axios";

import Encabezado from "./components/Encabezado";
import BotonesControlBot from "./components/BotonesControl";
import TablaEstadoBot from "./components/TablaEstadoBot";
import PreciosActuales from "./components/PreciosActuales";
import ResumenGanancia from "./components/ResumenGanancia";
import HistorialOperaciones from "./components/HistorialOperaciones";
import GraficoConTradingView from "./components/GraficoConTradingView";

import "./App.css";

const MODOS = [
  { id: "oscuroElegante", nombre: "Oscuro Elegante" },
  { id: "claroProfesional", nombre: "Claro Profesional" }
];

function App() {
  const [estado, setEstado] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [precios, setPrecios] = useState({});
  const [modo, setModo] = useState("oscuroElegante");
  const monedasDisponibles = ["ETHUSDT", "ADAUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "TRXUSDT"]; // Puedes extender esto
  const [monedaSeleccionada, setMonedaSeleccionada] = useState("ETHUSDT");

  const handleMonedaChange = (e) => {
    setMonedaSeleccionada(e.target.value);
  };

  useEffect(() => {
    const modoGuardado = localStorage.getItem("modo") || "oscuroElegante";
    setModo(modoGuardado);
  }, []);

  useEffect(() => {
    // Ya no se manipula body, solo el div principal recibe la clase
    localStorage.setItem("modo", modo);
  }, [modo]);

  useEffect(() => {
    obtenerEstado();
    obtenerPrecios();

    const intervalEstado = setInterval(obtenerEstado, 5000);
    const intervalPrecios = setInterval(obtenerPrecios, 10000);

    return () => {
      clearInterval(intervalEstado);
      clearInterval(intervalPrecios);
    };
  }, []);

  const obtenerEstado = async () => {
    try {
      const resp = await axios.get("http://127.0.0.1:5000/status");
      setEstado(resp.data);
    } catch {
      setEstado(null);
    }
  };

  const obtenerPrecios = async () => {
    try {
      const resp = await axios.get("http://127.0.0.1:5000/precios");
      setPrecios(resp.data);
    } catch (err) {
      console.error("Error precios:", err);
    }
  };

  const cambiarModo = (e) => {
    setModo(e.target.value);
  };

  return (
    <div className={`App ${modo}`}>
      <div className="selector-modo">
        <label htmlFor="modo-select">Selecciona modo de UI: </label>
        <select id="modo-select" value={modo} onChange={cambiarModo}>
          {MODOS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="contenedor">
        <Encabezado />
        <BotonesControlBot setMensaje={setMensaje} />
        {mensaje && <p className="mensaje">{mensaje}</p>}
        <PreciosActuales precios={precios} />
        <ResumenGanancia estado={estado} preciosActuales={precios} />
        <div className="selector-moneda">
          <label htmlFor="moneda">Moneda: </label>
          <select id="moneda" value={monedaSeleccionada} onChange={handleMonedaChange}>
            {monedasDisponibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <GraficoConTradingView moneda={monedaSeleccionada} modo={modo}/>
        <TablaEstadoBot estado={estado} preciosActuales={precios} />
        <HistorialOperaciones />
      </div>
    </div>
  );
}

export default App;
