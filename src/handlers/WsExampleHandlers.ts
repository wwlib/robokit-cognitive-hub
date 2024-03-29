/** 
 * WsExampleHandlers includes two example handlers for ws socket messages - for reference.
 * Note: The cognitive hub uses socket.io rather than ws
 * 
 * @module
 */

import { IncomingMessage } from 'http'
import ws, { WebSocketServer } from 'ws'

export const wsEchoHandler = (wss: WebSocketServer, ws: ws, req: IncomingMessage, token?: any) => {
  ws.on('message', (message: string) => {
    // console.log(`wsEchoHandler: ${message}`)
    ws.send(`${message}`)
  })
}

export const wsSilentHandler = (wss: WebSocketServer, ws: ws, req: IncomingMessage, token?: any) => {
  ws.on('message', (message: string | Buffer, binary: boolean) => {
    // console.log(`wsSilentHandler: ${binary} * ${message}`)
    // ws.send(`${message}`)
  })
}
