from openai import OpenAI

class ChatBot:
    def __init__(self, api_base, api_key):
        self.client = OpenAI(base_url=api_base, api_key=api_key)
        self.conversation_history = []

    def chat(self, message, model="default", temperature=0.7, max_tokens=150):
        self.conversation_history.append({"role": "user", "content": message})

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=self.conversation_history,
                temperature=temperature,
                max_tokens=max_tokens
            )

            reply = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            return f"Error: {str(e)}"

if __name__ == "__main__":
    api_base = "http://localhost/v1"
    api_key = "sk-simulated-api-key"

    chatbot = ChatBot(api_base, api_key)

    while True:
        user_input = input("You: ")
        response = chatbot.chat(user_input)
        print(f"Bot: {response}")