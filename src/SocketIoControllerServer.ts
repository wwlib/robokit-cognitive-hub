import { Server as HTTPServer } from 'http'
import { Server as SocketIoServer } from 'socket.io'
import { JwtAuth } from './auth/JwtAuth'
import ConnectionManager from 'src/connection/ConnectionManager'
import { ConnectionEventType, ConnectionType } from 'src/connection/Connection'
import { RCSCommand, RCSCommandType, RCSCommandName } from 'robokit-command-system'

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
                console.log(decodedAccessToken)
                socket.data.accountId = decodedAccessToken.accountId
            } catch (error: any) {
                console.error(error)
                return next(new Error('socket.io CONTROLLER connection: unauthorized: Invalid token.'))
            }
            return next()
        }
        // return next()
        else {
            return next(new Error("no authorization header"))
        }
    })

    ioSocketServer.on('connection', function (socket) {
        console.log(`socket.io: on CONTROLLER connection:`, socket.id)
        const connection = ConnectionManager.getInstance().addConnection(ConnectionType.CONTROLLER, socket, socket.data.accountId)
        socket.emit('message', { message: 'Hub message: A new CONTROLLER has joined!' })

        socket.on('command', (command: RCSCommand) => {
            console.log(`ControllerServer: on command:`, socket.id, command)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.COMMAND_FROM)

            if (command.type === 'hubCommand' && command.name === 'subscribe' && command.payload && command.payload.connectionType === 'device' && command.payload.accountId) {
                ConnectionManager.getInstance().subscribeToConnection(ConnectionType.DEVICE, command.payload.accountId, socket)
                command = {
                    id: 'tbd',
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
                socket.emit('command', command)
            } else if (command.type === RCSCommandType.sync && command.name === RCSCommandName.syncOffset) {
                if (command.payload && typeof command.payload.syncOffset === 'number') {
                    if (connection) {
                        console.log(`updating syncOffset for controller socket: ${socket.id}`)
                        connection.onSyncOffset(command.payload.syncOffset)
                    }
                }
            } else {
                const accountId = command ? command.targetAccountId : 'na'
                socket.emit('message', { message: `Hub message: command received for ${accountId}: ${command.name}` })

                // route command to device
                if (command && command.targetAccountId) {
                    ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.COMMAND_TO)
                    ConnectionManager.getInstance().sendCommandToTarget(ConnectionType.DEVICE, command, command.targetAccountId)
                }
            }
        })

        socket.once('disconnect', function (reason) {
            console.log(`on CONTROLLER disconnect: ${reason}: ${socket.id}`)
            ConnectionManager.getInstance().removeConnection(ConnectionType.CONTROLLER, socket)
        })

        // time sync

        socket.on('timesync', function (data) {
            // console.log('controller timesync message:', data)
            socket.emit('timesync', {
                id: data && 'id' in data ? data.id : null,
                result: Date.now()
            })
        })
    })

    return ioSocketServer
}
