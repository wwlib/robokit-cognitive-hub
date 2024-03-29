/**
 * ASRSessionHandler manages the streaming of audio to an ASR/TTS cognitive service (i.e. Azure STT).
 *
 * @module
 */

import { EventEmitter } from 'events';
import {
    ASRStreamingSessionConfig,
    ASRStreamingSessionWrapper,
    Logger
} from 'cognitiveserviceslib'

const WavFileWriter = require('wav').FileWriter;

export type ASRSessionHandlerCallbackType = (event: string, data?: any) => void

export class ASRSessionHandler extends EventEmitter {

    private _callback: ASRSessionHandlerCallbackType
    private _logger: Logger
    private _asrConfig: ASRStreamingSessionConfig | undefined
    private _asrStreamingSessionWrapper: ASRStreamingSessionWrapper | undefined
    private _outputFileStream: any

    constructor(callback: ASRSessionHandlerCallbackType, asrConfig: ASRStreamingSessionConfig) {
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

    /**
     * Takes a chunk of audio data and passes it to the ASrStreamingSessionWrapper which forwards it to the ASR/STT service.
     * @param data Audio data to be sent to the ASR/TTS service
     */
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
                this._callback('asrEnd', result)
                if (this._asrStreamingSessionWrapper) {
                    this._asrStreamingSessionWrapper.dispose()
                    this._asrStreamingSessionWrapper = undefined
                }
            })
            this._asrStreamingSessionWrapper.on('ERROR', (error) => this._logger.debug('wrapper', 'ERROR', error))
            this._asrStreamingSessionWrapper.start()

            /** in DEBUG mode, audio is output to `asrSession-out.wav` */
            if (process.env.DEBUG === 'true') {
                this._outputFileStream = new WavFileWriter(`asrSession-out.wav`, {
                    sampleRate: 16000,
                    bitDepth: 16,
                    channels: 1
                });
            }
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
