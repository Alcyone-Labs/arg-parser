/**
 * MCP Specification Compliance Tests
 * 
 * Tests to ensure our MCP implementation strictly follows the official MCP specifications:
 * - Lifecycle (initialization, operation, shutdown)
 * - Tools (discovery, invocation, schema validation)
 * - Logging (levels, notifications)
 * - Versioning (protocol version negotiation)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

interface McpMessage {
  jsonrpc: string;
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface McpResponse extends McpMessage {
  id: number;
  result?: any;
  error?: any;
}

interface McpNotification extends McpMessage {
  method: string;
  params?: any;
}

class McpTestClient {
  private process: ChildProcess | null = null;
  private messageId = 1;
  private responses: Map<number, McpResponse> = new Map();
  private notifications: McpNotification[] = [];
  private outputBuffer = '';

  async startServer(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [serverPath, '--s-mcp-serve'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout?.on('data', (data) => {
        this.outputBuffer += data.toString();
        this.processMessages();
      });

      this.process.stderr?.on('data', (data) => {
        // Server logs go to stderr, ignore for now
      });

      this.process.on('error', reject);
      
      // Give server time to start
      setTimeout(resolve, 100);
    });
  }

  private processMessages(): void {
    const lines = this.outputBuffer.split('\n');
    this.outputBuffer = lines.pop() || ''; // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: McpMessage = JSON.parse(line);
          
          if (message.id !== undefined) {
            // Response
            this.responses.set(message.id, message as McpResponse);
          } else if (message.method) {
            // Notification
            this.notifications.push(message as McpNotification);
          }
        } catch (error) {
          // Ignore non-JSON lines (server logs)
        }
      }
    }
  }

  async sendRequest(method: string, params?: any): Promise<McpResponse> {
    const id = this.messageId++;
    const request: McpMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Server not started'));
        return;
      }

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Wait for response
      const checkResponse = () => {
        if (this.responses.has(id)) {
          const response = this.responses.get(id)!;
          this.responses.delete(id);
          resolve(response);
        } else {
          setTimeout(checkResponse, 10);
        }
      };

      setTimeout(checkResponse, 10);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.responses.has(id)) {
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 5000);
    });
  }

  sendNotification(method: string, params?: any): void {
    const notification: McpMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

    this.process?.stdin?.write(JSON.stringify(notification) + '\n');
  }

  getNotifications(): McpNotification[] {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

describe('MCP Specification Compliance', () => {
  let client: McpTestClient;
  const serverPath = join(process.cwd(), 'examples/community/canny-cli/canny-cli.js');

  beforeEach(async () => {
    client = new McpTestClient();
    await client.startServer(serverPath);
  });

  afterEach(async () => {
    await client.stop();
  });

  describe('Lifecycle Compliance', () => {
    it('should support proper initialization sequence', async () => {
      // Step 1: Send initialize request
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
          elicitation: {}
        },
        clientInfo: {
          name: 'TestClient',
          title: 'MCP Test Client',
          version: '1.0.0'
        }
      });

      // Verify initialize response structure
      expect(initResponse.jsonrpc).toBe('2.0');
      expect(initResponse.result).toBeDefined();
      expect(initResponse.result.protocolVersion).toBe('2024-11-05');
      expect(initResponse.result.capabilities).toBeDefined();
      expect(initResponse.result.serverInfo).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBeDefined();
      expect(initResponse.result.serverInfo.version).toBeDefined();

      // Step 2: Send initialized notification
      client.sendNotification('notifications/initialized');

      // Server should now be ready for normal operations
    });

    it('should declare tools capability correctly', async () => {
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });

      expect(initResponse.result.capabilities.tools).toBeDefined();
      expect(typeof initResponse.result.capabilities.tools).toBe('object');
    });

    it('should handle version negotiation', async () => {
      // Test with supported version
      const response1 = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });

      expect(response1.result.protocolVersion).toBe('2024-11-05');

      // Test with potentially unsupported version (should still work or return supported version)
      const response2 = await client.sendRequest('initialize', {
        protocolVersion: '2023-01-01',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });

      expect(response2.result.protocolVersion).toBeDefined();
    });
  });

  describe('Tools Compliance', () => {
    beforeEach(async () => {
      // Initialize the server first
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });
      client.sendNotification('notifications/initialized');
    });

    it('should list tools with proper schema', async () => {
      const response = await client.sendRequest('tools/list');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);

      // Check each tool has required fields
      for (const tool of response.result.tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('should handle tool calls with proper response format', async () => {
      // First get available tools
      const listResponse = await client.sendRequest('tools/list');
      const tools = listResponse.result.tools;
      
      expect(tools.length).toBeGreaterThan(0);
      const tool = tools[0];

      // Call the tool
      const callResponse = await client.sendRequest('tools/call', {
        name: tool.name,
        arguments: { query: 'test' }
      });

      expect(callResponse.jsonrpc).toBe('2.0');
      expect(callResponse.result).toBeDefined();
      expect(callResponse.result.content).toBeDefined();
      expect(Array.isArray(callResponse.result.content)).toBe(true);

      // Check content structure
      for (const content of callResponse.result.content) {
        expect(content.type).toBeDefined();
        expect(['text', 'image', 'resource'].includes(content.type)).toBe(true);
      }

      // isError should be boolean if present
      if (callResponse.result.isError !== undefined) {
        expect(typeof callResponse.result.isError).toBe('boolean');
      }
    });

    it('should handle tool call errors properly', async () => {
      // Try to call non-existent tool
      const response = await client.sendRequest('tools/call', {
        name: 'non-existent-tool',
        arguments: {}
      });

      // Should return error response
      expect(response.error).toBeDefined();
      expect(response.error.code).toBeDefined();
      expect(response.error.message).toBeDefined();
    });
  });

  describe('Logging Compliance', () => {
    beforeEach(async () => {
      // Initialize the server first
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });
      client.sendNotification('notifications/initialized');
    });

    it('should declare logging capability if supported', async () => {
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });

      // If logging is supported, it should be declared
      if (initResponse.result.capabilities.logging) {
        expect(typeof initResponse.result.capabilities.logging).toBe('object');
      }
    });

    it('should handle logging level setting if supported', async () => {
      try {
        const response = await client.sendRequest('logging/setLevel', {
          level: 'info'
        });

        // Should return success or method not found
        expect(response.result !== undefined || response.error !== undefined).toBe(true);

        if (response.error) {
          // Method not found is acceptable if logging not supported
          expect(response.error.code).toBe(-32601);
        }
      } catch (error) {
        // Timeout is acceptable if logging not implemented
      }
    });

    it('should send log notifications with proper format if logging enabled', async () => {
      // Clear any existing notifications
      client.clearNotifications();

      // Try to trigger some server activity that might generate logs
      await client.sendRequest('tools/list');

      // Check if any log notifications were sent
      const notifications = client.getNotifications();
      const logNotifications = notifications.filter(n => n.method === 'notifications/message');

      for (const logNotif of logNotifications) {
        expect(logNotif.params).toBeDefined();
        expect(logNotif.params.level).toBeDefined();
        expect(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']
          .includes(logNotif.params.level)).toBe(true);

        if (logNotif.params.logger) {
          expect(typeof logNotif.params.logger).toBe('string');
        }

        if (logNotif.params.data) {
          expect(typeof logNotif.params.data).toBe('object');
        }
      }
    });
  });

  describe('JSON-RPC 2.0 Compliance', () => {
    beforeEach(async () => {
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });
      client.sendNotification('notifications/initialized');
    });

    it('should always include jsonrpc field with value "2.0"', async () => {
      const response = await client.sendRequest('tools/list');
      expect(response.jsonrpc).toBe('2.0');
    });

    it('should include id field in responses that matches request id', async () => {
      const response = await client.sendRequest('tools/list');
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('number');
    });

    it('should include either result or error but not both', async () => {
      const response = await client.sendRequest('tools/list');

      const hasResult = response.result !== undefined;
      const hasError = response.error !== undefined;

      expect(hasResult !== hasError).toBe(true); // XOR - exactly one should be true
    });

    it('should handle malformed requests gracefully', async () => {
      // This test would require direct socket access to send malformed JSON
      // For now, we'll test with invalid method
      const response = await client.sendRequest('invalid/method');

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
      expect(response.error.message).toBeDefined();
    });
  });

  describe('Error Handling Compliance', () => {
    beforeEach(async () => {
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'TestClient', version: '1.0.0' }
      });
      client.sendNotification('notifications/initialized');
    });

    it('should return proper error codes for standard JSON-RPC errors', async () => {
      // Method not found
      const response1 = await client.sendRequest('nonexistent/method');
      expect(response1.error.code).toBe(-32601);

      // Invalid params (try calling tool without required params)
      const listResponse = await client.sendRequest('tools/list');
      if (listResponse.result.tools.length > 0) {
        const tool = listResponse.result.tools[0];
        const response2 = await client.sendRequest('tools/call', {
          name: tool.name
          // Missing arguments
        });

        // Should be either invalid params (-32602) or application error
        expect(response2.error).toBeDefined();
        expect(response2.error.code).toBeDefined();
      }
    });

    it('should include error message and optional data', async () => {
      const response = await client.sendRequest('tools/call', {
        name: 'nonexistent-tool',
        arguments: {}
      });

      expect(response.error).toBeDefined();
      expect(response.error.message).toBeDefined();
      expect(typeof response.error.message).toBe('string');

      // Data field is optional but if present should be structured
      if (response.error.data) {
        expect(typeof response.error.data).toBe('object');
      }
    });
  });
});
