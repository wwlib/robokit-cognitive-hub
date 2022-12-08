import Connection from 'src/connection/Connection';
import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler';
import ClockSkillSessionHandler from './ClockSkillSessionHandler';
import CloudSkillSessionHandler from './CloudSkillSessionHandler';
import EchoSkillSessionHandler from './EchoSkillSessionHandler';
import { SkillsManifest } from './SkillsManager';

export type SkillsControllerCallbackType = (event: string, data?: any) => void

export interface SkillsControllerConfig {
    skillsManifest: SkillsManifest
}

export default class SkillsController {

    private _callback: SkillsControllerCallbackType
    private _skillSessionHandlers: Map<string, AbstractSkillSessionHandler>

    constructor(callback: SkillsControllerCallbackType, config: SkillsControllerConfig) {
        this._callback = callback
        this._skillSessionHandlers = new Map<string, AbstractSkillSessionHandler>()
        this.init(config)
    }

    init(config: SkillsControllerConfig) {
        if (config.skillsManifest.skills) {
            const skillsActivated: any = {}
            const skillsData: any[] = Object.values(config.skillsManifest.skills)
            skillsData.forEach((skillData: any) => {
                console.log(`SkillsController: init:`, skillData)
                let handler: AbstractSkillSessionHandler | undefined = undefined
                if (skillData.id === 'echo') {
                    handler = new EchoSkillSessionHandler(this.skillSessionHandlerCallback, skillData)
                } else if (skillData.id === 'clock') {
                    handler = new ClockSkillSessionHandler(this.skillSessionHandlerCallback, skillData)
                } else {
                    handler = new CloudSkillSessionHandler(this.skillSessionHandlerCallback, skillData)
                }
                if (handler) {
                    this._skillSessionHandlers.set(skillData.id, handler)
                    skillsActivated[skillData.id] = {
                        id: skillData.id,
                        priority: skillData.priority
                    }
                }
            })
            this._callback('init', skillsActivated)
        }
    }

    broadcastEventToSkills(event: any) {
        for (var [key, value] of this._skillSessionHandlers.entries()) {
            // console.log(`broadcastEventToSkills: ${key}`, value, event)
            const skillSessionHandler: AbstractSkillSessionHandler = value
            skillSessionHandler.onEvent(event)
        }
    }

    onAsrSOS() {
        this.broadcastEventToSkills({
            event: 'asrSOS'
        })
    }

    onAsrEOS() {
        this.broadcastEventToSkills({
            event: 'asrEOS'
        })
    }

    onAsrResult(data: any) {
        this.broadcastEventToSkills({
            event: 'asrResult',
            data
        })
    }

    onAsrEnded(data: any) {
        this.broadcastEventToSkills({
            event: 'asrEnded',
            data
        })
    }

    // SkillSessionHandler callback

    skillSessionHandlerCallback: SkillSessionHandlerCallbackType = (event: string, data: any) => {
        switch (event) {
            case 'reply':
                // console.log(`skillSessionHandlerCallback: reply:`, data)
                this._callback('reply', data)
                break;
        }
    }
}
