// https://nodejs.org/en/knowledge/command-line/how-to-prompt-for-command-line-input/

const dotenv = require('dotenv');
// const WebSocket = require('ws');
const readline = require("readline");
const axios = require('axios');
const { io } = require("socket.io-client");
const timesync = require('timesync');
const rcs = require('robokit-command-system')

const { WaveFileAudioSource } = require('cognitiveserviceslib')

dotenv.config();

// curl --location --request POST 'https://localhost:8082/auth' \
//     --header 'Content-Type: application/json' \
//     --data-raw '{
//        "accountId": "user1",
//        "password": "asldkfj"
//      }'

let syncOffset = 0
let subscribedDevices = {}

async function getToken() {
    if (process.env.TOKEN) {
        return process.env.TOKEN;
    } else if (process.env.AUTH_URL && process.env.CONTROLLER_ACCOUNT_ID && process.env.CONTROLLER_PASSWORD) {
        return new Promise((resolve, reject) => {
            axios.post(process.env.AUTH_URL, {
                accountId: process.env.CONTROLLER_ACCOUNT_ID,
                password: process.env.CONTROLLER_PASSWORD
            },
                {
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(function (response) {
                    // console.log(response);
                    resolve(response.data.access_token);
                })
                .catch(function (error) {
                    console.log(error);
                    reject();
                });

        });
    } else {
        throw new Error('Unable to get token.');
    }
}

function connect(token) {
    // console.log(token);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(`URL:`, process.env.URL);
    console.log('token:', token);
    // const ws = new WebSocket(process.env.URL, { headers: { Authorization: `Bearer ${token}` } })
    const socket = io(process.env.URL, {
        path: process.env.CONTROLLER_SOCKET_PATH,
        extraHeaders: {
            Authorization: `Bearer ${token}`,
        },
        reconnection: false,
    });

    // synchronized clock

    onSynchronizedClockUpdate = (timeData) => {
        if (showTimeEvents) {
            console.log(`clockUpdate: ${timeData.simpleFormat}`)
        }
    }

    let showTimeEvents = false
    let synchronizedClock = new rcs.SynchronizedClock();
    synchronizedClock.on('1sec', onSynchronizedClockUpdate)
    synchronizedClock.startUpdate()

    // timesync

    const ts = timesync.create({
        server: socket,
        interval: 5000
    });

    ts.on('sync', function (state) {
        // console.log('timesync: sync ' + state + '');
    });

    ts.on('change', function (offset) {
        if (showTimeEvents) {
            console.log('timesync: changed offset: ' + offset + ' ms');
        }
        if (synchronizedClock) {
            synchronizedClock.onSyncOffsetChanged(offset)
        }
        syncOffset = offset
        const command = {
            id: 'tbd',
            type: 'sync',
            name: 'syncOffset',
            payload: {
                syncOffset: offset,
            }
        }
        socket.emit('command', command)
    });

    ts.send = function (socket, data, timeout) {
        //console.log('send', data);
        return new Promise(function (resolve, reject) {
            var timeoutFn = setTimeout(reject, timeout);

            if (socket) {
                socket.emit('timesync', data, function () {
                    clearTimeout(timeoutFn);
                    resolve();
                });
            } else {
                clearTimeout(timeoutFn);
                reject("ts.send: socket is undefined.");
            }
        });
    };

    socket.on('timesync', function (data) {
        //console.log('receive', data);
        ts.receive(null, data);
    });

    // socket messages

    socket.on("connect", () => {
        console.log(socket.id); // "G5p5..."
    });

    socket.on('disconnect', function () {
        console.log(`on disconnect. closing...`);
        if (synchronizedClock) {
            synchronizedClock.dispose()
            synchronizedClock = undefined
        }
        process.exit(0);
    });

    socket.on('command', function (command) {
        
        if (command && command.name === 'base64Photo') {
            if (typeof command.payload === 'string') {
                command.payload = command.payload.slice(-20)
            }
            console.log(command);
        } else {
            console.log(command);
            if (command && command.type === 'hubCommand' && command.name === 'notification') {
                if (command.payload && command.payload.event === 'subscribed-to') {
                    if (command.payload.targetAccountId) {
                        subscribedDevices[command.payload.targetAccountId] = true
                    }
                    console.log('subscribedDevices:', subscribedDevices)
                }
            }
        }
        ask("> ");
    });

    socket.on('message', function (data) {
        console.log(data);
        ask("> ");
    });

    const ask = (prompt) => {
        rl.question(prompt, function (input) {
            const args = input.split(' ')
            if (args[0] === 'quit') {
                process.exit(0)
            } else if (args[0] === 'clock') {
                showTimeEvents = !showTimeEvents
                ask("> ")
            } else if (args[0] === 'sub' && args[1]) {
                const command = {
                    type: 'hubCommand',
                    name: 'subscribe',
                    payload: {
                        connectionType: 'device',
                        accountId: args[1]
                    }
                }
                socket.emit('command', command)
            } else if (args[0] === 'cmd' && args[1]) { //} && args[2]) { // cmd play hello robot1
                const commandType = args[1]
                let rcsCommand
                let subCommand
                let targetAccountId
                let commandData
                switch (args[1]) {
                    case 'play':
                        subCommand = args[2]
                        console.log('play:', args[0], commandType, subCommand)
                        if (subCommand === 'note') {
                            const currentTime = new Date().getTime()
                            const startAtTime = 1000 + synchronizedClock.synchronizedTime
                            console.log(`startAtTime: currentTime: ${currentTime}, synchronizedTime: ${synchronizedClock.synchronizedTime}, startAtTime: ${startAtTime}`)
                            commandData = {
                                type: 'command',
                                name: 'play',
                                payload: {
                                    midi: {
                                        note: 48,
                                        channel: 2,
                                        volume: 127,
                                        startAtTime
                                    }
                                }
                            }
                            rcsCommand = rcs.CommandFactory.getInstance().createCommand(commandData, 'tbd', new Date().getTime() + syncOffset)
                            //rcsCommand = rcs.CommandFactory.getInstance().createPlayMidiNoteCommand(48, 3, 127, startAtTime, 'tbd')
                        } else if (subCommand === 'midi') {
                            commandData = {
                                type: 'command',
                                name: 'play',
                                payload: {
                                    midi: {
                                        filename: 'twinkle_twinkle_3_chan.mid', //'twinkle_twinkle.mid',
                                        channelsToPlay: [1],
                                        startAtTime: 1000 + synchronizedClock.synchronizedTime
                                    }
                                }
                            }
                            rcsCommand = rcs.CommandFactory.getInstance().createCommand(commandData, 'tbd', new Date().getTime() + syncOffset)
                            // rcsCommand = rcs.CommandFactory.getInstance().createPlayMidiFileCommand('twinkle.mid', [1], startAtTime, 'tbd')
                        } else {
                            // prompt
                            rcsCommand = rcs.CommandFactory.getInstance().createPlayPromptCommand(subCommand, 'tbd')
                        }
                        break;
                    case 'getBase64Photo':
                        commandData = {
                            type: 'command',
                            name: 'getBase64Photo',
                            payload: {}
                        }
                        rcsCommand = rcs.CommandFactory.getInstance().createCommand(commandData, 'tbd', new Date().getTime() + syncOffset)
                        break;
                    case 'nop':
                        commandData = {
                            type: 'command',
                            name: 'nop',
                            payload: {}
                        }
                        rcsCommand = rcs.CommandFactory.getInstance().createCommand(commandData, 'tbd', new Date().getTime() + syncOffset)
                        break;
                }
                if (rcsCommand) {
                    const channelAssignments = {
                        robot7: [4],
                        robot8: [1],
                        robot9: [2],
                        robot6: [4]
                    }
                    Object.keys(subscribedDevices).forEach(accountId => {
                        rcsCommand.targetAccountId = accountId
                        if (rcsCommand.payload.midi) {
                            rcsCommand.payload.midi.channelsToPlay = channelAssignments[accountId]
                        }
                        console.log(`sending command ${rcsCommand.name} to:`, rcsCommand.targetAccountId)
                        socket.emit('command', rcsCommand)
                    })
                }
            } else {
                // const messageData = {
                //     messsage: input,
                // }
                // // ws.send(messageData);
                // socket.emit('message', messageData)
                ask("> ");
            }
        });
    }

    rl.on("close", function () {
        console.log("\nBYE BYE !!!");
        process.exit(0);
    });
}

async function doIt() {
    const token = await getToken();
    // const token = 'abcde';
    connect(token);
}

doIt();