import { Socket } from 'socket.io';

export enum ConnectionType {
    DEVICE = 'device',
    APP = 'app',
    CONTROLLER = 'controller',
}

export enum ConnectionEventType {
    MESSAGE_FROM = 'message_from',
    MESSAGE_TO = 'message_to',
    AUDIO_BYTES_FROM = 'audio_bytes_from'
}

export default class Connection {

    private _type: ConnectionType;
    private _socket: Socket;
    private _socketId: string;
    private _accountId: string;
    private _syncOffset: number;
    private _lastSyncTimestamp: number;
    private _messageCountFrom: number;
    private _messageCountFromQuota: number;
    private _messageCountTo: number;
    private _audioBytesFrom: number;
    private _audioBytesFromQuota: number;

    constructor(type: ConnectionType, socket: Socket, accountId: string) {
        this._type = type
        this._socket = socket
        this._socketId = socket.id
        this._accountId = accountId
        this._syncOffset = 0
        this._lastSyncTimestamp = 0
        this._messageCountFrom = 0
        this._messageCountFromQuota = 0
        this._messageCountTo = 0
        this._audioBytesFrom = 0
        this._audioBytesFromQuota = 0
    }

    toString(): string {
        return `${this._socketId}: ${this._accountId} (${this._messageCountFrom}) (${this._audioBytesFrom})`
    }

    onEvent(eventType: ConnectionEventType, data: string | number) {
        switch (eventType) {
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
}