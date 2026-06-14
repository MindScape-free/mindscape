import { EventEmitter } from 'eventemitter3';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentEvents {
  'message:user': (message: Message) => void;
  'message:assistant': (message: Message) => void;
  'item:update': (item: any) => void;
  'stream:start': () => void;
  'stream:delta': (delta: string, accumulated: string) => void;
  'stream:end': (fullText: string) => void;
  'tool:call': (name: string, args: unknown) => void;
  'tool:result': (callId: string, result: unknown) => void;
  'reasoning:update': (text: string) => void;
  'error': (error: Error) => void;
  'thinking:start': () => void;
  'thinking:end': () => void;
}

export interface AgentConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  tools?: any[];
  maxSteps?: number;
}

export class Agent extends EventEmitter<AgentEvents> {
  private messages: Message[] = [];
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  setMessages(messages: Message[]): void {
    this.messages = messages;
  }

  clearHistory(): void {
    this.messages = [];
  }

  setInstructions(instructions: string): void {
    this.config.instructions = instructions;
  }

  addTool(newTool: any): void {
    if (!this.config.tools) this.config.tools = [];
    this.config.tools.push(newTool);
  }

  async send(content: string): Promise<string> {
    throw new Error("Agent mode is disabled");
  }

  async sendSync(content: string): Promise<string> {
    throw new Error("Agent mode is disabled");
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
