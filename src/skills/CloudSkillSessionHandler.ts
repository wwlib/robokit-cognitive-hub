import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

const axios = require('axios');
const { io } = require("socket.io-client");

export default class CloudSkillSessionHandler extends AbstractSkillSessionHandler {

    private _socket: any
    
    constructor(callback: SkillSessionHandlerCallbackType, skillData: any, deviceAccountId: string, devicePassword: string) {
        super(callback, skillData, deviceAccountId, devicePassword)
        this.init()
    }

    init() {
        if (this._skillData && this._skillData.serviceData) {
            const url: string = this._skillData.serviceData.url
            const authUrl: string = this._skillData.serviceData.authUrl
            const accountId: string = this._deviceAccountId
            const password: string = this._devicePassword
            if (authUrl && accountId && password) {
                this.getToken(authUrl, accountId, password)
                    .then((token: string) => {
                        try {
                            this.connect(url, token) // TODO: error handling
                        } catch (error) {
                            console.error(`CloudSkillSessionHandler: error connecting to skill socket.`, error)
                        }
                    })
                    .catch((error: any) => {
                        console.error(`CloudSkillSessionHandler: error getting token:`, error)
                    })

            } else {
                console.log(`CloudSkillSessionHandler: authUrl, accountId and password must be defined. Not connecting to skill.`)
            }
        }
    }

    async getToken(authUrl: string, accountId: string, password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            axios.post(authUrl, {
                accountId: accountId,
                password: password
            },
                {
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(function (response: any) {
                    // console.log(response);
                    resolve(response.data.access_token);
                })
                .catch(function (error: any) {
                    // TODO: remove log & throw
                    console.error('CloudSkilllSessionHandler: getToken error:', error);
                    reject();
                });

        });
    }

    connect(url: string, token: string) {
        if (process.env.DEBUG === 'true') {
            console.log('DEBUG: CloudSkilllSessionHandler: connect URL:', url);
            console.log('DEBUG: CloudSkilllSessionHandler: connect token:', token);
        }
        const socketPath: string = '/socket-hub/'
        this._socket = io(url, {
            path: socketPath,
            extraHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnection: false,
        });

        // socket messages

        this._socket.on("connect", () => {
            console.log('CloudSkillSessionHandler: on connect.', this._socket.id); // "G5p5..."
        });

        this._socket.on('disconnect', function () {
            console.log('CloudSkillSessionHandler: on disconnect.');
        });

        this._socket.on('command', (command: any) => {
            console.log('CloudSkilllSessionHandler: on command:', command);
        });

        this._socket.on('message', (messageData: any) => {
            console.log('CloudSkilllSessionHandler: on message:', messageData);
            this._callback('reply', {
                source: `CS:${this._skillId}`,
                event: 'reply',
                skillId: this._skillId,
                skillPriority: this._skillPriority,
                data: messageData.data
            })
        });
    }

    onEvent(event: any) {
        switch (event.event) {
            case 'asrEnd':
                this._socket.emit('asrEnd', event.data)
                break;
            case 'nluEnd':
                console.log(`CloudSkillSessionHandler: onNluEnd:`, event)
                this._socket.emit('nluEnd', event.data)
                break;
        }
    }
}
