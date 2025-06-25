from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import json  # <- ¡IMPORTANTE!
from bot_logic import TradingBot 

app = Flask(__name__)

bot = None
bot_thread = None
stop_event = threading.Event()

@app.route('/start', methods=['POST'])
def start_bot():
    global bot, bot_thread, stop_event

    if bot_thread and bot_thread.is_alive():
        return jsonify({"message": "Bot ya está corriendo"}), 400

    data = request.json
    api_key = data.get('api_key')
    api_secret = data.get('api_secret')
    usar_testnet = data.get('usar_testnet', True)

    if not api_key or not api_secret:
        return jsonify({"message": "Faltan api_key o api_secret"}), 400

    stop_event.clear()
    bot = TradingBot(api_key, api_secret, usar_testnet, stop_event)
    bot_thread = threading.Thread(target=bot.run, daemon=True)
    bot_thread.start()

    return jsonify({"message": "Bot iniciado"}), 200

@app.route('/stop', methods=['POST'])
def stop_bot():
    global stop_event, bot_thread

    if bot_thread and bot_thread.is_alive():
        stop_event.set()
        bot_thread.join(timeout=10)
        return jsonify({"message": "Bot detenido"}), 200
    else:
        return jsonify({"message": "El bot no está corriendo"}), 400

@app.route('/status', methods=['GET'])
def get_status():
    if bot:
        estado = bot.get_estado()
        return jsonify(estado), 200
    else:
        return jsonify({"message": "El bot no está iniciado"}), 400

@app.route('/estado', methods=['GET'])
def obtener_estado():
    try:
        with open('estado.json', 'r') as f:
            contenido = f.read().strip()
            if not contenido:
                return jsonify({"mensaje": "Archivo estado.json está vacío."}), 200
            estado = json.loads(contenido)
            return jsonify(estado)
    except Exception as e:
        print(f"[ERROR] al leer estado.json: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
