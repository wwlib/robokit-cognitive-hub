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

// curl --location --request POST 'https://localhost:8000/auth' \
//     --header 'Content-Type: application/json' \
//     --data-raw '{
//        "accountId": "user1",
//        "password": "asldkfj"
//      }'

let syncOffset = 0

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

    // timesync

    const ts = timesync.create({
        server: socket,
        interval: 5000
    });

    ts.on('sync', function (state) {
        // console.log('timesync: sync ' + state + '');
    });

    ts.on('change', function (offset) {
        console.log('timesync: changed offset: ' + offset + ' ms');
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
        console.log(socket.id); // "G5p5..."
    });

    socket.on('disconnect', function () {
        console.log(`on disconnect. closing...`);
        process.exit(0);
    });

    socket.on('command', function (command) {
        console.log(command);
        ask("> ");
    });

    socket.on('message', function (data) {
        console.log(data);
        ask("> ");
    });

    socket.emit('message', 'CONNECTED');

    const ask = (prompt) => {
        rl.question(prompt, function (input) {
            const args = input.split(' ')
            if (args[0] === 'quit') {
                process.exit(0)
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
            } else if (args[0] === 'cmd' && args[1] && args[2] && args[3]) { // cmd play hello robot1
                const commandType = args[1]
                let command
                switch (args[1]) {
                    case 'play':
                        // command = rcs.CommandFactory.getInstance().createPlayPromptCommand(args[2], args[3])
                        const currentTime = new Date().getTime()
                        const startAtTime = 1000 + currentTime + syncOffset * 1000
                        console.log(`startAtTime: currentTime: ${currentTime}, syncOffset: ${syncOffset}, startAtTime: ${startAtTime}`)
                        command = rcs.CommandFactory.getInstance().createPlayMidiNoteCommand(48, 3, startAtTime, args[3])
                        break;
                }
                if (command) {
                    socket.emit('command', command)
                }
            } else {
                const messageData = {
                    messsage: input,
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