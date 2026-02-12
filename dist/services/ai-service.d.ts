export declare class AiService {
    constructor();
    generate(prompt: string): Promise<string>;
    reviewCode(diff: string, context: string): Promise<string>;
    breakdownEpic(summary: string, description: string): Promise<any>;
    generateStandup(yesterday: string, today: string): Promise<string>;
    generateJql(query: string): Promise<string>;
    callOpenAI(key: string, prompt: string): Promise<string>;
    callGemini(key: string, prompt: string): Promise<string>;
    callAnthropic(key: string, prompt: string): Promise<string>;
}
export declare const aiService: AiService;
