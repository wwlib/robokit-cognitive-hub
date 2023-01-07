/**
 * SkillsManager provides access to global skill-related data like the skills manifest.
 *
 * @module
 */

export interface SkillLaunchCriteria {
    asr?: string
    nlu?: string
}

export interface SkillServiceData {
    url: string
    authUrl: string
}

export interface SkillData {
    id: string
    launchCriteria: SkillLaunchCriteria
    priority: number
    serviceData?: SkillServiceData
}

export interface SkillsManifest {
    skills: {
        [id: string]: SkillData
    }
}

export class SkillsManager {

    private static instance: SkillsManager


    private constructor() {

    }

    public static getInstance(): SkillsManager {
        if (!SkillsManager.instance) {
            SkillsManager.instance = new SkillsManager()
        }
        return SkillsManager.instance
    }

    // TODO: Read the manifest from a file, i.e. skills-manifest.json
    // TODO: Need to define skill data. Make availability of skills based on account permissions?
    async getSkillsManifest(): Promise<SkillsManifest> {
        const data = {
            skills: {
                "clock": {
                    "id": "clock",
                    "launchCriteria": {
                        "asr": "*"
                    },
                    "priority": 0
                },
                "echo": {
                    "id": "echo",
                    "launchCriteria": {
                        "asr": "*"
                    },
                    "priority": 10
                },
                "chitchat": {
                    "id": "chitchat",
                    "launchCriteria": {
                        "asr": "*",
                        "nlu": "*"
                    },
                    "priority": 1,
                    "serviceData": {
                        "url": "http://localhost:8083",
                        "authUrl": "http://localhost:8083/auth"
                    }
                }
            }
        }
        if (process.env.CHITCHAT_URL) {
            data.skills.chitchat.serviceData.url = process.env.CHITCHAT_URL
        }
        if (process.env.CHITCHAT_AUTH_URL) {
            data.skills.chitchat.serviceData.authUrl = process.env.CHITCHAT_AUTH_URL
        }
        // console.log(data)
        return data
    }
}
