# robokit-cognitive-hub todo

### TODO

- more and better documentation!
- complete a chitchat cloud skill example (https://github.com/wwlib/robokit-cloud-skill):
    - use GPT3 to generate responses
    - make calls to GPT3 via the LIMA service (https://github.com/wwlib/lima-service)
        - see: docs/docker/docker-compose.yml
    - modify the skillsControllerCallback() method in the the Connection class
        - should pass cloud skill replies back to the robot/device
        - currently it makes a TTS request based on the reply
            - this is great, but needs to be better documented
        - need to figure out how best to handle NLU results
- should skills should be invoked based on info in the skills-manifest.json
- SkillsManager should read skills-manifest.json (currently hard-coded)
- Should set up a JWT auth service - or at least hard code some account/permission data
- LIMA should be modified to use redis instead of mongodb
    - https://github.com/wwlib/lima-service
    - redis is lighter and simpler
