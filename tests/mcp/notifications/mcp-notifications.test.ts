/**
 * Tests for MCP Change Notifications functionality
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createDebouncedNotifier,
  createFilteredListener,
  createLoggingListener,
  globalNotificationsManager,
  McpNotificationsManager,
} from "../../../src/mcp/mcp-notifications.js";
import type {
  McpChangeEvent,
  McpChangeListener,
} from "../../../src/mcp/mcp-notifications.js";

describe("McpNotificationsManager", () => {
  let manager: McpNotificationsManager;
  let mockConnection: any;

  beforeEach(() => {
    manager = new McpNotificationsManager();
    mockConnection = {
      sendNotification: vi.fn(),
    };
  });

  describe("Client Management", () => {
    test("should add and remove clients", () => {
      manager.addClient("client1", mockConnection);
      expect(manager.getClientCount()).toBe(1);

      manager.removeClient("client1");
      expect(manager.getClientCount()).toBe(0);
    });

    test("should handle multiple clients", () => {
      manager.addClient("client1", mockConnection);
      manager.addClient("client2", mockConnection);
      expect(manager.getClientCount()).toBe(2);

      manager.removeClient("client1");
      expect(manager.getClientCount()).toBe(1);
    });
  });

  describe("Subscription Management", () => {
    beforeEach(() => {
      manager.addClient("client1", mockConnection);
    });

    test("should subscribe client to specific change types", () => {
      manager.subscribe("client1", "tools");
      manager.subscribe("client1", "resources");

      const subscriptions = manager.getClientSubscriptions("client1");
      expect(subscriptions?.has("tools")).toBe(true);
      expect(subscriptions?.has("resources")).toBe(true);
      expect(subscriptions?.has("prompts")).toBe(false);
    });

    test("should unsubscribe client from specific change types", () => {
      manager.subscribe("client1", "tools");
      manager.subscribe("client1", "resources");

      manager.unsubscribe("client1", "tools");

      const subscriptions = manager.getClientSubscriptions("client1");
      expect(subscriptions?.has("tools")).toBe(false);
      expect(subscriptions?.has("resources")).toBe(true);
    });

    test("should subscribe to all change types", () => {
      manager.subscribeToAll("client1");

      const subscriptions = manager.getClientSubscriptions("client1");
      expect(subscriptions?.has("tools")).toBe(true);
      expect(subscriptions?.has("resources")).toBe(true);
      expect(subscriptions?.has("prompts")).toBe(true);
    });

    test("should unsubscribe from all change types", () => {
      manager.subscribeToAll("client1");
      manager.unsubscribeFromAll("client1");

      const subscriptions = manager.getClientSubscriptions("client1");
      expect(subscriptions?.size).toBe(0);
    });

    test("should check subscription status", () => {
      manager.subscribe("client1", "tools");

      expect(manager.isClientSubscribed("client1", "tools")).toBe(true);
      expect(manager.isClientSubscribed("client1", "resources")).toBe(false);
      expect(manager.isClientSubscribed("non-existent", "tools")).toBe(false);
    });
  });

  describe("Change Notifications", () => {
    beforeEach(() => {
      manager.addClient("client1", mockConnection);
      manager.addClient("client2", mockConnection);
    });

    test("should notify subscribed clients", () => {
      manager.subscribe("client1", "tools");
      manager.subscribe("client2", "resources");

      manager.notifyChange("tools", "added", "new-tool");

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        "notifications/tools/list_changed",
        {},
      );
      expect(mockConnection.sendNotification).toHaveBeenCalledTimes(1);
    });

    test("should not notify unsubscribed clients", () => {
      manager.subscribe("client1", "resources");

      manager.notifyChange("tools", "added", "new-tool");

      expect(mockConnection.sendNotification).not.toHaveBeenCalled();
    });

    test("should notify multiple subscribed clients", () => {
      manager.subscribe("client1", "tools");
      manager.subscribe("client2", "tools");

      manager.notifyChange("tools", "added", "new-tool");

      expect(mockConnection.sendNotification).toHaveBeenCalledTimes(2);
    });

    test("should handle connection errors gracefully", () => {
      const errorConnection = {
        sendNotification: vi.fn().mockImplementation(() => {
          throw new Error("Connection error");
        }),
      };

      manager.addClient("error-client", errorConnection);
      manager.subscribe("error-client", "tools");

      // Should not throw
      expect(() => {
        manager.notifyChange("tools", "added", "new-tool");
      }).not.toThrow();

      // Client should be removed after error
      expect(manager.getClientCount()).toBe(2); // Original 2 clients remain
    });
  });

  describe("Global Listeners", () => {
    test("should add and notify global listeners", () => {
      let receivedEvent: McpChangeEvent | null = null;
      const listener: McpChangeListener = (event) => {
        receivedEvent = event;
      };

      manager.addGlobalListener(listener);
      manager.notifyChange("tools", "added", "new-tool");

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.type).toBe("tools");
      expect(receivedEvent?.action).toBe("added");
      expect(receivedEvent?.entityName).toBe("new-tool");
    });

    test("should remove global listeners", () => {
      let notificationCount = 0;
      const listener: McpChangeListener = () => {
        notificationCount++;
      };

      manager.addGlobalListener(listener);
      manager.notifyChange("tools", "added", "tool1");

      manager.removeGlobalListener(listener);
      manager.notifyChange("tools", "added", "tool2");

      expect(notificationCount).toBe(1);
    });

    test("should handle listener errors gracefully", () => {
      const errorListener: McpChangeListener = () => {
        throw new Error("Listener error");
      };

      manager.addGlobalListener(errorListener);

      // Should not throw
      expect(() => {
        manager.notifyChange("tools", "added", "new-tool");
      }).not.toThrow();
    });
  });

  describe("Change History", () => {
    test("should track change history", () => {
      manager.notifyChange("tools", "added", "tool1");
      manager.notifyChange("resources", "removed", "resource1");

      const history = manager.getChangeHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe("tools");
      expect(history[1].type).toBe("resources");
    });

    test("should limit history size", () => {
      manager.setMaxHistorySize(2);

      manager.notifyChange("tools", "added", "tool1");
      manager.notifyChange("tools", "added", "tool2");
      manager.notifyChange("tools", "added", "tool3");

      const history = manager.getChangeHistory();
      expect(history).toHaveLength(2);
      expect(history[0].entityName).toBe("tool2");
      expect(history[1].entityName).toBe("tool3");
    });

    test("should get limited history", () => {
      manager.notifyChange("tools", "added", "tool1");
      manager.notifyChange("tools", "added", "tool2");
      manager.notifyChange("tools", "added", "tool3");

      const history = manager.getChangeHistory(2);
      expect(history).toHaveLength(2);
      expect(history[0].entityName).toBe("tool2");
      expect(history[1].entityName).toBe("tool3");
    });

    test("should clear history", () => {
      manager.notifyChange("tools", "added", "tool1");
      expect(manager.getChangeHistory()).toHaveLength(1);

      manager.clearHistory();
      expect(manager.getChangeHistory()).toHaveLength(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      manager.addClient("client1", mockConnection);
      manager.addClient("client2", mockConnection);
      manager.addClient("client3", mockConnection);
    });

    test("should get subscription statistics", () => {
      manager.subscribe("client1", "tools");
      manager.subscribe("client1", "resources");
      manager.subscribe("client2", "tools");
      manager.subscribe("client3", "prompts");

      const stats = manager.getSubscriptionStats();
      expect(stats.tools).toBe(2);
      expect(stats.resources).toBe(1);
      expect(stats.prompts).toBe(1);
    });
  });

  describe("Clear", () => {
    test("should clear all data", () => {
      manager.addClient("client1", mockConnection);
      manager.subscribe("client1", "tools");
      manager.addGlobalListener(() => {});
      manager.notifyChange("tools", "added", "tool1");

      manager.clear();

      expect(manager.getClientCount()).toBe(0);
      expect(manager.getChangeHistory()).toHaveLength(0);
    });
  });
});

describe("Utility Functions", () => {
  describe("createDebouncedNotifier", () => {
    test("should debounce rapid notifications", async () => {
      const manager = new McpNotificationsManager();
      const debouncedNotify = createDebouncedNotifier(manager, 50);

      let notificationCount = 0;
      manager.addGlobalListener(() => notificationCount++);

      // Rapid calls
      debouncedNotify("tools", "added", "tool1");
      debouncedNotify("tools", "added", "tool2");
      debouncedNotify("tools", "added", "tool3");

      // Should not have notified yet
      expect(notificationCount).toBe(0);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(notificationCount).toBe(3); // All notifications should fire
    });
  });

  describe("createFilteredListener", () => {
    test("should filter notifications by type", () => {
      let receivedEvents: McpChangeEvent[] = [];
      const filteredListener = createFilteredListener(
        ["tools", "resources"],
        (event) => receivedEvents.push(event),
      );

      filteredListener({
        type: "tools",
        action: "added",
        timestamp: new Date(),
      });
      filteredListener({
        type: "prompts",
        action: "added",
        timestamp: new Date(),
      });
      filteredListener({
        type: "resources",
        action: "removed",
        timestamp: new Date(),
      });

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe("tools");
      expect(receivedEvents[1].type).toBe("resources");
    });
  });

  describe("createLoggingListener", () => {
    test("should create logging listener", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const loggingListener = createLoggingListener("[TEST]");

      loggingListener({
        type: "tools",
        action: "added",
        timestamp: new Date(),
        entityName: "test-tool",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TEST] tools added (test-tool)"),
      );

      consoleSpy.mockRestore();
    });
  });
});

describe("Global Notifications Manager", () => {
  test("should provide global instance", () => {
    expect(globalNotificationsManager).toBeInstanceOf(McpNotificationsManager);
  });
});
