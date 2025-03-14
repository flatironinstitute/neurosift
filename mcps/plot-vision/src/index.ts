#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

interface AnalyzePlotArgs {
  image_path: string;
}

const isValidAnalyzePlotArgs = (args: any): args is AnalyzePlotArgs => {
  return (
    typeof args === 'object' &&
    typeof args.image_path === 'string'
  );
};

class PlotVisionServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'plot-vision',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_plot',
          description: 'Analyze a scientific plot using an LLM',
          inputSchema: {
            type: 'object',
            properties: {
              image_path: {
                type: 'string',
                description: 'The full path to the PNG image file to analyze. It is important to provide the full path.',
              },
              additional_instructions: {
                type: 'string',
                description: 'Additional instructions to include in the system prompt to the LLM (optional)',
                required: false,
              }
            },
            required: ['image_path'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'analyze_plot') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidAnalyzePlotArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid analyze_plot arguments'
        );
      }

      const { image_path, additional_instructions } = request.params.arguments;

      try {
        const imageData = fs.readFileSync(image_path);
        const base64Image = imageData.toString('base64');

        const systemPrompt = `You are an expert at analyzing scientific plots. Your responses will be used by an AI system to understand whether plots are informative and what information they convey.\n${additional_instructions || ''}`;

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            // model: 'anthropic/claude-3.5-sonnet',
            // gpt-4o is much more accurate for interpretting plots than claude-3.5-sonnet
            model: 'openai/gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: "text",
                    text: "Please provide a very detailed description and analysis of the plot in the image below."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://neurosift.app',
              'Content-Type': 'application/json'
            }
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: response.data.choices[0].message.content || 'No analysis generated'
            }
          ]
        };
      } catch (error) {
        if (error instanceof Error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error analyzing plot: ${error.message}`
              }
            ],
            isError: true
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('plot-vision MCP server running on stdio');
  }
}

const server = new PlotVisionServer();
server.run().catch(console.error);
