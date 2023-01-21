/**
 * LimaClient is an interface to the LIMA Service (Language Intelligence Manager Analyzer).
 * - https://github.com/wwlib/lima-service
 * - see docs/docker/docker-compose.yml for an example of a typical LIMA service configuration
 * 
 * LIMA manages the routing of NLU requests to appropriate cognitive services and logs each trasaction for easy review.
 * 
 * @module
 */

const axios = require('axios')

export interface LimaConfig {
    Url: string
    AuthUrl: string
    AccountId: string
    Password: string
    SessionId: string
}

export interface LimaRequestBody {
        clientId: string // i.e. 'hub-lima-client'
        sessionId: string
        input: string
        inputData: any
        type: string
        serviceType: string // i.e. 'luis',
        appName: string // i.e. 'luis/robo-dispatch',
        userId: string
        environment: string
}

export class LimaClient {

    private _limaUrl: string = ''
    private _limaAuthUrl: string = ''
    private _limaAccountId: string = ''
    private _limaPassword: string = ''
    private _limaSessionId: string = ''

    private _config: LimaConfig
    private _debug: boolean = false

    constructor(config: LimaConfig, options?: any) {
        this._config = config
        this._limaUrl = this._config.Url
        this._limaAuthUrl = this._config.AuthUrl
        this._limaAccountId = this._config.AccountId
        this._limaPassword = this._config.Password
        this._limaSessionId = this._config.SessionId
        this._debug = options ? options.debug : false
    }

    set config(config: any) {
        if (config && config.Url && config.AuthUrl && config.AccountId && config.Password) {
            this._config = config
            this._limaUrl = this._config.Url
            this._limaAuthUrl = this._config.AuthUrl
            this._limaAccountId = this._config.AccountId
            this._limaPassword = this._config.Password
        } else {
            console.log(`LimaClient: set config: error: incomplete config:`, config)
        }
    }

    // TODO: optimize this by keeping track of access_token expiration time
    async getAuthData() {
        if (this._limaAuthUrl && this._limaAccountId && this._limaPassword) {
            return new Promise((resolve, reject) => {
                axios.post(this._limaAuthUrl, {
                    accountId: this._limaAccountId,
                    password: this._limaPassword
                },
                    {
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(function (response: any) {
                        // console.log(response)
                        resolve(response.data)
                    })
                    .catch(function (error: any) {
                        console.log(error)
                        reject()
                    })
            })
        } else {
            throw new Error('LimaClient: Unable to get authData.')
        }
    }

    // TODO: return a typed response
    async call(requestBody: LimaRequestBody): Promise<any> {
        const authData: any = await this.getAuthData()

        return new Promise((resolve, reject) => {
            axios.post(`${this._limaUrl}/transaction`, requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        cookie: 'access_token=' + authData.access_token,
                    }
                })
                .then((response: any) => {
                    // console.log(response)
                    resolve(response.data)
                })
                .catch((error: any) => {
                    // TODO: remove log and throw
                    console.log(`LimaClient: call: Error:`)
                    console.log(error)
                    reject(error)
                })
        })
    }
}
