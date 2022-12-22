# robokit-cognitive-hub

A cognitive hub (microservice) for developing robokit applications. Features include:
- robokit device socket connectivity (socket-io)
- clock sync between the service and connected devices
- ASR/STT audio streaming to service with real time event handling (SoS, EoS, incremental results)
- express route handling
- get/post REST api routes
- WebSocket api routes (optional)
- http admin UI routes
- JWT auth
- docker support

### medium article

TBD

For details about the project structure, see: [A Nodejs Microservice Template](https://medium.com/@andrew.rapo/a-nodejs-microservice-template-36f080fe1418)


### install

`npm install`

### build

`npm run build`

### run

`npm run start`


### docker

`docker build -t robokit-cognitive-hub .` 
- or `npm run docker:build`

Copy `.env-example` to `.env`
```
SERVER_PORT=8082
USE_AUTH=true
AZURE_SPEECH_SUBSCRIPTION_KEY=<YOUR-SUBSCRIPTION-KEY>
AZURE_SPEECH_TOKEN_ENDPOINT=https://azurespeechserviceeast.cognitiveservices.azure.com/sts/v1.0/issuetoken
AZURE_SPEECH_REGION=eastus
```

`docker run -it --rm -p 8082:8082 --env-file ./.env robokit-cognitive-hub` 
- or `npm run docker:run`


### curl

Example auth request:

```sh
curl --location --request POST 'http://localhost:8082/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "accountId": "robot1",
       "password": "12345!"
     }'
```

```json
{"message":"Logged in successfully.","access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJyb2JvdDEiLCJhdXRoIjp7InBlcm1pc3Npb25zIjpbeyJzY29wZXMiOlsicmVhZCIsImFkbWluIl0sInJlc291cmNlIjoiZXhhbXBsZSJ9XX0sImlhdCI6MTY1NjgxODY3MSwiZXhwIjoxNjU2ODE4NzMxfQ.TB_UUwFkc0fQLYi1q80hedBMvR7h4EIHzTSIoVTKOeA","refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJyb2JvdDEiLCJpYXQiOjE2NTY4MTg2NzEsImV4cCI6MTY1NjkwNTA3MX0.VDMlgUPiP-0r9EJ4_Q93gqufPBCmqIYXQ5PCr9UsJ8s","account_id":"robot1"}
```

### http - dashboard

http://localhost:8082/


### cli socket client (REPL)

```
cd tools
node socket-cli.js
```

Note: The socket client will authenticate using the credentials in the `tools/.env` file.

This will start a cli/REPL that will accept and echo prompts.

```
client connected
ctrl-c to quit
> hello
hello
```

Anything typed at the `>` prompt will be echoed.

Typing `asr` will stream the contents of `do-you-like-mac-n-cheese.wav` to the server and should produce output like:

```
asrSOS
asrResult { text: 'do you like', confidence: 0.5 }
asrResult { text: 'do you like mac and', confidence: 0.5 }
asrAudio done
asrEnd { text: 'Do you like Mac and cheese?', confidence: 0.96449 }
```

Typing `quit` terminates the cli.
