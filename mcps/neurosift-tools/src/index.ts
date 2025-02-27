#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEUROSIFT_TOOLS_API_URL || 'https://neurosift-chat-agent-tools.vercel.app/api';

interface NeurosiftTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    required: string[];
    properties: Record<string, {
      type: string;
      description: string;
      default?: unknown;
    }>;
  };
}

interface NeurosiftToolResponse {
  results?: unknown;
  error?: string;
}

class NeurosiftToolsServer {
  private server: Server;
  private tools: NeurosiftTool[] = [];
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'neurosift-tools',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: API_URL,
    });

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async fetchTools(): Promise<NeurosiftTool[]> {
    try {
      const response = await this.axiosInstance.get<NeurosiftTool[]>('/tools');
      return response.data;
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw new McpError(
        ErrorCode.InternalError,
        'Failed to fetch available tools'
      );
    }
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.tools = await this.fetchTools();

      return {
        tools: this.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const tool = this.tools.find((t) => t.name === request.params.name);

      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      try {
        const response = await this.axiosInstance.post<NeurosiftToolResponse>(
          `/${tool.name}`,
          request.params.arguments
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<{ error: string }>;
          return {
            content: [
              {
                type: 'text',
                text: `API error: ${axiosError.response?.data?.error || axiosError.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Neurosift Tools MCP server running on stdio');
  }
}

const server = new NeurosiftToolsServer();
server.run().catch(console.error);
