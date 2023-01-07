/** 
 * Model is a placeholder - for managing global application data and state.
 * 
 * @module
 */

import { ConnectionManager } from "src/connection/ConnectionManager";
import { Connection, ConnectionType } from "src/connection/Connection";

export class Model {
    private static _instance: Model;

    private _requestsCount: number = 0

    private constructor() {
    }

    get requestCount() {
        return this._requestsCount;
    }

    public static getInstance(): Model {
        if (!Model._instance) {
            Model._instance = new Model()
        }
        return Model._instance
    }

    onRequest() {
        this._requestsCount += 1
    }

    resetRequestCount() {
        this._requestsCount = 0
    }
}
