export interface SkillLaunchCriteria {
    asr?: string
    nlu?: string
}

export interface SkillServiceData {
    url: string
    token: string
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
        return {
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
                        "url": "http://localhost:8001",
                        "token": "<TOKEN>"
                    }
                }
            }
        }
    }
}
