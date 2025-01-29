import axios from 'axios';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const DEEPSEEK_MODELS = [
    'deepseek-r1:1.5b',
    'deepseek-r1:7b',
    'deepseek-r1:8b',
    'deepseek-r1:14b',
    'deepseek-r1:32b',
    'deepseek-r1:70b',
    'deepseek-r1:671b'
] as const;

export type DeepseekModel = typeof DEEPSEEK_MODELS[number];

export class OllamaService {
    private baseUrl: string;
    private model: DeepseekModel;

    constructor(baseUrl: string = 'http://localhost:11434', model: DeepseekModel = 'deepseek-r1:7b') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    setModel(model: DeepseekModel) {
        this.model = model;
    }

    async chat(messages: ChatMessage[]): Promise<string> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/chat`, {
                model: this.model,
                messages: messages,
                stream: false
            });

            return response.data.message.content;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Ollama API Error: ${error.message}`);
            }
            throw error;
        }
    }

    async checkModelAvailability(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            const models = response.data.models || [];
            return models.some((model: any) => model.name === this.model);
        } catch (error) {
            return false;
        }
    }

    async pullModel(): Promise<boolean> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/pull`, {
                name: this.model,
                stream: false
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
} 