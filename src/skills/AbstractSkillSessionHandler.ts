import { EventEmitter } from 'events';
import {
    Logger
} from 'cognitiveserviceslib'
import { SkillData } from './SkillsManager';

export type SkillSessionHandlerCallbackType = (event: string, data?: any) => void

export default abstract class AbstractSkillSessionHandler extends EventEmitter {

    protected _callback: SkillSessionHandlerCallbackType
    protected _logger: Logger
    protected _skillId: string
    protected _skillPriority: number
    protected _skillData: SkillData

    constructor(callback: SkillSessionHandlerCallbackType, skillData: SkillData) {
        super()
        this._callback = callback
        this._logger = new Logger(`SkillSessionHandler: ${skillData.id}`)
        this._skillId = skillData.id
        this._skillPriority = skillData.priority
        this._skillData = skillData
    }

    abstract onEvent(event: any): void
}
