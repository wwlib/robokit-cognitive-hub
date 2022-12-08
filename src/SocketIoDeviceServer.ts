import { Server as HTTPServer } from 'http'
import { Server as SocketIoServer } from 'socket.io'
import { JwtAuth } from './auth/JwtAuth'
import ConnectionManager from 'src/connection/ConnectionManager'
import { ConnectionEventType, ConnectionType } from 'src/connection/Connection'
import { RCSCommand, RCSCommandType, RCSCommandName } from 'robokit-command-system'


export const setupSocketIoDeviceServer = (httpServer: HTTPServer, path: string): SocketIoServer => {
    const ioSocketServer = new SocketIoServer(httpServer, {
        path: path,
        cors: {
            origin: process.env.CORS_ORIGIN, // 'http://localhost:3000',
            methods: ["GET", "POST"]
        }
    })

    ioSocketServer.use(function (socket, next) {
        var auth = socket.request.headers.authorization
        // console.log("auth", auth)
        if (auth) {
            const token = auth.replace("Bearer ", "")
            console.log("auth token", token)
            if (!token) {
                return next(new Error('socket.io DEVICE connection: unauthorized: Missing token.'))
            }
            let decodedAccessToken: any
            try {
                decodedAccessToken = JwtAuth.decodeAccessToken(token)
                console.log(decodedAccessToken)
                socket.data.accountId = decodedAccessToken.accountId
            } catch (error: any) {
                console.error(error)
                return next(new Error('socket.io DEVICE connection: unauthorized: Invalid token.'))
            }
            return next()
        } else {
            return next(new Error("no authorization header"))
        }
    })

    ioSocketServer.on('connection', function (socket) {
        console.log(`socket.io: on DEVICE connection:`, socket.id)
        const connection = ConnectionManager.getInstance().addConnection(ConnectionType.DEVICE, socket, socket.data.accountId)
        socket.emit('message', { source: 'RCH', event: 'handshake', message: 'DEVICE connection accepted' })

        socket.on('command', (command: RCSCommand) => {
            if (command.type !== 'sync') {
                console.log(`DeviceServer: on command:`, socket.id, socket.data.accountId, command)
            }
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionEventType.COMMAND_FROM)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.COMMAND_TO)
            if (command.type === RCSCommandType.sync && command.name === RCSCommandName.syncOffset) {
                if (command.payload && typeof command.payload.syncOffset === 'number' ) {
                    if (connection) {
                        // console.log(`updating syncOffset for device socket: ${socket.id}`)
                        connection.onSyncOffset(command.payload.syncOffset)
                    }
                }
            } else {
                ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(socket.data.accountId, command)
            }
        })

        socket.on('message', (message) => {
            console.log(`on message: ${message}`, socket.id, socket.data.accountId)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionEventType.MESSAGE_FROM)
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.CONTROLLER, socket, ConnectionEventType.MESSAGE_TO)
            ConnectionManager.getInstance().broadcastDeviceMessageToSubscriptionsWithAccountId(socket.data.accountId, { message: message })
            socket.emit('message', { source: 'RCH', event: 'ack', data: message })
        })

        socket.once('disconnect', function (reason) {
            console.log(`on DEVICE disconnect: ${reason}: ${socket.id}`)
            ConnectionManager.getInstance().removeConnection(ConnectionType.DEVICE, socket)
        })

        // ASR streaming

        socket.on('asrAudioStart', () => {
            console.log(`on asrAudioStart`)
            if (connection) {
                connection.startAudio()
            }
        })

        socket.on('asrAudio', (data: Buffer) => {
            // console.log(`on asrAudio`, data)
            if (data) {
                ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionEventType.AUDIO_BYTES_FROM, data.length)
                if (connection) {
                    connection.provideAudio(data)
                }
            } else {
                console.log(`on asrAudio: NOT sending empty audio data.`)
            }
        })

        socket.on('asrAudioEnd', () => {
            console.log(`on asrAudioEnd`)
            if (connection) {
                connection.endAudio()
            }
        })

        // photo

        socket.on('base64Photo', (base64PhotoData: string) => {
            console.log(`on base64Photo:`, base64PhotoData)
            if (connection) {
                connection.onBase64Photo(base64PhotoData)
            }
        })

        // time sync

        socket.on('timesync', function (data) {
            // console.log('device timesync message:', data)
            socket.emit('timesync', {
                id: data && 'id' in data ? data.id : null,
                result: Date.now()
            })
        })
    })

    return ioSocketServer
}
