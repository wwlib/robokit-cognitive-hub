import express from 'express'
import http, { Server } from 'http'
import { Server as SocketIoServer } from 'socket.io';
// import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'
import * as handlers from '@handlers'
import { ExpressRouterWrapper } from './util/ExpressRouterWrapper'
// import { WSSRoutes, setupWebSocketServer } from './util/WebSocketServerWrapper'
import { setupSocketIoDeviceServer } from './SocketIoDeviceServer'
import { setupSocketIoControllerServer } from './SocketIoControllerServer'

const path = require('path')
const cors = require('cors');
const cookieParser = require("cookie-parser");
const errorhandler = require('errorhandler')

dotenv.config()

const main = async () => {
  const app = express()

  console.log(`Looking for hub-controller-app at path:`, process.env.HUB_CONTROLLER_APP_PATH)
  // Set expected Content-Types
  app.use(express.json())
  app.use(express.text())
  app.use(express.static('public'));
  app.use(express.static(path.join(__dirname, process.env.HUB_CONTROLLER_APP_PATH, 'build')))
  app.use(cookieParser());

  // https://www.section.io/engineering-education/how-to-use-cors-in-nodejs-with-express/
  // https://expressjs.com/en/resources/middleware/cors.html
  app.use(cors({
    origin: process.env.CORS_ORIGIN, // 'http://localhost:3000',
    credentials: true,
  }));
  console.log(`Allowing CORS origin: ${process.env.CORS_ORIGIN}`)

  // ErrorHandler in DEBUG mode
  if (process.env.DEBUG === 'true') {
    app.use(errorhandler())
  }

  // HealthCheck
  app.get('/healthcheck', handlers.HealthCheckHandler)

  const serviceOptions = { useAuth: false }
  if (process.env.USE_AUTH === 'true') {
    serviceOptions.useAuth = true;
    console.log('(USE_AUTH === true) so using mock JWT auth.')
  } else {
    console.log('(USE_AUTH !== true) so NOT using mock JWT auth.')
  }

  // http routes

  const expressRouterWrapper = new ExpressRouterWrapper('', serviceOptions)

  // AUTH
  expressRouterWrapper.addGetHandlerNoAuth('/signin', handlers.SiteHandlers.getInstance().signinHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/forbidden', handlers.SiteHandlers.getInstance().forbiddenHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/auth', handlers.MockAuthHandlers.getInstance().authHandler)
  expressRouterWrapper.addGetHandlerNoAuth('/refresh', handlers.MockAuthHandlers.getInstance().refreshHandler)
  expressRouterWrapper.addPostHandlerNoAuth('/auth', handlers.MockAuthHandlers.getInstance().authHandler)

  // ADMIN
  expressRouterWrapper.addGetHandler('/dashboard', handlers.SiteHandlers.getInstance().dashboardHandler, ['example:read'])
  expressRouterWrapper.addGetHandler('/console', handlers.SiteHandlers.getInstance().consoleHandler, ['example:admin'])

  expressRouterWrapper.addGetHandlerNoAuth('/', handlers.SiteHandlers.getInstance().redirectToDashboardHandler)

  // UTIL
  expressRouterWrapper.addGetHandler('/time', handlers.TimeHandler, ['example:read'])

  if (expressRouterWrapper) {
    const routerPath = expressRouterWrapper.path !== '' ? `/${expressRouterWrapper.path}` : ''
    app.use(`${routerPath}`, expressRouterWrapper.getRouter())
  }

  app.get('*', async (req, res) => {
    res.sendFile(path.join(__dirname, process.env.REASONGRAPH_APP_PATH, 'build', 'index.html'))
  })

  const port = parseInt(<string>process.env.SERVER_PORT) || 8082
  const httpServer: Server = http.createServer(app)

  // socket-io routes

  setupSocketIoDeviceServer(httpServer, '/socket-device/')
  setupSocketIoControllerServer(httpServer, '/socket-controller')

  process.on('SIGINT', () => {
    console.error('Received interrupt, shutting down')
    httpServer.close()
    process.exit(0)
  })

  httpServer.listen(port, () => {
    console.log(`robokit-cognitive-hub: (HTTP/ws/socket-io server) is ready and listening at port ${port}!`)
  })
}

process.on('uncaughtException', function (exception) {
  console.error(exception);
});

process.on('unhandledRejection', (reason, p) => {
  console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

main().catch((error) => {
  console.error('Detected an unrecoverable error. Stopping!')
  console.error(error)
})
