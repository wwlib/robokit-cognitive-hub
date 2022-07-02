import { Socket } from 'socket.io';
import Connection, { ConnectionType, ConnectionEventType } from './Connection';
import Subscription, { SubscriptionEventCallback } from './Subscription';



export default class ConnectionManager {

    private static instance: ConnectionManager

    private _deviceConnections: Map<string, Connection>
    private _deviceSubscriptions: { [accountId: string]: Subscription[] }
    private _controllerConnections: Map<string, Connection>
    private _appConnections: Map<string, Connection>
    private _appSubscriptions: { [accountId: string]: Subscription[] }

    private constructor() {
        this._deviceConnections = new Map<string, Connection>()
        this._deviceSubscriptions = {}
        this._controllerConnections = new Map<string, Connection>()
        this._appConnections = new Map<string, Connection>()
        this._appSubscriptions = {}
    }

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager()
        }
        return ConnectionManager.instance
    }

    getConnectionsWithType(type: ConnectionType): Map<string, Connection> | undefined {
        let result: Map<string, Connection> | undefined = undefined
        switch (type) {
            case ConnectionType.DEVICE:
                result = this._deviceConnections
                break;
            case ConnectionType.APP:
                result = this._appConnections
                break;
            case ConnectionType.CONTROLLER:
                result = this._controllerConnections
                break;
        }
        return result
    }

    getConnectionsAsArray(type: ConnectionType): Connection[] | undefined {
        let result: Map<string, Connection> | undefined = this.getConnectionsWithType(type)
        if (result) {
            return Array.from(this._deviceConnections.values())
        } else {
            return undefined
        }
    }

    getConnectionWithTypeAndSocketId(type: ConnectionType, socketId: string): Connection | undefined {
        let result: Connection | undefined = undefined
        const connections: Map<string, Connection> | undefined  = this.getConnectionsWithType(type)
        if (connections) {
            result = connections.get(socketId)
        }
        return result
    }

    addConnection(type: ConnectionType, socket: Socket, accountId: string) {
        if (socket && socket.id) {
            const connection: Connection = new Connection(type, socket, accountId)
            this._deviceConnections.set(socket.id, connection)
        } else {
            throw new Error('Invalid socket.')
        }
    }

    removeConnection(type: ConnectionType, socket: Socket) {
        const connections = this.getConnectionsWithType(type)
        if (connections && socket) {
            connections.delete(socket.id)
        }
    }

    onConnectionEvent(type: ConnectionType, socket: Socket, event: ConnectionEventType, data?: string | number) {
        const connection = this.getConnectionWithTypeAndSocketId(type, socket.id)
        if (connection) {
            connection.onEvent(event, data || '')
        }
    }


    subscribeToConnection(type: ConnectionType, accountId: string, eventCallback: SubscriptionEventCallback) {
        const connections = this.getConnectionsWithType(type)
        if (connections) {
            // connections.delete(socket.id)
        }
    }

    unsubscribeFromConnection(type: ConnectionType, accountId: string, eventCallback: SubscriptionEventCallback) {
        const connections = this.getConnectionsWithType(type)
        if (connections) {
            // connections.delete(socket.id)
        }
    }
}