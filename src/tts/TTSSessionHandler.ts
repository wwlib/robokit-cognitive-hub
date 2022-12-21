import { EventEmitter } from 'events';
import {
    AzureSpeechClient,
    Logger
} from 'cognitiveserviceslib'

const fs = require('fs-extra')
const path = require('path')

export type TTSSessionHandlerCallbackType = (event: string, targetAccountId: string, data?: any) => void

export interface MicrosoftConfig {
    AzureSpeechSubscriptionKey: string
    AzureSpeechTokenEndpoint?: string
    AzureSpeechEndpointTts?: string
}

export interface TTSSessionConfig {
    Microsoft: MicrosoftConfig
}

export default class TTSSessionHandler extends EventEmitter {

    private _callback: TTSSessionHandlerCallbackType
    // private _logger: Logger
    private _ttsConfig: TTSSessionConfig | undefined
    private _socketId: string
    private _targetAccountId: string
    private _azureSpeechClient: AzureSpeechClient;

    constructor(callback: TTSSessionHandlerCallbackType, ttsConfig: TTSSessionConfig, socketId: string, targetAccountId: string) {
        super()
        this._callback = callback
        this._ttsConfig = ttsConfig
        this._socketId = socketId
        this._targetAccountId = targetAccountId
        this._azureSpeechClient = new AzureSpeechClient(this._ttsConfig);
        // this._logger = new Logger('TTSSessionHandler')
    }

    async synthesizeStream(inputText: string) {
        try {
            const audioStream: NodeJS.ReadableStream = await this._azureSpeechClient.synthesizeStream(inputText)
            // console.log(audioStream);
            if (process.env.DEBUG === 'true') {
                const filename = `ttsSession-out-${this._socketId}.wav`
                console.log(`DEBUG: TTSSessionHandler: piping TTS audio to ${filename}:`)
                const file = fs.createWriteStream(path.resolve(filename));
                audioStream.pipe(file);
            }

            if (this._callback) this._callback('ttsAudioStart', this._targetAccountId, { inputText })

            audioStream.on('data', (data: any) => {
                console.log(`TTSSessionHandler: synthesizeStream: data:`, data);
                if (this._callback) this._callback('ttsAudio', this._targetAccountId, data)
            });
            audioStream.on('end', () => {
                console.log(`TTSSessionHandler: synthesizeStream: end`);
                if (this._callback) this._callback('ttsAudioEnd', this._targetAccountId, {})
                // if (this._audioContextAudioSink) this._audioContextAudioSink.play();
                // this.setState({
                //     message: `tts: playing:`,
                //     visualizerSource: this._audioContextAudioSink
                // });
            });
            audioStream.on('error', (error) => {
                console.log(`TTSSessionHandler: synthesizeStream: on error:`, error);
                if (this._callback) this._callback('ttsAudioError', this._targetAccountId, error)
            })
        } catch (error: any) {
            console.log(`TTSSessionHandler: synthesizeStream: error:`, error);
        }
    }

    dispose() {
        this.removeAllListeners()
    }
}
