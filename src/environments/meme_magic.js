const axios = require("axios");

class MemeMagic {
    constructor() {
        this.glifApiUrl =
            "https://simple-api.glif.app/clzatbjok0002o928ttfozrro"; // TODO: make this configurable
        this.glifApiToken = process.env.GLIF_API_KEY;
    }

    getCommands() {
        return [
            {
                name: "generate",
                description: "Generate a meme with image description and tweet",
            },
            { name: "help", description: "Show Meme Generator help" },
        ];
    }

    async handleCommand(command, messages) {
        const [action, ...params] = command.split(" ");

        switch (action.toLowerCase()) {
            case "generate":
                return await this.generateMeme(params.join(" "));
            case "help":
                return this.help();
            default:
                return {
                    title: "Error:",
                    content: `Command ${action} not recognized.`,
                };
        }
    }

    async generateMeme(description) {
        try {
            const response = await axios.post(
                this.glifApiUrl,
                { truth_terminal_input: description },
                {
                    headers: {
                        Authorization: `Bearer ${this.glifApiToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const innerOutput = JSON.parse(response.data.output);
            const imageUrl = innerOutput.image || "";
            const tweet = innerOutput.tweet || "";

            return {
                title: 'Meme generated. Use \'twitter post "<tweet text>" [--reply_to <tweet_id>] --media_url "<url>"\' to post it on your personal Twitter account',
                content: `Image URL: ${imageUrl}\nTweet text: ${tweet}`,
                imageUrl: imageUrl,
                tweet: tweet,
            };
        } catch (error) {
            return {
                title: "Error Generating Meme",
                content: error.response ? error.response.data : error.message,
            };
        }
    }

    help() {
        return {
            title: "Meme Generator Help",
            content: `Available commands:
generate <description> - Generate a meme with the given description
help - Show this help message

Example usage:
meme generate --image_desc 'description of your image goes here, this will be interpreted by an image model' --tweet 'this is the text that you think should accompany the image. meme wont post it for you automatically though.'`,
        };
    }

    // Helper method to parse the input string into image description and tweet
    parseInput(input) {
        const imageDescMatch = input.match(/--image_desc\s+'([^']+)'/);
        const tweetMatch = input.match(/--tweet\s+'([^']+)'/);

        return {
            imageDesc: imageDescMatch ? imageDescMatch[1] : "",
            tweet: tweetMatch ? tweetMatch[1] : "",
        };
    }
}

module.exports = MemeMagic;
