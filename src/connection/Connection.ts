import { Socket } from 'socket.io';
import ConnectionManager from 'src/connection/ConnectionManager';
import { RCSCommand, RCSCommandType, RCSCommandName } from 'robokit-command-system'
import ASRSessionHandler, { ASRSessionHandlerCallbackType } from '../asr/ASRSessionHandler'
import { ASRStreamingSessionConfig } from 'cognitiveserviceslib'
import SkillsController, { SkillsControllerCallbackType } from 'src/skills/SkillsController';
import SkillsManager, { SkillsManifest } from 'src/skills/SkillsManager';
import TTSSessionHandler, { TTSSessionConfig, TTSSessionHandlerCallbackType } from 'src/tts/TTSSessionHandler';

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
    private _commandCountFromByType: any;
    private _messageCountFromQuota: number;
    private _messageCountTo: number;
    private _audioBytesFrom: number;
    private _audioBytesFromQuota: number;

    private _asrSessionHandler: ASRSessionHandler | undefined
    private _ttsSessionHandler: TTSSessionHandler | undefined
    private _skillsController: SkillsController | undefined

    constructor(type: ConnectionType, socket: Socket, accountId: string) {
        this._type = type
        this._socket = socket
        this._socketId = socket.id
        this._accountId = accountId
        this._syncOffset = 0
        this._lastSyncTimestamp = 0
        this._commandCountFrom = 0
        this._commandCountFromByType = {}
        this._commandCountFromQuota = 0
        this._commandCountTo = 0
        this._messageCountFrom = 0
        this._messageCountFromQuota = 0
        this._messageCountTo = 0
        this._audioBytesFrom = 0
        this._audioBytesFromQuota = 0
        this._syncOffset = 0;
        this.init()
    }

    init() {
        // only Device connections have skill controllers
        // TODO: create ControllerConnection vs DeviceConnection classes
        if (this._type === ConnectionType.DEVICE) {
            SkillsManager.getInstance().getSkillsManifest()
                .then((skillsManifest: SkillsManifest) => {
                    this._skillsController = new SkillsController(this.skillsControllerCallback, { skillsManifest })
                })
        }
    }

    get type(): ConnectionType {
        return this._type
    }

    get accountId(): string {
        return this._accountId
    }

    get syncOffest(): number {
        return this._syncOffset
    }

    toString(): string {
        const syncOffset = Math.round(this._syncOffset * 1000) / 1000
        const commandCountFromByType: string = JSON.stringify(this._commandCountFromByType)
        return `${this._accountId}: [${this._socketId.substring(0, 6)}] syncOffset: ${syncOffset} ms, commandsFrom: ${this._commandCountFrom}, commandCountFromByType: ${commandCountFromByType}, messagesFrom: ${this._messageCountFrom}, audioFrom: ${this._audioBytesFrom}`
    }

    emitEvent(eventName: string, data?: any) {
        if (this._socket && this._socket.connected) {
            this._socket.emit(eventName, data)
        }
    }

    sendMessage(message: unknown) {
        this.emitEvent('message', message)
    }

    sendCommand(command: RCSCommand) {
        this.emitEvent('command', command)
    }

    onAnalyticsEvent(eventType: ConnectionEventType, data: string | number) {
        switch (eventType) {
            case ConnectionEventType.COMMAND_FROM:
                this._commandCountFrom += 1
                if (typeof data === 'string') {
                    if (!this._commandCountFromByType[data]) {
                        this._commandCountFromByType[data] = 1
                    } else {
                        this._commandCountFromByType[data] += 1
                    }
                }
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

    // AsrSessionHandler

    onAsrSOS() {
        this.emitEvent('asrSOS')
        const eventCommand: RCSCommand = {
            id: 'tbd',
            source: 'RCH:Connection',
            targetAccountId: this.accountId,
            type: RCSCommandType.event,
            name: RCSCommandName.asrSOS,
            createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
        }
        ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this.accountId, eventCommand)
    }

    onAsrEOS() {
        this.emitEvent('asrEOS')
        const eventCommand: RCSCommand = {
            id: 'tbd',
            source: 'RCH:Connection',
            targetAccountId: this.accountId,
            type: RCSCommandType.event,
            name: RCSCommandName.asrEOS,
            createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
        }
        ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this.accountId, eventCommand)
    }

    onAsrResult(data: any) {
        this.emitEvent('asrResult', data)
    }

    onAsrEnded(data: any) {
        this.emitEvent('asrEnded', data)
        const eventCommand: RCSCommand = {
            id: 'tbd',
            source: 'RCH:Connection',
            targetAccountId: this.accountId,
            type: RCSCommandType.event,
            name: RCSCommandName.asrEnded,
            createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
            payload: {
                data
            }
        }
        ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this.accountId, eventCommand)
    }

    asrSessionHandlerCallback: ASRSessionHandlerCallbackType = (event: string, data: any) => {
        // console.log(`asrSessionHandlerCallback`, event)
        switch (event) {
            case 'asrSOS':
                this.onAsrSOS()
                this._skillsController?.onAsrSOS()
                break;
            case 'asrEOS':
                this.onAsrEOS()
                this._skillsController?.onAsrEOS()
                break;
            case 'asrResult':
                this.onAsrResult(data)
                this._skillsController?.onAsrResult(data)
                break;
            case 'asrEnded':
                this.onAsrEnded(data)
                this._skillsController?.onAsrEnded(data)
                break;
        }
    }

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
        this._asrSessionHandler = new ASRSessionHandler(this.asrSessionHandlerCallback, asrConfig)
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

    // TTS

    handleTTSCommand(command: RCSCommand) {
        if (command.payload && command.payload.inputText, command.targetAccountId) {
            this.startTTS(command.payload.inputText, command.targetAccountId)
        } else {
            console.log(`Connection: handleTTSCommand: inputText is undefined. Ignoring.`)
        }
    }

    startTTS(inputText: string, targetAccountId: string) {
        if (this._ttsSessionHandler) {
            this._ttsSessionHandler.dispose()
        }
        // TODO: put this somewhere better
        const ttsConfig: TTSSessionConfig = {
            Microsoft: {
                AzureSpeechSubscriptionKey: process.env.AZURE_SPEECH_SUBSCRIPTION_KEY || "<YOUR-AZURE-SUBSCRIPTION-KEY>",
                AzureSpeechTokenEndpoint: process.env.AZURE_SPEECH_TOKEN_ENDPOINT || "https://azurespeechserviceeast.cognitiveservices.azure.com/sts/v1.0/issuetoken",
            }
        }
        this._ttsSessionHandler = new TTSSessionHandler(this.ttsSessionHandlerCallback, ttsConfig, this._socketId, targetAccountId)
        this._ttsSessionHandler.synthesizeStream(inputText)
    }

    ttsSessionHandlerCallback: TTSSessionHandlerCallbackType = (eventName: string, targetAccountId: string, data: any) => {
        console.log(`ttsSessionHandlerCallback`, eventName, targetAccountId, data)
        // send to Controller
        if (this._socket && this._socket.connected) {
            this._socket.emit(eventName, data)
        }
        // If this is a Controller connection send to targeted Device 
        if (this._type === ConnectionType.CONTROLLER) {
            ConnectionManager.getInstance().emitEventToTarget(ConnectionType.DEVICE, targetAccountId, eventName, data)
        }
    }

    // Photo

    onBase64Photo(base64PhotoData: string) {
        // console.log(`Connection: ${this._accountId}:${this._socketId}`, base64PhotoData)
        if (base64PhotoData) {
            const eventCommand: RCSCommand = {
                id: 'tbd',
                source: 'RCH:Connection',
                targetAccountId: this.accountId,
                type: RCSCommandType.event,
                name: 'base64Photo', // TODO: ass RCSCommandName.base64Photo,
                payload: base64PhotoData,
                createdAtTime: new Date().getTime(), // NOTE: hub service time IS synchronozed time
            }
            ConnectionManager.getInstance().broadcastDeviceCommandToSubscriptionsWithAccountId(this.accountId, eventCommand)
        }
    }

    // SkillsController

    skillsControllerCallback: SkillsControllerCallbackType = (event: string, messageData: any) => {
        switch (event) {
            case 'init':
                this.sendMessage({
                    source: 'RCH:Connection',
                    event: 'skillsControllerInit',
                    data: messageData,
                })
                break;
            case 'reply': // TODO: OK for now, but should send a command rather than a message
                this.sendMessage(messageData)
                // TODO: generalize this
                // {
                //     source: 'CS:RCS', event: 'reply', data: {
                //         reply: `I'm sorry. I don't yet know how to help with: ${messageData.text}`
                //     }
                // }
                // For now, if the message is from the Echo skill then generate a server-initiated TTS response
                if (messageData.source === 'RCH:EchoSkillSessionHandler' && messageData.event === 'reply' && messageData.data && messageData.data.reply) {
                    const command: RCSCommand = {
                        id: 'tbd',
                        source: 'RCH:Connection',
                        targetAccountId: this.accountId,
                        type: RCSCommandType.command,
                        name: 'tts',
                        payload: {
                            inputText: messageData.data.reply,
                            status: 'REQUESTED',
                            requestId: 'tbd'
                        },
                        createdAtTime: new Date().getTime()
                    }
                    this.sendCommand(command) // let the Device know that TTS is coming
                    this.handleTTSCommand(command) // make a TTS request for the targeted Device
                }
        }
    }


    dispose() {

    }
}
