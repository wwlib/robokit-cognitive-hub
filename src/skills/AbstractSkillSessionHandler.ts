/**
 * A SkillSessionHandler manages the interface between the cognitive hub and a skill.
 * A skill can be a local object/class instance or a remote microservice accessed via socket.io.
 *
 * @module
 */

import { EventEmitter } from 'events';
import {
    Logger
} from 'cognitiveserviceslib'
import { SkillData } from './SkillsManager';

export type SkillSessionHandlerCallbackType = (event: string, data?: any) => void

/** The abstract SkillSessionHandler */
export abstract class AbstractSkillSessionHandler extends EventEmitter {

    protected _callback: SkillSessionHandlerCallbackType
    protected _logger: Logger
    protected _skillId: string
    protected _skillPriority: number
    protected _skillData: SkillData
    protected _deviceAccountId: string
    protected _devicePassword: string

    constructor(callback: SkillSessionHandlerCallbackType, skillData: SkillData, deviceAccountId: string, devicePassword: string) {
        super()
        this._callback = callback
        this._logger = new Logger(`SkillSessionHandler: ${skillData.id}`)
        this._skillId = skillData.id
        this._skillPriority = skillData.priority
        this._skillData = skillData
        this._deviceAccountId = deviceAccountId
        this._devicePassword = devicePassword
    }

    abstract onEvent(event: any): void
}
