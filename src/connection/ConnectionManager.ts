/** 
 * ConnectionManager manages Connection instances - Device, Controller and App connections.
 * Controllers can subscribe to Device messages/commands. ConnectionManager manages these subscriptions.
 * When a client connects to a server (Device/Controller/App), the ConnectionManager keeps track of the associated Connection by type.
 * 
 * @module
 */

import { Socket } from 'socket.io';
import { Connection, ConnectionType, ConnectionAnalyticsEventType } from './Connection';
import { Subscription } from './Subscription';
import { RCSCommand } from 'robokit-command-system'

export class ConnectionManager {

    private static instance: ConnectionManager

    private _deviceConnections: Map<string, Connection>
    private _deviceConnectionsByAccountId: Map<string, Connection>
    private _deviceSubscriptions: Map<string, Subscription[]> // { [accountId: string]: Subscription[] }
    private _controllerConnections: Map<string, Connection>
    private _appConnections: Map<string, Connection>
    private _appSubscriptions: Map<string, Subscription[]>

    private constructor() {
        this._deviceConnections = new Map<string, Connection>()
        this._deviceConnectionsByAccountId = new Map<string, Connection>()
        this._deviceSubscriptions = new Map<string, Subscription[]>()
        this._controllerConnections = new Map<string, Connection>()
        this._appConnections = new Map<string, Connection>()
        this._appSubscriptions = new Map<string, Subscription[]>()
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
        let connections: Map<string, Connection> | undefined = this.getConnectionsWithType(type)
        if (connections) {
            return Array.from(connections.values())
        } else {
            return undefined
        }
    }

    getConnectionWithTypeAndSocketId(type: ConnectionType, socketId: string): Connection | undefined {
        let result: Connection | undefined = undefined
        const connections: Map<string, Connection> | undefined = this.getConnectionsWithType(type)
        if (connections) {
            result = connections.get(socketId)
        }
        return result
    }

    getConnectionWithTypeAndAccountId(type: ConnectionType, accountId: string): Connection | undefined {
        let result: Connection | undefined = undefined
        if (type === ConnectionType.DEVICE) {
            const connections: Map<string, Connection> | undefined = this._deviceConnectionsByAccountId
            if (connections) {
                result = connections.get(accountId)
            }
        }
        return result
    }

    addConnection(type: ConnectionType, socket: Socket, accountId: string): Connection | undefined {
        let connection: Connection | undefined = undefined
        const connections = this.getConnectionsWithType(type)
        if (connections && socket && socket.id) {
            connection = new Connection(type, socket, accountId, 'use-token-instead') // TODO: pass access_token & refresh_token for skill logins
            connections.set(socket.id, connection)
            // update _deviceConnectionsByAccountId
            if (type === ConnectionType.DEVICE && accountId) {
                this._deviceConnectionsByAccountId.set(accountId, connection)
            }
        } else {
            throw new Error(`Error adding connection type: ${type}`)
        }
        return connection
    }

    removeConnection(type: ConnectionType, socket: Socket) {
        const connections = this.getConnectionsWithType(type)
        if (connections && socket) {
            const connection = connections.get(socket.id)
            connections.delete(socket.id)
            // update _deviceConnectionsByAccountId
            if (connection && type === ConnectionType.DEVICE && connection.accountId) {
                this._deviceConnectionsByAccountId.delete(connection.accountId)
            }
        }
    }

    onAnalyticsEvent(type: ConnectionType, socket: Socket, eventType: ConnectionAnalyticsEventType, data?: string | number) {
        const connection = this.getConnectionWithTypeAndSocketId(type, socket.id)
        if (connection) {
            connection.onAnalyticsEvent(eventType, data || '')
        }
    }

    subscribeToConnection(type: ConnectionType, accountId: string, socket: Socket) {
        if (type === ConnectionType.DEVICE) {
            const connection = this._controllerConnections.get(socket.id)
            if (connection) {
                const newSubscription: Subscription = new Subscription(accountId, socket.data.accountId,
                    (command) => {
                        connection.sendCommand(command)
                    },
                    (message) => {
                        connection.sendMessage(message)
                    })
                const subscriptions = this._deviceSubscriptions.get(accountId) || []
                this._deviceSubscriptions.set(accountId, [...subscriptions, newSubscription])
                console.log(`ConnectionManager: subscribeToConnection: ${type}, ${accountId}`)
            }
        }
    }

    unsubscribeFromConnection(type: ConnectionType, accountId: string) {
        if (type === ConnectionType.DEVICE) {
            const subscriptions = this._deviceSubscriptions.get(accountId)
            if (subscriptions) {
                // const filteredSubscriptions = subscriptions.filter((subscription) => subscription.accountId != accountId);
                let filteredSubscriptions: Subscription[] = []
                subscriptions.forEach((subscription: Subscription) => {
                    if (subscription.accountId === accountId) {
                        console.log(`ConnectionManager: unsubscribeFromConnection ${type}, ${accountId}`)
                        subscription.dispose()
                    } else {
                        filteredSubscriptions.push(subscription)
                    }
                })
                this._deviceSubscriptions.set(accountId, filteredSubscriptions)
            }
        }
    }

    broadcastDeviceCommandToSubscriptionsWithAccountId(accountId: string, command: RCSCommand) {
        const subscriptions: Subscription[] | undefined = this._deviceSubscriptions.get(accountId)
        if (subscriptions) {
            subscriptions.forEach((subscription: Subscription) => {
                // console.log(`broadcasting command to subscribers to: ${subscription.accountId}:`, subscription)
                subscription.onCommand(command)
            })
        }
    }

    broadcastDeviceMessageToSubscriptionsWithAccountId(accountId: string, message: unknown) {
        const subscriptions: Subscription[] | undefined = this._deviceSubscriptions.get(accountId)
        if (subscriptions) {
            subscriptions.forEach((subscription: Subscription) => {
                // console.log(`broadcasting message to subscribers to: ${subscription.accountId}:`, subscription)
                subscription.onMessage(message)
            })
        }
    }

    sendCommandToTarget(type: ConnectionType, targetAccountId: string, command: RCSCommand) {
        const connection = this.getConnectionWithTypeAndAccountId(type, targetAccountId)
        if (connection) {
            connection.sendCommand(command)
        }
    }

    emitEventToTarget(type: ConnectionType, targetAccountId: string, eventName: string, data?: any) {
        const connection = this.getConnectionWithTypeAndAccountId(type, targetAccountId)
        if (connection) {
            connection.emitEvent(eventName, data)
        }
    }
}
