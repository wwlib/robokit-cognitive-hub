import { EventEmitter } from 'events';
import {
    ASRStreamingSessionConfig,
    ASRStreamingSessionWrapper,
    Logger
} from 'cognitiveserviceslib'

const WavFileWriter = require('wav').FileWriter;

export type AsrSessionHandlerCallbackType = (event: string, data?: any) => void

export default class ASRSessionHandler extends EventEmitter {

    private _callback: AsrSessionHandlerCallbackType
    private _logger: Logger
    private _asrConfig: ASRStreamingSessionConfig | undefined
    private _asrStreamingSessionWrapper: ASRStreamingSessionWrapper | undefined
    private _outputFileStream: any

    constructor(callback: AsrSessionHandlerCallbackType, asrConfig: ASRStreamingSessionConfig) {
        super()
        this._callback = callback
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
                this._callback('asrSOS')
            })
            this._asrStreamingSessionWrapper.on('EOS', () => {
                this._logger.debug('wrapper', 'EOS')
                this._callback('asrEOS')
            })
            this._asrStreamingSessionWrapper.on('EOS_TIMEOUT', (result) => this._logger.debug('wrapper', 'EOS_TIMEOUT', result))
            this._asrStreamingSessionWrapper.on('RESULT', (result) => {
                this._logger.debug('wrapper', 'RESULT', result)
                this._callback('asrResult', result)
            })
            this._asrStreamingSessionWrapper.on('SESSION_ENDED', (result) => {
                this._logger.debug('wrapper', 'SESSION_ENDED', result)
                this._callback('asrEnded', result)
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

    dispose() {
        if (this._asrStreamingSessionWrapper) {
            this._asrStreamingSessionWrapper.dispose()
            this._asrStreamingSessionWrapper = undefined
        }
        this.endAudio()
    }
}
