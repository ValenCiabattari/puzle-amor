# Puzle a Distancia

Un prototipo web para armar un puzle con una foto propia, pensado para jugar en pareja a distancia.

Sitio publicado: https://valenciabattari.github.io/puzle-amor/

## Funciones actuales

- Subir una foto desde el navegador.
- Elegir cantidad de piezas.
- Mover piezas en una mesa con zoom y centrado.
- Encaje automático cuando una pieza cae cerca de su lugar.
- Guardado automático del progreso en el dispositivo.
- Sala online entre dos navegadores con movimientos, chat, cursores y celebraciones en vivo.

## Nota técnica

La sala online usa PeerJS/WebRTC. PeerJS usa un servidor de señalización para que los navegadores se encuentren; después, los datos viajan por el canal entre pares cuando la red lo permite.
