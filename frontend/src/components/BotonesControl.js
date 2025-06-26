// Importa React, hooks necesarios y axios para las peticiones HTTP
import React, { useRef, useState } from 'react';
import axios from 'axios';

// Importa el componente del formulario para iniciar el bot
import FormularioInicioBot from './FormularioInicio';

/**
 * Componente que agrupa los botones para iniciar y detener el bot,
 * así como la opción para activar o desactivar el uso de Testnet.
 *
 * @param {function} setMensaje - Función para actualizar el mensaje que se muestra en pantalla.
 */
function BotonesControl({ setMensaje }) {
  // Referencia al componente FormularioInicioBot, para poder invocar su método iniciarBot desde acá
  const formularioRef = useRef();

  // Estado local para controlar si se usa Testnet
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
      {/* Formulario que gestiona el inicio del bot, conectado con ref para control externo */}
      <FormularioInicioBot
        ref={formularioRef}
        setMensaje={setMensaje}
        usarTestnet={usarTestnet}
      />

      {/* Checkbox para activar/desactivar Testnet */}
      <label>
        <input
          type="checkbox"
          checked={usarTestnet}
          onChange={(e) => setUsarTestnet(e.target.checked)}
        />
        Usar Testnet
      </label>

      {/* Botón que dispara el método iniciarBot del formulario usando la referencia */}
      <button onClick={() => formularioRef.current.iniciarBot()}>
        Iniciar
      </button>

      {/* Botón para detener el bot */}
      <button onClick={detenerBot}>
        Detener
      </button>
    </div>
  );
}

// Exporta el componente para su uso en otros archivos
export default BotonesControl;
