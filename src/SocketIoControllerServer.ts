/**
 * This is the doc comment for SocketIoControllerServer.ts
 *
 * @module
 */

import { Server as HTTPServer } from 'http'
import { Server as SocketIoServer } from 'socket.io'
import { JwtAuth } from './auth/JwtAuth'
import ConnectionManager from 'src/connection/ConnectionManager'
import { ConnectionEventType, ConnectionType } from 'src/connection/Connection'
import { RCSCommand, RCSCommandType, RCSCommandName } from 'robokit-command-system'

/** setupSocketIoControllerServer is... */
export const setupSocketIoControllerServer = (httpServer: HTTPServer, path: string): SocketIoServer => {
    const ioSocketServer = new SocketIoServer(httpServer, {
        path: path,
        cors: {
            origin: process.env.CORS_ORIGIN, // 'http://localhost:3000',
            methods: ["GET", "POST"]
        }
    })

    ioSocketServer.use(function (socket, next) {
        var auth = socket.request.headers.authorization
        if (auth) {
            const token = auth.replace("Bearer ", "")
            if (!token) {
                return next(new Error('socket.io CONTROLLER connection: unauthorized: Missing token.'))
            }
            let decodedAccessToken: any
            try {
                decodedAccessToken = JwtAuth.decodeAccessToken(token)
                if (process.env.DEBUG === 'true') {
                    console.log('DEBUG: ControllerServer: decoded access token:')
                    console.log(decodedAccessToken)
                }
                socket.data.accountId = decodedAccessToken.accountId
            } catch (error: any) {
                // TODO: remove log & throw
                console.error(error)
                return next(new Error('ControllerServer connection: unauthorized: Invalid token.'))
            }
            return next()
        }
        // return next()
        else {
            return next(new Error("no authorization header"))
        }
    })

    ioSocketServer.on('connection', function (socket) {
        if (process.env.DEBUG === 'true') {
            console.log(`DEBUG: ControllerServer: on CONTROLLER connection:`, socket.id)
        }
        const connection = ConnectionManager.getInstance().addConnection(ConnectionType.CONTROLLER, socket, socket.data.accountId)
        socket.emit('message', { source: 'RCH:ControllerServer', event: 'handshake', message: 'Controller connection accepted' })

        socket.on('command', (command: RCSCommand) => {
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.COMMAND_FROM, command.type)
            if (command.type === 'hubCommand') {
                if (process.env.DEBUG === 'true') {
                    console.log(`DEBUG: ControllerServer: on hub command:`, socket.id, socket.data?.accountId, command)
                }
                if (command.name === 'subscribe' && command.payload && command.payload.connectionType === 'device' && command.payload.accountId) {
                    
                    ConnectionManager.getInstance().subscribeToConnection(ConnectionType.DEVICE, command.payload.accountId, socket)
                    command = {
                        id: 'tbd',
                        source: 'RCH:ControllerServer',
                        targetAccountId: command.payload.accountId, // accountId of targeted device/app
                        type: RCSCommandType.hubCommand,
                        message: `subscribed to ${command.payload.accountId}`,
                        name: RCSCommandName.notification, // added string to allow flexibility during development
                        payload: {
                            event: 'subscribed-to',
                            targetAccountId: command.payload.accountId,
                        },
                        createdAtTime: new Date().getTime() // server time is synchronized time
                    }
                    socket.emit('command', command) // ACK
                } else if (command.name === 'tts') {
                    if (connection) {
                        connection.handleTTSCommand(command)
                    }
                }
            } else if (command.type === RCSCommandType.sync) {
                if (process.env.DEBUG_CLOCK_SYNC === 'true') {
                    console.log(`DEBUG_CLOCK_SYNC: ControllerServer: on sync command:`, socket.id, socket.data.accountId, command)
                }
                if (command.name === RCSCommandName.syncOffset && command.payload && typeof command.payload.syncOffset === 'number') {
                    if (connection) {
                        if (process.env.DEBUG_CLOCK_SYNC === 'true') {
                            console.log(`DEBUG_CLOCK_SYNC: ControllerServer: updating syncOffset for Controller socket: ${socket.id}`)
                        }
                        connection.onSyncOffset(command.payload.syncOffset)
                    }
                }
            } else {
                if (process.env.DEBUG === 'true') {
                    console.log(`DEBUG: ControllerServer: on command:`, socket.id, socket.data.accountId, command)
                }

                // route command to device
                if (command && command.targetAccountId) {
                    ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.COMMAND_TO, command.type)
                    ConnectionManager.getInstance().sendCommandToTarget(ConnectionType.DEVICE, command.targetAccountId, command)
                }
            }
        })

        socket.once('disconnect', function (reason) {
            console.log(`ControllerServer: on CONTROLLER disconnect: ${reason}: ${socket.id}`)
            ConnectionManager.getInstance().removeConnection(ConnectionType.CONTROLLER, socket)
        })

        // time sync

        socket.on('timesync', function (data) {
            // console.log('ControllerServer: controller timesync message:', data)
            socket.emit('timesync', {
                id: data && 'id' in data ? data.id : null,
                result: Date.now()
            })
        })
    })

    return ioSocketServer
}
