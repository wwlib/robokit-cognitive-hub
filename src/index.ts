import express from 'express'
import http, { Server } from 'http'
import { Server as SocketIoServer } from 'socket.io';
// import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import * as handlers from '@handlers'
import { ExpressRouterWrapper } from './util/ExpressRouterWrapper'
// import { WSSRoutes, setupWebSocketServer } from './util/WebSocketServerWrapper'
import ASRSessionHandler from './asr/ASRSessionHandler';
import { ASRStreamingSessionConfig } from 'cognitiveserviceslib'
import ConnectionManager from 'src/db/ConnectionManager';
import { ConnectionEventType, ConnectionType } from 'src/db/Connection'
import { JwtAuth } from './auth/JwtAuth'

const cookieParser = require("cookie-parser");

dotenv.config()

const main = async () => {
  const app = express()

  // Set expected Content-Types
  app.use(express.json())
  app.use(express.text())
  app.use(express.static('public'));
  app.use(cookieParser());

  // HealthCheck
  app.get('/healthcheck', handlers.HealthCheckHandler)

  const serviceOptions = { useAuth: false }
  if (process.env.USE_AUTH === 'true') {
    serviceOptions.useAuth = true;
    console.info('(USE_AUTH === true) so using mock JWT auth.')
  } else {
    console.info('(USE_AUTH !== true) so NOT using mock JWT auth.')
  }

  // http routes

  const expressRouterWrapper = new ExpressRouterWrapper('', serviceOptions)

  // disabled examples
  // expressRouterWrapper.addGetHandler('/get', handlers.ExampleHandlers.getInstance().getHandler, ['example:read'])
  // expressRouterWrapper.addPostHandler('/post', handlers.ExampleHandlers.getInstance().postHandler, ['example:read'])

  expressRouterWrapper.addGetHandlerNoAuth('/auth', handlers.MockAuthHandlers.getInstance().authHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/refresh', handlers.MockAuthHandlers.getInstance().refreshHandler)
  expressRouterWrapper.addPostHandlerNoAuth('/auth', handlers.MockAuthHandlers.getInstance().authHandler)

  expressRouterWrapper.addGetHandler('/dashboard', handlers.SiteHandlers.getInstance().dashboardHandler, ['example:read'])
  expressRouterWrapper.addGetHandler('/console', handlers.SiteHandlers.getInstance().consoleHandler, ['example:admin'])
  expressRouterWrapper.addGetHandlerNoAuth('/signin', handlers.SiteHandlers.getInstance().signinHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/forbidden', handlers.SiteHandlers.getInstance().forbiddenHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/', handlers.SiteHandlers.getInstance().redirectToDashboardHandler)

  expressRouterWrapper.addGetHandler('/time', handlers.TimeHandler, ['example:read'])

  if (expressRouterWrapper) {
    const routerPath = expressRouterWrapper.path !== '' ? `/${expressRouterWrapper.path}` : ''
    app.use(`${routerPath}`, expressRouterWrapper.getRouter())
  }

  const port = parseInt(<string>process.env.SERVER_PORT) || 8000
  const httpServer: Server = http.createServer(app)

  // ws socket routes (disabled examples)

  // const wssRoutes: WSSRoutes = [
  //   { path: '/ws-echo', handler: handlers.wsEchoHandler, permissions: ['example:read'] },
  //   { path: '/ws-silent', handler: handlers.wsSilentHandler, permissions: ['example:read'] },
  // ]
  // const wss: WebSocketServer = setupWebSocketServer(httpServer, wssRoutes, serviceOptions)

  // socket-io routes

  const ioRobokitDeviceServer = new SocketIoServer(httpServer, {
    path: "/socket-device/"
  });

  ioRobokitDeviceServer.use(function (socket, next) {
    var auth = socket.request.headers.authorization;
    // console.log("auth", auth);
    if (auth) {
      const token = auth.replace("Bearer ", "");
      console.log("auth token", token);
      // TODO: do some security check with token
      // ...
      if (!token) {
        return next(new Error('socket.io connection: unauthorized: Missing token.'))
      }
      let decodedAccessToken: any
      try {
        decodedAccessToken =  JwtAuth.decodeAccessToken(token)
        console.log(decodedAccessToken)
        socket.data.accountId = decodedAccessToken.accountId
      } catch (error: any) {
        console.error(error)
        return next(new Error('socket.io connection: unauthorized: Invalid token.'))
      }
      return next();
    }
    // return next();
    else {
      return next(new Error("no authorization header"));
    }
  });

  ioRobokitDeviceServer.on('connection', function (socket) {
    console.log(`socket.io: on connection:`, socket.id);
    ConnectionManager.getInstance().addConnection(ConnectionType.DEVICE, socket, socket.data.accountId)
    socket.emit('message', { message: 'A new device has joined!' });

    socket.on('message', (message) => {
      console.log(`on message: ${message}`, socket.id);
      ConnectionManager.getInstance().onConnectionEvent(ConnectionType.DEVICE, socket, ConnectionEventType.MESSAGE_FROM)
      socket.emit('message', { message: message });
    });

    socket.once('disconnect', function (reason) {
      console.log(`on disconnect: ${reason}: ${socket.id}`);
      ConnectionManager.getInstance().removeConnection(ConnectionType.DEVICE, socket)
    });

    // ASR streaming

    const asrConfig: ASRStreamingSessionConfig = {
      lang: 'en-US',
      hints: undefined,
      regexpEOS: undefined,
      maxSpeechTimeout: 60 * 1000,
      eosTimeout: 2000,
      providerConfig: {
        AzureSpeechSubscriptionKey: process.env.AZURE_SPEECH_SUBSCRIPTION_KEY || "<YOUR-AZURE-SUBSCRIPTION-KEY>",
        AzureSpeechTokenEndpoint: process.env.AZURE_SPEECH_TOKEN_ENDPOINT || "https://azurespeechserviceeast.cognitiveservices.azure.com/sts/v1.0/issuetoken",
        AzureSpeechRegion: process.env.AZURE_SPEECH_REGION || "eastus",
      }
    }
    let asrSessionHandler: ASRSessionHandler;

    socket.on('asrAudioStart', () => {
      console.log(`on asrAudioStart`);
      asrSessionHandler = new ASRSessionHandler(socket, asrConfig);
      asrSessionHandler.startAudio()
    })

    socket.on('asrAudio', (data: Buffer) => {
      console.log(`on asrAudio`, data);
      if (data) {
        ConnectionManager.getInstance().onConnectionEvent(ConnectionType.DEVICE, socket, ConnectionEventType.AUDIO_BYTES_FROM, data.length)
        asrSessionHandler.provideAudio(data)
      } else {
        console.log(`on asrAudio: NOT sending empty audio data.`)
      }
    })

    socket.on('asrAudioEnd', () => {
      console.log(`on asrAudioEnd`);
      asrSessionHandler.endAudio()
    })

    // time sync

    socket.on('timesync', function (data) {
      console.log('timesync message:', data);
      socket.emit('timesync', {
        id: data && 'id' in data ? data.id : null,
        result: Date.now()
      });
    });
  });

  process.on('SIGINT', () => {
    console.warn('Received interrupt, shutting down')
    httpServer.close()
    process.exit(0)
  })

  httpServer.listen(port, () => {
    console.info(`robokit-cognitive-hub (HTTP/ws/socket-io server) is ready and listening at port ${port}!`)
  })
}

main().catch((error) => {
  console.error('Detected an unrecoverable error. Stopping!')
  console.error(error)
})
