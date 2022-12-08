export interface SkillLaunchCriteria {
    asr?: string
    nlu?: string
}

export interface SkillServiceData {
    url: string
    authUrl: string
    accountId: string
    password: string
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

export default class SkillsManager {

    private static instance: SkillsManager


    private constructor() {

    }

    public static getInstance(): SkillsManager {
        if (!SkillsManager.instance) {
            SkillsManager.instance = new SkillsManager()
        }
        return SkillsManager.instance
    }

    // TODO: read manifest from a file, i.e. skills-manifest.json
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
                        "asr": "*"
                    },
                    "priority": 1,
                    "serviceData": {
                        "url": "http://localhost:8083",
                        "authUrl": "http://localhost:8083/auth",
                        "accountId": "robot1",
                        "password": "opensesame"
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
        console.log(data)
        return data
    }
}
