/**
 * NLUSessionHandler uses LimaClient to make NLU requests.
 * 
 * @module
 */

import { EventEmitter } from 'events';
import {
    AzureSpeechClient,
    Logger
} from 'cognitiveserviceslib'
import { LimaClient, LimaConfig } from './LimaClient';

const fs = require('fs-extra')
const path = require('path')

export type NLUSessionHandlerCallbackType = (event: string, targetAccountId: string, data?: any) => void

export interface NLUSessionConfig {
    Lima: LimaConfig
}

export class NLUSessionHandler extends EventEmitter {

    private _callback: NLUSessionHandlerCallbackType
    // private _logger: Logger
    private _nluConfig: NLUSessionConfig
    private _sessionId: string
    private _targetAccountId: string
    private _limaClient: LimaClient;

    constructor(callback: NLUSessionHandlerCallbackType, nluConfig: NLUSessionConfig, sessionId: string, targetAccountId: string) {
        super()
        this._callback = callback
        this._nluConfig = nluConfig
        this._sessionId = sessionId
        this._targetAccountId = targetAccountId
        this._limaClient = new LimaClient(this._nluConfig.Lima);
        // this._logger = new Logger('NLUSessionHandler')
    }

    async call(inputText: string) {
        if (this._callback) this._callback('nluStart', this._targetAccountId, { inputText })
        try {
            const requestBody = {
                clientId: 'hub-lima-client',
                sessionId: this._nluConfig.Lima.SessionId,
                input: inputText,
                inputData: {},
                type: 'device',
                serviceType: 'luis',
                appName: 'luis/robo-dispatch',
                userId: this._targetAccountId,
                environment: 'environment', // TODO: get this value from somewhere. env?
            }
            const limaResponse: any = await this._limaClient.call(requestBody)
            if (this._callback) this._callback('nluEnd', this._targetAccountId, limaResponse)
        } catch (error: any) {
            // console.log(`NLUSessionHandler: call Lima: error:`, error);
            if (this._callback) this._callback('nluError', this._targetAccountId, error)
        }
    }

    dispose() {
        this.removeAllListeners()
    }
}
