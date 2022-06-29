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
SERVER_PORT=8000
USE_AUTH=true
AZURE_SPEECH_SUBSCRIPTION_KEY=<YOUR-SUBSCRIPTION-KEY>
AZURE_SPEECH_TOKEN_ENDPOINT=https://azurespeechserviceeast.cognitiveservices.azure.com/sts/v1.0/issuetoken
AZURE_SPEECH_REGION=eastus
```

`docker run -it --rm -p 8000:8000 --env-file ./.env robokit-cognitive-hub` 
- or `npm run docker:run`


### curl

Example auth request:

```sh
curl --location --request POST 'http://localhost:8000/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "username": "user1",
       "password": "12345!"
     }'
```

```json
{"message":"Logged in successfully.","access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImF1dGgiOnsicGVybWlzc2lvbnMiOlt7InNjb3BlcyI6WyJyZWFkIl0sInJlc291cmNlIjoiZXhhbXBsZSJ9XX0sImlhdCI6MTY1NDM2NzQ5NSwiZXhwIjoxNjU0MzY3NTU1fQ.J7yxsSoOYTvNQtMkLrmlY_TEZT6x4jEvYvnI_Gqr64Q","refresh_toke":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImlhdCI6MTY1NDM2NzQ5NSwiZXhwIjoxNjU0NDUzODk1fQ.Lj7fairF_ABjeXzIc_-38aMqfj3ce08fd33V3ymoa04","user_id":"user1"}
```

### http - dashboard

http://localhost:8000/


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
asrEnded { text: 'Do you like Mac and cheese?', confidence: 0.96449 }
```

Typing `quit` terminates the cli.
