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

        self.PORCENTAJE_TAKE = 5.0
        self.PORCENTAJE_STOP = 2.0
        self.COMISION = 0.001
        self.COMISION_TOTAL = self.COMISION * 2
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
                f.write('fecha,simbolo,accion,precio,rsi,cambio_pct,precio_objetivo,precio_actual\n')
        except FileExistsError:
            pass

    def cargar_filtros(self):
        info = self.client.get_exchange_info()
        for s in info['symbols']:
            simbolo = s['symbol']
            if simbolo in self.CONFIG:
                lot_size_filter = next(f for f in s['filters'] if f['filterType'] == 'LOT_SIZE')
                min_notional_filter = next((f for f in s['filters'] if f['filterType'] == 'NOTIONAL'), None)
                min_notional = float(min_notional_filter['minNotional']) if min_notional_filter else 0.0
                self.filtros[simbolo] = {
                    'minQty': float(lot_size_filter['minQty']),
                    'stepSize': float(lot_size_filter['stepSize']),
                    'minNotional': min_notional,
                }

    def cantidad_por_compra(self, precio, simbolo):
        presupuesto = 100 / self.total_simbolos
        step = self.filtros[simbolo]['stepSize']
        min_qty = self.filtros[simbolo]['minQty']
        min_notional = self.filtros[simbolo]['minNotional']

        cantidad_max = presupuesto / precio
        cantidad_min_notional = min_notional / precio
        cantidad_min = max(min_qty, cantidad_min_notional)
        precision = int(-math.log(step, 10))
        cantidad_min_ajustada = math.ceil(cantidad_min / step) * step
        cantidad_min_ajustada = round(cantidad_min_ajustada, precision)

        if cantidad_max < cantidad_min_ajustada:
            return 0

        cantidad_ajustada = math.floor(cantidad_max / step) * step
        cantidad_ajustada = round(cantidad_ajustada, precision)

        if cantidad_ajustada < cantidad_min_ajustada:
            cantidad_ajustada = cantidad_min_ajustada

        return cantidad_ajustada

    def registrar_operacion(self, simbolo, accion, precio, rsi, cambio_pct='', precio_objetivo='', precio_actual=''):
        with open(self.ARCHIVO_LOG, 'a') as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')},{simbolo},{accion},{precio},{round(rsi,2)},{round(cambio_pct,2) if cambio_pct != '' else ''},{precio_objetivo},{precio_actual}\n")

    def obtener_velas(self, simbolo, intervalo, limite=100):
        datos = self.client.get_klines(symbol=simbolo, interval=intervalo, limit=limite)
        df = pd.DataFrame(datos, columns=[
            'ts','apertura','max','min','cierre','volumen',
            'close_time','qav','trades','tbav','tbqav','ignore'
        ])
        df['cierre'] = df['cierre'].astype(float)
        return df

    def calcular_rsi(self, df):
        df['rsi'] = ta.momentum.RSIIndicator(df['cierre'], window=self.PERIODO_RSI).rsi()
        return df

    def precio_actual(self, simbolo):
        return float(self.client.get_symbol_ticker(symbol=simbolo)['price'])

    def guardar_estado(self):
        with open(self.ARCHIVO_ESTADO, 'w') as f:
            json.dump(self.estado, f)

    def cargar_estado(self):
        if os.path.exists(self.ARCHIVO_ESTADO):
            with open(self.ARCHIVO_ESTADO, 'r') as f:
                contenido = f.read().strip()
                if contenido:
                    return json.loads(contenido)

        estado_inicial = {
            simbolo: {'en_posicion': False, 'precio_entrada': 0.0, 'precio_objetivo': 0.0}
            for simbolo in self.CONFIG
        }
        with open(self.ARCHIVO_ESTADO, 'w') as f:
            json.dump(estado_inicial, f)

        return estado_inicial

    def comprar(self, simbolo, rsi):
        precio = self.precio_actual(simbolo)
        cantidad = self.cantidad_por_compra(precio, simbolo)
        if cantidad == 0:
            return 0
        try:
            self.client.order_market_buy(symbol=simbolo, quantity=cantidad)
            precio_objetivo = precio * (1 + self.PORCENTAJE_TAKE / 100)
            self.registrar_operacion(simbolo, 'COMPRA', precio, rsi, precio_objetivo=precio_objetivo, precio_actual=precio)
            self.estado[simbolo] = {'en_posicion': True, 'precio_entrada': precio, 'precio_objetivo': precio_objetivo}
            self.guardar_estado()
            return precio
        except Exception as e:
            print(f"Error comprando {simbolo}: {e}")
            return 0

    def vender(self, simbolo, rsi, precio_entrada):
        precio = self.precio_actual(simbolo)
        cantidad = self.cantidad_por_compra(precio_entrada, simbolo)
        if cantidad == 0:
            return
        try:
            self.client.order_market_sell(symbol=simbolo, quantity=cantidad)
            cambio_pct = (precio - precio_entrada) / precio_entrada * 100
            self.registrar_operacion(simbolo, 'VENTA', precio, rsi, cambio_pct)
            self.estado[simbolo] = {'en_posicion': False, 'precio_entrada': 0.0, 'precio_objetivo': 0.0}
            self.guardar_estado()
        except Exception as e:
            print(f"Error vendiendo {simbolo}: {e}")

    def run(self):
        while not self.stop_event.is_set():
            try:
                for simbolo, cfg in self.CONFIG.items():
                    df = self.calcular_rsi(self.obtener_velas(simbolo, self.INTERVALO))
                    rsi = df['rsi'].iloc[-1]
                    precio = self.precio_actual(simbolo)
                    en_pos = self.estado[simbolo]['en_posicion']
                    entrada = self.estado[simbolo]['precio_entrada']

                    if en_pos:
                        pct = (precio - entrada) / entrada * 100
                        if pct >= (self.PORCENTAJE_TAKE + self.COMISION_TOTAL * 100):
                            self.vender(simbolo, rsi, entrada)
                        elif pct <= -(self.PORCENTAJE_STOP + self.COMISION_TOTAL * 100):
                            self.vender(simbolo, rsi, entrada)
                    else:
                        if rsi < cfg['rsi_sobreventa']:
                            self.comprar(simbolo, rsi)

                    if self.stop_event.is_set():
                        break

                time.sleep(60)
            except Exception as e:
                print(f"Error en ciclo principal: {e}")
                time.sleep(10)

    def get_estado(self):
        return self.estado.copy()
