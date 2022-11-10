import { EventEmitter } from 'events';
import {
    Logger
} from 'cognitiveserviceslib'
import Connection from 'src/connection/Connection';

export default class SkillSessionHandler extends EventEmitter {

    private _connection: Connection
    private _logger: Logger

    constructor(connection: Connection, skillData: any) {
        super()
        this._connection = connection
        this._logger = new Logger('SkillSessionHandler')
        console.log(`SkillSessionHandler: constructor: data:`, skillData)
    }
}