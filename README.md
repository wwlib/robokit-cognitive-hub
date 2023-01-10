# robokit-cognitive-hub

robokit-cognitive-hub serves as a cloud endpoint for Conversational AI Devices, i.e. robots.

robokit-cognitive-hub is a lightweight microservice with the essential features needed to develop robust voice-driven applications. 

Features include:
- Express route handling
- GET/POST REST api routes
- HTTP admin UI pages
- JWT auth (example mock implementation)
- docker support
- Socket.io connectivity for Devices, Controllers and Apps
- WebSocket api routes (optional)
- Clock sync between the service and connected devices - enabling syncronized, multi-device/robot applications (i.e. show control)
- Audio streaming/routing to ASR/STT services with real time event handling (SoS, EoS, incremental results) - i.e. Azure Speech/STT
- Event routing to/from NLU services - i.e. Azure LUIS & CLU
- Audio streaming from TTS services - i.e. Azure Custom Voice
- Routing of events to/from Skill/Application microservices
- Remote control of Devices by Contoller clients - i.e. human-in-the-loop Woz (Wizard of Oz) Controllers
- Routing of events to/from external App clients for integration with existing applications - i.e. realtime integration with game services




### medium article

TBD

For details about the project structure, see: [A Nodejs Microservice Template](https://medium.com/@andrew.rapo/a-nodejs-microservice-template-36f080fe1418)


### cloud architecture

![robokit-cognitive-hub architecture](./docs/media/robokit-cloud-architecture-simple.png)

### install

`npm install`

### build

- checkout the [robokit-hub-controller](https://github.com/wwlib/robokit-hub-controller) module (react app) so it is a peer of robokit-cognitive-hub
- build the robokit-hub-controller module
- then: 
```
npm run copy-hub-controller
npm run build
```

### module dependencies

- checkout, build & start the [robokit-cloud-skill](https://github.com/wwlib/robokit-cloud-skill) project
- checkout, build & start the [lima-service](https://github.com/wwlib/lima-service) project

### run

`npm run start`

### docs

```
npm run docs:serve

(when code changes)

npm run docs:build
```

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

### docker compose

- copy the files from docs/docker to a new directory
- add your AZURE_SPEECH_SUBSCRIPTION_KEY to hub.env
- add your LUIS_endpoint and LUIS_subscriptionKey to lima.env
- then:

```
docker compose up -d
```

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

### http - example Controller app

http://localhost:8082

### http - example dashboard

http://localhost:8082/dashboard

### http - example console

http://localhost:8082/console


### testing the cognitive hub service

- verify that the service is running by opening the hub Controller app at: http://localhost:8082
- verify that the ASR service working using the cli test app: `socket-cli-device.js` (see below)
- checkout, build & start the [cognitive-services-test-app](https://github.com/wwlib/cognitive-services-test-app) project
- use the `cognitive-services-test-app` as a "robot" client to test the cognitive hub

### cli socket validation client (REPL)

Used to test and validate the server.

```
cd tools
node socket-cli-device.js
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
