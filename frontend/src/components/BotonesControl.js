import React, { useRef, useState } from 'react';
import axios from 'axios';
import FormularioInicioBot from './FormularioInicio';

/**
 * Componente que agrupa los botones para iniciar y detener el bot,
 * así como la opción para activar o desactivar el uso de Testnet.
 *
 * @param {function} setMensaje - Función para actualizar el mensaje que se muestra en pantalla.
 */
function BotonesControl({ setMensaje }) {
  const formularioRef = useRef();
  const [usarTestnet, setUsarTestnet] = useState(true);

  /**
   * Envía una solicitud POST al backend para detener el bot.
   */
  const detenerBot = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/stop');
      setMensaje(response.data.message);
    } catch (error) {
      setMensaje('Error al detener el bot');
    }
  };

  return (
    <div className="botones-control">
      <FormularioInicioBot
        ref={formularioRef}
        setMensaje={setMensaje}
        usarTestnet={usarTestnet}
      />

      <div className="grupo-testnet">
        <label className="switch-label">
          <input
            type="checkbox"
            checked={usarTestnet}
            onChange={(e) => setUsarTestnet(e.target.checked)}
          />
          <span className="slider"></span>
          <span className="etiqueta-switch">Usar Testnet</span>
        </label>
      </div>

      <div className="grupo-botones">
        <button className="btn iniciar" onClick={() => formularioRef.current.iniciarBot()}>
          🚀 Iniciar
        </button>
        <button className="btn detener" onClick={detenerBot}>
          🛑 Detener
        </button>
      </div>
    </div>
  );
}

export default BotonesControl;
