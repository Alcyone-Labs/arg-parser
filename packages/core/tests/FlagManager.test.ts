/**
 * @fileoverview FlagManager unit tests
 * @module @alcyone-labs/arg-parser/tests/FlagManager
 * 
 * Tests for the FlagManager class that handles flag registration and validation.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FlagManager } from '../src/index.js';
import { 
  createStringFlag, 
  createBooleanFlag, 
  createNumberFlag,
  createArrayFlag,
  createEnumFlag,
} from './utils/index.js';

describe('FlagManager', () => {
  let manager: FlagManager;

  beforeEach(() => {
    manager = new FlagManager();
  });

  describe('addFlag', () => {
    test('should add a single flag', () => {
      manager.addFlag(createStringFlag('username'));
      
      expect(manager.hasFlag('username')).toBe(true);
      expect(manager.getFlagNames()).toContain('username');
    });

    test('should add multiple flags', () => {
      manager.addFlag(createStringFlag('name'));
      manager.addFlag(createBooleanFlag('verbose'));
      manager.addFlag(createNumberFlag('count'));

      expect(manager.getAllFlags()).toHaveLength(3);
    });

    test('should throw on duplicate when configured', () => {
      const strictManager = new FlagManager({ throwForDuplicateFlags: true });
      strictManager.addFlag(createStringFlag('test'));

      expect(() => {
        strictManager.addFlag(createStringFlag('test'));
      }).toThrow('already exists');
    });

    test('should warn on duplicate when not strict', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.addFlag(createStringFlag('test'));
      manager.addFlag(createStringFlag('test'));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('removeFlag', () => {
    test('should remove a flag', () => {
      manager.addFlag(createStringFlag('temp'));
      expect(manager.hasFlag('temp')).toBe(true);

      manager.removeFlag('temp');
      expect(manager.hasFlag('temp')).toBe(false);
    });

    test('should return false when removing non-existent flag', () => {
      const result = manager.removeFlag('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getFlag', () => {
    test('should retrieve flag by name', () => {
      manager.addFlag(createStringFlag('query', { description: 'Search query' }));

      const flag = manager.getFlag('query');
      expect(flag).toBeDefined();
      expect(flag?.name).toBe('query');
      expect(flag?.description).toBe('Search query');
    });

    test('should return undefined for non-existent flag', () => {
      const flag = manager.getFlag('nonexistent');
      expect(flag).toBeUndefined();
    });
  });

  describe('findFlagByOption', () => {
    test('should find flag by short option', () => {
      manager.addFlag({
        name: 'verbose',
        options: ['-v', '--verbose'],
        type: 'boolean',
      });

      const flag = manager.findFlagByOption('-v');
      expect(flag?.name).toBe('verbose');
    });

    test('should find flag by long option', () => {
      manager.addFlag({
        name: 'output',
        options: ['-o', '--output'],
        type: 'string',
      });

      const flag = manager.findFlagByOption('--output');
      expect(flag?.name).toBe('output');
    });

    test('should return undefined for unknown option', () => {
      const flag = manager.findFlagByOption('--unknown');
      expect(flag).toBeUndefined();
    });
  });

  describe('collision detection', () => {
    test('should detect option collisions', () => {
      manager.addFlag({
        name: 'verbose',
        options: ['-v'],
        type: 'boolean',
      });
      
      manager.addFlag({
        name: 'version',
        options: ['-v'],
        type: 'boolean',
      });

      const collisions = manager.getCollisions();
      expect(collisions).toHaveLength(1);
      expect(collisions[0].option).toBe('-v');
    });

    test('should detect multiple collisions', () => {
      manager.addFlag({ name: 'a', options: ['-x'], type: 'boolean' });
      manager.addFlag({ name: 'b', options: ['-x'], type: 'boolean' });
      manager.addFlag({ name: 'c', options: ['-y'], type: 'boolean' });
      manager.addFlag({ name: 'd', options: ['-y'], type: 'boolean' });

      const collisions = manager.getCollisions();
      expect(collisions).toHaveLength(2);
    });

    test('should return empty array when no collisions', () => {
      manager.addFlag({ name: 'a', options: ['-a'], type: 'boolean' });
      manager.addFlag({ name: 'b', options: ['-b'], type: 'boolean' });

      const collisions = manager.getCollisions();
      expect(collisions).toHaveLength(0);
    });
  });

  describe('flag types', () => {
    test('should handle string flags', () => {
      manager.addFlag(createStringFlag('name'));
      const flag = manager.getFlag('name');
      expect(flag?.type).toBe('string');
    });

    test('should handle boolean flags', () => {
      manager.addFlag(createBooleanFlag('verbose'));
      const flag = manager.getFlag('verbose');
      expect(flag?.type).toBe('boolean');
      expect(flag?.flagOnly).toBe(true);
    });

    test('should handle number flags', () => {
      manager.addFlag(createNumberFlag('count'));
      const flag = manager.getFlag('count');
      expect(flag?.type).toBe('number');
    });

    test('should handle array flags', () => {
      manager.addFlag(createArrayFlag('tags'));
      const flag = manager.getFlag('tags');
      expect(flag?.allowMultiple).toBe(true);
    });

    test('should handle enum flags', () => {
      manager.addFlag(createEnumFlag('env', ['dev', 'prod']));
      const flag = manager.getFlag('env');
      expect(flag?.enum).toEqual(['dev', 'prod']);
    });
  });

  describe('clear', () => {
    test('should remove all flags', () => {
      manager.addFlag(createStringFlag('a'));
      manager.addFlag(createStringFlag('b'));
      expect(manager.getAllFlags()).toHaveLength(2);

      manager.clear();
      expect(manager.getAllFlags()).toHaveLength(0);
      expect(manager.hasFlag('a')).toBe(false);
    });
  });

  describe('initialization', () => {
    test('should accept initial flags', () => {
      const managerWithFlags = new FlagManager({}, [
        createStringFlag('name'),
        createBooleanFlag('verbose'),
      ]);

      expect(managerWithFlags.hasFlag('name')).toBe(true);
      expect(managerWithFlags.hasFlag('verbose')).toBe(true);
    });

    test('should apply options to initial flags', () => {
      const strictManager = new FlagManager(
        { throwForDuplicateFlags: true },
        [createStringFlag('test')]
      );

      expect(() => {
        strictManager.addFlag(createStringFlag('test'));
      }).toThrow();
    });
  });
});
