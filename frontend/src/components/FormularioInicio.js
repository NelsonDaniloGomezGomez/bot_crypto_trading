import React, { useImperativeHandle, forwardRef, useState } from 'react';
import axios from 'axios';

const FormularioInicioBot = forwardRef(({ setMensaje, usarTestnet }, ref) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  useImperativeHandle(ref, () => ({
    iniciarBot
  }));

  const iniciarBot = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/start', {
        api_key: apiKey,
        api_secret: apiSecret,
        usar_testnet: usarTestnet
      });
      setMensaje(response.data.message);
    } catch (error) {
      setMensaje('Error al iniciar el bot');
    }
  };

  return (
    <form className="formulario-inicio" onSubmit={e => e.preventDefault()}>
      <label htmlFor="api-key">API Key</label>
      <input
        id="api-key"
        type="text"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Ingresa tu API Key"
      />

      <label htmlFor="api-secret">API Secret</label>
      <input
        id="api-secret"
        type="password"
        value={apiSecret}
        onChange={(e) => setApiSecret(e.target.value)}
        placeholder="Ingresa tu API Secret"
      />
    </form>
  );
});

export default FormularioInicioBot;
