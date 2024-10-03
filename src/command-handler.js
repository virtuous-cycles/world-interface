const UiRenderer = require("./ui-renderer");
const globalState = require("./global-state");

class CommandHandler {
    constructor(environmentRegistry) {
        this.registry = environmentRegistry;
        this.renderer = new UiRenderer();
    }

    // This function runs the command lifecycle.
    // It extracts the environment name (by splitting on space)
    // Then routes to the appropriate environment
    async handle(command, messages) {
        const [envName, ...rest] = command.split(" ");

        // Loads environment
        const env = this.registry.getEnvironment(envName);
        console.log("Command Handler Firing", "command:", command);
        let result;
        if (env) {
            result = await env.handleCommand(rest.join(" "), messages);
        } else if (command.toLowerCase() === "help") {
            result = this.getGlobalHelp();
        } else {
            result = this.handleUnrecognizedCommand(command);
        }
        // console.log("Command handler returning:", result);
        const globalStateData = globalState.get();
        // console.log("GLOBAL STATE", globalStateData);
        const ui = this.renderer.render(command, result, globalStateData);
        return { ui };
    }

    getGlobalHelp() {
        const environments = this.registry.getEnvironmentNames();
        return {
            title: "Global Help",
            content: `Available environments: ${environments.join(
                ", "
            )}\nUse "<environment> help" for environment-specific commands.`,
        };
    }

    handleUnrecognizedCommand(command) {
        return {
            title: "Error",
            content: `Unrecognized command: ${command}\nType "help" for available commands.`,
        };
    }
}

module.exports = CommandHandler;
