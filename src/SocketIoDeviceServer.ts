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
            // console.log("auth token", token)
            if (!token) {
                return next(new Error('socket.io DEVICE connection: unauthorized: Missing token.'))
            }
            let decodedAccessToken: any
            try {
                decodedAccessToken = JwtAuth.decodeAccessToken(token)
                if (process.env.DEBUG === 'true') {
                    console.log('DEBUG: DeviceServer: decoded access token:')
                    console.log(decodedAccessToken)
                }
                socket.data.accountId = decodedAccessToken.accountId
            } catch (error: any) {
                // TODO: remove log & throw
                console.error(error)
                return next(new Error('DeviceServer: connection: unauthorized: Invalid token.'))
            }
            return next()
        } else {
            return next(new Error("no authorization header"))
        }
    })

    ioSocketServer.on('connection', function (socket) {
        console.log(`DeviceServer: on DEVICE connection:`, socket.id)
        const connection = ConnectionManager.getInstance().addConnection(ConnectionType.DEVICE, socket, socket.data.accountId)
        socket.emit('message', { source: 'RCH', event: 'handshake', message: 'DEVICE connection accepted' })

        socket.on('command', (command: RCSCommand) => {
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionEventType.COMMAND_FROM, command.type)
            if (command.type === 'hubCommand') {
                if (process.env.DEBUG === 'true') {
                    console.log(`DEBUG: DeviceServer: on hub command:`, socket.id, socket.data?.accountId, command)
                }
                if (command.name === 'tts') {
                    if (connection) {
                        connection.handleTTSCommand(command)
                    }
                }
            } else if (command.type === RCSCommandType.sync) {
                if (process.env.DEBUG_CLOCK_SYNC === 'true') {
                    console.log(`DEBUG_CLOCK_SYNC: DeviceServer: on sync command:`, socket.id, socket.data.accountId, command)
                }
                if (command.name === RCSCommandName.syncOffset && command.payload && typeof command.payload.syncOffset === 'number' ) {
                    if (connection) {
                        if (process.env.DEBUG_CLOCK_SYNC === 'true') {
                            console.log(`DEBUG_CLOCK_SYNC: DeviceServer: updating syncOffset for Device socket: ${socket.id}`)
                        }
                        connection.onSyncOffset(command.payload.syncOffset)
                    }
                }
            } else {
                if (process.env.DEBUG === 'true') {
                    console.log(`DEBUG: DeviceServer: on command:`, socket.id, socket.data.accountId, command)
                }
                ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(socket.data.accountId, command)
            }
        })

        socket.on('message', (message) => {
            if (process.env.DEBUG === 'true') {
                console.log(`DEBUG: DeviceServer: on message: ${message}`, socket.id, socket.data.accountId)
            }
            ConnectionManager.getInstance().onAnalyticsEvent(ConnectionType.DEVICE, socket, ConnectionEventType.MESSAGE_FROM, message.event)
            ConnectionManager.getInstance().broadcastDeviceMessageToSubscriptionsWithAccountId(socket.data.accountId, { message: message })
            // TODO: send ack?
            // socket.emit('message', { source: 'RCH', event: 'ack', data: message })
        })

        socket.once('disconnect', function (reason) {
            console.log(`DeviceServer: on DEVICE disconnect: ${reason}: ${socket.id}`)
            ConnectionManager.getInstance().removeConnection(ConnectionType.DEVICE, socket)
        })

        // ASR streaming

        socket.on('asrAudioStart', () => {
            console.log(`DeviceServer: on asrAudioStart`)
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
                console.log(`DeviceServer: on asrAudio: NOT sending empty audio data.`)
            }
        })

        socket.on('asrAudioEnd', () => {
            console.log(`DeviceServer: on asrAudioEnd`)
            if (connection) {
                connection.endAudio()
            }
        })

        // photo

        socket.on('base64Photo', (base64PhotoData: string) => {
            if (process.env.DEBUG === 'true') {
                console.log(`DEBUG: DeviceServer: on base64Photo: <photo data received>`)
            }
            // console.log(`on base64Photo:`, base64PhotoData)
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
