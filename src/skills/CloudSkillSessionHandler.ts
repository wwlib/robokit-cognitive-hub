import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'
import { SynchronizedClock } from 'robokit-command-system'

const axios = require('axios');
const { io } = require("socket.io-client");
const timesync = require('timesync');

export default class CloudSkillSessionHandler extends AbstractSkillSessionHandler {

    private _socket: any

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any) {
        super(callback, skillData)
        this.init()
    }

    init() {
        if (this._skillData && this._skillData.serviceData) {
            const url: string = this._skillData.serviceData.url
            const authUrl: string = this._skillData.serviceData.authUrl
            const accountId: string = this._skillData.serviceData.accountId
            const password: string = this._skillData.serviceData.password
            if (authUrl && accountId && password) {
                this.getToken(authUrl, accountId, password)
                    .then((token: string) => {
                        try {
                            this.connect(url, token) // TODO: error handling
                        } catch(error) {
                            console.log(`CloudSkillSessionHandler: error connecting to skill socket.`, error)
                        }
                    })
                    .catch((error: any) => {
                        console.log(`CloudSkillSessionHandler: error getting token:`, error)
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
                    console.log('CloudSkilllSessionHandler: getToken error:',error);
                    reject();
                });

        });
    }

    connect(url: string, token: string) {

        console.log('CloudSkilllSessionHandler: connect URL:', url);
        console.log('CloudSkilllSessionHandler: connect token:', token);
        const socketPath: string = '/socket-hub/'
        this._socket = io(url, {
            path: socketPath,
            extraHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnection: false,
        });

        // synchronized clock

        const onSynchronizedClockUpdate = (timeData: any) => {
            if (showTimeEvents) {
                console.log(`CloudSkilllSessionHandler: clockUpdate: ${timeData.simpleFormat}`)
            }
        }

        let showTimeEvents = false
        let synchronizedClock: SynchronizedClock | undefined = new SynchronizedClock();
        synchronizedClock.on('1sec', onSynchronizedClockUpdate)
        synchronizedClock.startUpdate()

        // timesync

        const ts = timesync.create({
            server: this._socket,
            interval: 5000
        });

        ts.on('sync', function (state: string) {
            // console.log('timesync: sync ' + state + '');
        });

        ts.on('change', (offset: number) => {
            if (showTimeEvents) {
                console.log('CloudSkilllSessionHandler: timesync: changed offset: ' + offset + ' ms');
            }
            if (synchronizedClock) {
                synchronizedClock.onSyncOffsetChanged(offset)
            }
            const command = {
                id: 'tbd',
                type: 'sync',
                name: 'syncOffset',
                payload: {
                    syncOffset: offset,
                }
            }
            this._socket.emit('command', command)
        });

        ts.send = function (socket: any, data: any, timeout: number) {
            //console.log('send', data);
            return new Promise(function (resolve, reject) {
                var timeoutFn = setTimeout(reject, timeout);

                socket.emit('timesync', data, function () {
                    clearTimeout(timeoutFn);
                    resolve(null);
                });
            });
        };

        this._socket.on('timesync', function (data: any) {
            //console.log('receive', data);
            ts.receive(null, data);
        });

        // socket messages

        this._socket.on("connect", () => {
            console.log('CloudSkillSessionHandler: on connect', this._socket.id); // "G5p5..."
        });

        this._socket.on('disconnect', function () {
            console.log('CloudSkillSessionHandler: on disconnect. halting clock sync ...');
            if (synchronizedClock) {
                synchronizedClock.dispose()
                synchronizedClock = undefined
            }
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
            case 'asrEnded':
                this._socket.emit('message', event.data)
                break;
        }
    }
}
