class GlobalState {
    constructor() {
        this.state = {
            currentTime: "test",
            motd: "NEW! 'twitter home' command now generally available",
            firstMessage: true,
            // Add other global state properties as needed
        };
    }

    update(newState) {
        this.state = { ...this.state, ...newState };
    }

    get() {
        return this.state;
    }
}

module.exports = new GlobalState();
