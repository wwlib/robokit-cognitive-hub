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

/*
curl --location --request POST 'http://localhost:8082/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "accountId": "robot1",
       "password": "12345!"
     }'
*/

async function getToken() {
    if (process.env.TOKEN) {
        return process.env.TOKEN;
    } else if (process.env.AUTH_URL && process.env.DEVICE_ACCOUNT_ID && process.env.DEVICE_PASSWORD) {
        return new Promise((resolve, reject) => {
            axios.post(process.env.AUTH_URL, {
                accountId: process.env.DEVICE_ACCOUNT_ID,
                password: process.env.DEVICE_PASSWORD
            },
                {
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(function (response) {
                    // console.log(response);
                    resolve(response.data.access_token);
                })
                .catch(function (error) {
                    console.log('CLI: on getToken error:', error);
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

    console.log(`CLI: URL:`, process.env.URL);
    console.log('CLI: token:', token);
    // const ws = new WebSocket(process.env.URL, { headers: { Authorization: `Bearer ${token}` } })
    const socket = io(process.env.URL, {
        path: process.env.DEVICE_SOCKET_PATH,
        extraHeaders: {
            Authorization: `Bearer ${token}`,
        },
        reconnection: false,
    });

    // synchronized clock

    onSynchronizedClockUpdate = (timeData) => {
        if (showTimeEvents) {
            console.log(`CLI: clockUpdate: ${timeData.simpleFormat}`)
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
            console.log('CLI: timesync: changed offset: ' + offset + ' ms');
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
        socket.emit('command', command)
    });

    ts.send = function (socket, data, timeout) {
        //console.log('send', data);
        return new Promise(function (resolve, reject) {
            var timeoutFn = setTimeout(reject, timeout);

            socket.emit('timesync', data, function () {
                clearTimeout(timeoutFn);
                resolve();
            });
        });
    };

    socket.on('timesync', function (data) {
        //console.log('receive', data);
        ts.receive(null, data);
    });

    // socket messages

    socket.on("connect", () => {
        console.log('CLI: on connect: socket id:', socket.id); // "G5p5..."
    });

    socket.on('disconnect', function () {
        console.log(`CLI: on disconnect. closing...`);
        if (synchronizedClock) {
            synchronizedClock.dispose()
            synchronizedClock = undefined
        }
        process.exit(0);
    });

    rcs.CommandProcessor.getInstance().on('commandCompleted', (commandAck) => {
        console.log(`command completed:`, commandAck)
        socket.emit('command', commandAck)
    })

    socket.on('command', function (command) {
        console.log('CLI: on command', command);
        rcs.CommandProcessor.getInstance().processCommand(command)
        ask("> ");
    });

    socket.on('message', function (data) {
        console.log('CLI: on message:', data);
        ask("> ");
    });

    socket.on('asrSOS', function () {
        console.log(`CLI: on asrSOS`);
    });

    socket.on('asrResult', function (data) {
        console.log(`CLI: on asrResult`, data);
    });

    socket.on('asrEnded', function (data) {
        console.log(`CLI: on asrEnded`, data);
        ask("> ");
    });

    // ws.on('open', () => {
    //     console.log('client connected');
    //     console.log('ctrl-c to quit');
    //     ask("> ");
    // });

    // ws.on('close', () => {
    //     console.log('client closed');
    //     rl.close();
    // });

    // ws.on('error', (error) => {
    //     console.log(error);
    // });

    // ws.on('message', function incoming(message) {
    //     let output = message;
    //     try {
    //         const messageObj = JSON.parse(message);
    //         output = JSON.stringify(messageObj, null, 2);
    //         output += '\n\n';
    //         const best = messageObj[0];
    //         output += `label: ${best.label.name}, closest_text: ${best.closest_text}, score: ${best.score}, processingTime: ${best.processingTime} ms`;
    //     } catch {
    //         //
    //     }
    //     console.log(`${output}`);
    //     ask("> ");
    // });

    const ask = (prompt) => {
        rl.question(prompt, function (input) {
            if (input === 'quit') {
                process.exit(0)
            } else if (input === 'clock') {
                showTimeEvents = !showTimeEvents
                ask("> ")
            } else if (input === 'asr') {
                const options = {
                    filename: 'do-you-like-mac-n-cheese.wav',
                }
                const waveFileAudioSource = new WaveFileAudioSource(options)
                waveFileAudioSource.on('audio', data => {
                    // console.log(`on audio`, data);
                    socket.emit('asrAudio', data);
                })
                waveFileAudioSource.on('done', () => {
                    console.log(`CLI: on asrAudio done`);
                    socket.emit('asrAudioEnd');
                })
                socket.emit('asrAudioStart');
                waveFileAudioSource.start();
            } else {
                const messageData = {
                    source: 'CLI',
                    event: 'user-input',
                    data: { input: input }
                }
                // ws.send(messageData);
                socket.emit('message', messageData)
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