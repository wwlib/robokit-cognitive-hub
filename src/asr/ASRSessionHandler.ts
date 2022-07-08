import { EventEmitter } from 'events';
import {
    ASRStreamingSessionConfig,
    ASRStreamingSessionWrapper,
    Logger
} from 'cognitiveserviceslib'
import Connection from 'src/connection/Connection';
import ConnectionManager from 'src/connection/ConnectionManager';
import { RCSCommand, RCSCommandType, RCSCommandName } from 'robokit-command-system'

const WavFileWriter = require('wav').FileWriter;

export default class ASRSessionHandler extends EventEmitter {

    private _connection: Connection
    private _logger: Logger
    private _asrConfig: ASRStreamingSessionConfig | undefined
    private _asrStreamingSessionWrapper: ASRStreamingSessionWrapper | undefined
    private _outputFileStream: any

    constructor(connection: Connection, asrConfig: ASRStreamingSessionConfig) {
        super()
        this._connection = connection
        this._asrConfig = asrConfig
        this._logger = new Logger('ASRSessionHandler')
    }

    startAudio() {

    }

    endAudio() {
        if (this._outputFileStream) {
            this._outputFileStream.end()
        }
    }

    provideAudio(data: Buffer) {
        if (!this._asrConfig) {
            throw new Error('asrConfig must be defined.')
        }
        if (!this._asrStreamingSessionWrapper) {
            this._asrStreamingSessionWrapper = new ASRStreamingSessionWrapper(this._asrConfig, this._logger)
            this._asrStreamingSessionWrapper.on('SOS', () => {
                this._logger.debug('wrapper', 'SOS')
                this._connection.emitEvent('asrSOS')
                const eventCommand: RCSCommand = {
                    id: 'tbd',
                    targetAccountId: this._connection.accountId,
                    type: RCSCommandType.event,
                    name: RCSCommandName.asrSOS,
                    createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
                }
                ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this._connection.accountId, eventCommand)
            })
            this._asrStreamingSessionWrapper.on('EOS', () => {
                this._logger.debug('wrapper', 'EOS')
                this._connection.emitEvent('asrEOS')
                const eventCommand: RCSCommand = {
                    id: 'tbd',
                    targetAccountId: this._connection.accountId,
                    type: RCSCommandType.event,
                    name: RCSCommandName.asrEOS,
                    createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
                }
                ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this._connection.accountId, eventCommand)
            })
            this._asrStreamingSessionWrapper.on('EOS_TIMEOUT', (result) => this._logger.debug('wrapper', 'EOS_TIMEOUT', result))
            this._asrStreamingSessionWrapper.on('RESULT', (result) => {
                this._logger.debug('wrapper', 'RESULT', result)
                this._connection.emitEvent('asrResult', result)
            })
            this._asrStreamingSessionWrapper.on('SESSION_ENDED', (result) => {
                this._logger.debug('wrapper', 'SESSION_ENDED', result)
                this._connection.emitEvent('asrEnded', result)
                const eventCommand: RCSCommand = {
                    id: 'tbd',
                    targetAccountId: this._connection.accountId,
                    type: RCSCommandType.event,
                    name: RCSCommandName.asrEnded,
                    createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
                    payload: {
                        result
                    }
                }
                ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this._connection.accountId, eventCommand)
                if (this._asrStreamingSessionWrapper) {
                    this._asrStreamingSessionWrapper.dispose()
                    this._asrStreamingSessionWrapper = undefined
                }
            })
            this._asrStreamingSessionWrapper.on('ERROR', (error) => this._logger.debug('wrapper', 'ERROR', error))
            this._asrStreamingSessionWrapper.start()

            this._outputFileStream = new WavFileWriter(`asrSession-out.wav`, {
                sampleRate: 16000,
                bitDepth: 16,
                channels: 1
            });
        } else {
            this._asrStreamingSessionWrapper.provideAudio(data)
            if (this._outputFileStream) {
                this._outputFileStream.write(data)
            }
        }
    }

}
