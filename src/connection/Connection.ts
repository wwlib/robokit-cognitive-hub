import { RCSCommand } from 'robokit-command-system';
import { Socket } from 'socket.io';
import ASRSessionHandler from '../asr/ASRSessionHandler'
import { ASRStreamingSessionConfig } from 'cognitiveserviceslib'

export enum ConnectionType {
    DEVICE = 'device',
    APP = 'app',
    CONTROLLER = 'controller',
}

export enum ConnectionEventType {
    COMMAND_FROM = 'command_from',
    COMMAND_TO = 'command_to',
    MESSAGE_FROM = 'message_from',
    MESSAGE_TO = 'message_to',
    AUDIO_BYTES_FROM = 'audio_bytes_from'
}

export default class Connection {

    private _type: ConnectionType;
    private _socket: Socket | undefined;
    private _socketId: string;
    private _accountId: string;
    private _syncOffset: number;
    private _lastSyncTimestamp: number;

    // analytics
    private _commandCountFrom: number;
    private _commandCountFromQuota: number;
    private _commandCountTo: number;
    private _messageCountFrom: number;
    private _messageCountFromQuota: number;
    private _messageCountTo: number;
    private _audioBytesFrom: number;
    private _audioBytesFromQuota: number;

    private _asrSessionHandler: ASRSessionHandler | undefined

    constructor(type: ConnectionType, socket: Socket, accountId: string) {
        this._type = type
        this._socket = socket
        this._socketId = socket.id
        this._accountId = accountId
        this._syncOffset = 0
        this._lastSyncTimestamp = 0
        this._commandCountFrom = 0
        this._commandCountFromQuota = 0
        this._commandCountTo = 0
        this._messageCountFrom = 0
        this._messageCountFromQuota = 0
        this._messageCountTo = 0
        this._audioBytesFrom = 0
        this._audioBytesFromQuota = 0
        this._syncOffset = 0;
    }

    get accountId(): string {
        return this._accountId
    }

    get syncOffest(): number {
        return this._syncOffset
    }

    toString(): string {
        const syncOffset = Math.round(this._syncOffset * 1000) / 1000
        return `${this._accountId}: [${this._socketId.substring(0, 6)}] syncOffset: ${syncOffset} ms, commandsFrom: ${this._commandCountFrom}. messagesFrom: ${this._messageCountFrom}, audioFrom: ${this._audioBytesFrom}`
    }

    sendMessage(message: unknown) {
        if (this._socket && this._socket.connected) {
            this._socket.emit('message', message)
        }
    }

    sendCommand(command: RCSCommand) {
        if (this._socket && this._socket.connected) {
            this._socket.emit('command', command)
        }
    }

    onAnalyticsEvent(eventType: ConnectionEventType, data: string | number) {
        switch (eventType) {
            case ConnectionEventType.COMMAND_FROM:
                this._commandCountFrom += 1
                break;
            case ConnectionEventType.COMMAND_TO:
                this._commandCountTo += 1
                break;
            case ConnectionEventType.MESSAGE_FROM:
                this._messageCountFrom += 1
                break;
            case ConnectionEventType.MESSAGE_TO:
                this._messageCountTo += 1
                break;
            case ConnectionEventType.AUDIO_BYTES_FROM:
                this._audioBytesFrom += +data
                break;
        }
    }

    onSyncOffset(offset: number) {
        this._syncOffset = offset
    }

    emitEvent(eventName: string, data?: any) {
        if (this._socket) {
            this._socket.emit(eventName, data)
        }
    }

    // AsrSessionHandler

    startAudio() {
        if (this._asrSessionHandler) {
            this._asrSessionHandler.dispose()
        }
        // TODO: put this somewhere better
        const asrConfig: ASRStreamingSessionConfig = {
            lang: 'en-US',
            hints: undefined,
            regexpEOS: undefined,
            maxSpeechTimeout: 60 * 1000,
            eosTimeout: 2000,
            providerConfig: {
                AzureSpeechSubscriptionKey: process.env.AZURE_SPEECH_SUBSCRIPTION_KEY || "<YOUR-AZURE-SUBSCRIPTION-KEY>",
                AzureSpeechTokenEndpoint: process.env.AZURE_SPEECH_TOKEN_ENDPOINT || "https://azurespeechserviceeast.cognitiveservices.azure.com/sts/v1.0/issuetoken",
                AzureSpeechRegion: process.env.AZURE_SPEECH_REGION || "eastus",
            }
        }
        this._asrSessionHandler = new ASRSessionHandler(this, asrConfig)
        this._asrSessionHandler.startAudio()
    }

    provideAudio(data: Buffer) {
        if (this._asrSessionHandler) {
            this._asrSessionHandler.provideAudio(data)
        }
    }

    endAudio() {
        if (this._asrSessionHandler) {
            this._asrSessionHandler.endAudio()
        }
    }

    dispose() {

    }
}