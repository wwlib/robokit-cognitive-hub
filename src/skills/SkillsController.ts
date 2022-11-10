import Connection from 'src/connection/Connection';
import SkillSessionHandler from './SkillSessionHandler';

export interface SkillsControllerConfig {
    skills: any[]
}

export default class SkillsController {

    private _connection: Connection // TODO: Maybe use events or a callback rather than have a reference to the connection
    private _skillSessionHandlers: Map<string, SkillSessionHandler>

    constructor(connection: Connection, config: SkillsControllerConfig) {
        this._connection = connection
        this._skillSessionHandlers = new Map<string, SkillSessionHandler>()
        this.init(config)
    }

    init(config: SkillsControllerConfig) {
        if (config.skills) {
            const skillsData: any[] = Object.values(config.skills)
            skillsData.forEach((skillData: any) => {
                console.log(`SkillsController: init:`, skillData)
                const handler: SkillSessionHandler = new SkillSessionHandler(this._connection, skillData)

            })
        }
    }

    broadcastEventToSkills(event: any) {
        for (var [key, value] of this._skillSessionHandlers.entries()) {
            console.log(`sending event to: ${key}`, value)
        }
    }

}