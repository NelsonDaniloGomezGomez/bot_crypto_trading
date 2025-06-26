import time
import math
import json
import os
from binance.client import Client
import pandas as pd
import ta

class TradingBot:
    ARCHIVO_ESTADO = 'estado.json'
    ARCHIVO_LOG = 'logs.csv'

    def __init__(self, api_key, api_secret, usar_testnet, stop_event):
        self.api_key = api_key
        self.api_secret = api_secret
        self.usar_testnet = usar_testnet
        self.stop_event = stop_event
        self.client = Client(api_key, api_secret, testnet=usar_testnet)

        self.CONFIG = {
            'ETHUSDT': {'rsi_sobrecompra': 72, 'rsi_sobreventa': 28},
            'ADAUSDT': {'rsi_sobrecompra': 70, 'rsi_sobreventa': 30},
            'SOLUSDT': {'rsi_sobrecompra': 68, 'rsi_sobreventa': 32},
            'BNBUSDT': {'rsi_sobrecompra': 75, 'rsi_sobreventa': 25},
            'XRPUSDT': {'rsi_sobrecompra': 70, 'rsi_sobreventa': 30},
            'TRXUSDT': {'rsi_sobrecompra': 70, 'rsi_sobreventa': 30},
        }

        # Ajustes de estrategia
        self.PORCENTAJE_TAKE = 3.5          # Take Profit base (no usado directamente)
        self.PORCENTAJE_STOP = 2.0          # Trailing Stop % desde el máximo
        self.COMISION = 0.001               # 0.1% comisión
        self.COMISION_TOTAL = self.COMISION * 2  # ida y vuelta
        self.INTERVALO = Client.KLINE_INTERVAL_1MINUTE
        self.PERIODO_RSI = 14

        self.filtros = {}
        self.total_simbolos = len(self.CONFIG)

        self.iniciar_log()
        self.cargar_filtros()
        self.estado = self.cargar_estado()

    def iniciar_log(self):
        try:
            with open(self.ARCHIVO_LOG, 'x') as f:
                f.write('fecha,simbolo,accion,precio,rsi,cambio_pct,precio_max,precio_actual\n')
        except FileExistsError:
            pass

    def cargar_filtros(self):
        info = self.client.get_exchange_info()
        for s in info['symbols']:
            simbolo = s['symbol']
            if simbolo in self.CONFIG:
                lot = next(f for f in s['filters'] if f['filterType']=='LOT_SIZE')
                notional = next((f for f in s['filters'] if f['filterType']=='NOTIONAL'), None)
                min_not = float(notional['minNotional']) if notional else 0.0
                self.filtros[simbolo] = {
                    'minQty': float(lot['minQty']),
                    'stepSize': float(lot['stepSize']),
                    'minNotional': min_not,
                }

    def cantidad_por_compra(self, precio, simbolo):
        presupuesto = 100 / self.total_simbolos
        step = self.filtros[simbolo]['stepSize']
        min_qty = self.filtros[simbolo]['minQty']
        min_not = self.filtros[simbolo]['minNotional']

        max_qty = presupuesto / precio
        min_not_qty = min_not / precio
        min_qty = max(min_qty, min_not_qty)
        prec = int(-math.log(step,10))
        min_adj = math.ceil(min_qty/step)*step
        min_adj = round(min_adj, prec)

        if max_qty < min_adj:
            return 0

        adj = math.floor(max_qty/step)*step
        adj = round(adj, prec)
        return adj if adj>=min_adj else min_adj

    def registrar_operacion(self, simbolo, accion, precio, rsi, cambio_pct='', precio_max='', precio_actual=''):
        with open(self.ARCHIVO_LOG,'a') as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')},{simbolo},{accion},{precio},{round(rsi,2)},{round(cambio_pct,2) if cambio_pct!='' else ''},{precio_max},{precio_actual}\n")

    def obtener_velas(self, simbolo, intervalo, limite=100):
        datos = self.client.get_klines(symbol=simbolo, interval=intervalo, limit=limite)
        df = pd.DataFrame(datos, columns=['ts','apertura','max','min','cierre','vol','ct','qav','trades','tbav','tbqav','ignore'])
        df['cierre'] = df['cierre'].astype(float)
        return df

    def calcular_rsi(self, df):
        df['rsi'] = ta.momentum.RSIIndicator(df['cierre'], window=self.PERIODO_RSI).rsi()
        return df

    def precio_actual(self, simbolo):
        return float(self.client.get_symbol_ticker(symbol=simbolo)['price'])

    def guardar_estado(self):
        with open(self.ARCHIVO_ESTADO,'w') as f:
            json.dump(self.estado, f, indent=2)

    def cargar_estado(self):
        estado = {}
        # 1) Lee archivo si existe
        if os.path.exists(self.ARCHIVO_ESTADO):
            try:
                with open(self.ARCHIVO_ESTADO,'r') as f:
                    contenido = f.read().strip()
                    if contenido:
                        estado = json.loads(contenido)
            except Exception as e:
                print(f"⚠️ Error leyendo estado: {e}")

        # 2) Asegura todas las claves de CONFIG con precio_max=0.0
        for sym in self.CONFIG:
            if sym not in estado:
                estado[sym] = {
                    'en_posicion': False,
                    'precio_entrada': 0.0,
                    'precio_max': 0.0   # <-- agregado
                }
            else:
                # si existe pero falta precio_max, lo inyectamos
                if 'precio_max' not in estado[sym]:
                    estado[sym]['precio_max'] = 0.0

        # 3) Guarda sólo para añadir faltantes
        try:
            with open(self.ARCHIVO_ESTADO,'w') as f:
                json.dump(estado, f, indent=2)
        except Exception as e:
            print(f"⚠️ Error guardando estado: {e}")

        return estado

    def comprar(self, simbolo, rsi):
        precio = self.precio_actual(simbolo)
        qty = self.cantidad_por_compra(precio, simbolo)
        if qty == 0:
            return 0
        try:
            self.client.order_market_buy(symbol=simbolo, quantity=qty)
            # inicializa precio_max para trailing
            self.estado[simbolo] = {
                'en_posicion': True,
                'precio_entrada': precio,
                'precio_max': precio
            }
            self.registrar_operacion(simbolo,'COMPRA',precio,rsi,'', precio,precio)
            self.guardar_estado()
            return precio
        except Exception as e:
            print(f"Error comprando {simbolo}: {e}")
            return 0

    def vender(self, simbolo, rsi, precio_entrada):
        precio = self.precio_actual(simbolo)
        qty = self.cantidad_por_compra(precio_entrada, simbolo)
        if qty == 0:
            return
        try:
            self.client.order_market_sell(symbol=simbolo, quantity=qty)
            cambio_pct = (precio - precio_entrada)/precio_entrada*100
            max_price = self.estado[simbolo].get('precio_max','')
            self.registrar_operacion(simbolo,'VENTA', precio, rsi, cambio_pct, max_price, precio)
            # cierra posición
            self.estado[simbolo] = {'en_posicion': False, 'precio_entrada': 0.0, 'precio_max': 0.0}
            self.guardar_estado()
        except Exception as e:
            print(f"Error vendiendo {simbolo}: {e}")

    def run(self):
        while not self.stop_event.is_set():
            try:
                for sym, cfg in self.CONFIG.items():
                    df = self.calcular_rsi(self.obtener_velas(sym, self.INTERVALO))
                    rsi = df['rsi'].iloc[-1]
                    precio = self.precio_actual(sym)
                    en_pos = self.estado[sym]['en_posicion']
                    entrada = self.estado[sym]['precio_entrada']

                    if en_pos:
                        # Actualiza máximo
                        if precio > self.estado[sym]['precio_max']:
                            self.estado[sym]['precio_max'] = precio
                            self.guardar_estado()

                        # Calcula trailing stop price
                        stop_pct = self.PORCENTAJE_STOP + self.COMISION_TOTAL*100
                        precio_stop = self.estado[sym]['precio_max'] * (1 - stop_pct/100)

                        if precio <= precio_stop:
                            self.vender(sym, rsi, entrada)

                    else:
                        # Entrada por RSI oversold
                        if rsi < cfg['rsi_sobreventa']:
                            self.comprar(sym, rsi)

                    if self.stop_event.is_set():
                        break

                time.sleep(60)

            except Exception as e:
                print(f"Error en ciclo principal: {e}")
                time.sleep(10)

    def get_estado(self):
        estado_completo = {}

        for simbolo, datos in self.estado.items():
            rsi_actual = None
            try:
                # Traemos pocas velas para calcular RSI actual (14 + buffer)
                df = self.obtener_velas(simbolo, self.INTERVALO, limite=20)
                df = self.calcular_rsi(df)
                rsi_actual = round(df['rsi'].iloc[-1], 2)
            except Exception as e:
                print(f"⚠️ Error calculando RSI para {simbolo}: {e}")

            estado_completo[simbolo] = {
                'en_posicion': datos.get('en_posicion', False),
                'precio_entrada': round(datos.get('precio_entrada', 0.0), 6),
                'precio_max': round(datos.get('precio_max', 0.0), 6),
                'rsi': rsi_actual,
            }

        return estado_completo
