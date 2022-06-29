# tools-notes

### install

`npm install`

### config

The default `.env` file includes an auth token (optional) as well as auth credentials. Auth is required if the microservice's auth mode is enabled (i.e. USE_AUTH=true) Auth is enabled by default.

Note: The microservice-template includes an `/auth` route that serves JWT tokens.

### run

`node socket-cli.js`

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
