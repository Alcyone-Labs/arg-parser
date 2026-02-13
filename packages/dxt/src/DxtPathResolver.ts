/**
 * DXT Path Resolver
 * 
 * Resolves and substitutes variables in DXT paths.
 */

export interface IPathContext {
  projectRoot?: string;
  entryPoint?: string;
  packageName?: string;
  version?: string;
}

export interface IDxtVariableConfig {
  allowUndefined?: boolean;
}

/**
 * DXT Path Resolver
 */
export class DxtPathResolver {
  /**
   * Detect context from current environment
   */
  static detectContext(): IPathContext {
    return {
      projectRoot: process.cwd(),
      entryPoint: process.argv[1],
    };
  }
  
  /**
   * Substitute variables in a path
   */
  static substituteVariables(
    path: string,
    context: IPathContext,
    config: IDxtVariableConfig = {},
  ): string {
    let result = path;
    
    // Substitute ${PROJECT_ROOT}
    if (context.projectRoot) {
      result = result.replace(/\$\{PROJECT_ROOT\}/g, context.projectRoot);
    }
    
    // Substitute ${ENTRY_POINT}
    if (context.entryPoint) {
      result = result.replace(/\$\{ENTRY_POINT\}/g, context.entryPoint);
    }
    
    // Substitute ${PACKAGE_NAME}
    if (context.packageName) {
      result = result.replace(/\$\{PACKAGE_NAME\}/g, context.packageName);
    }
    
    // Substitute ${VERSION}
    if (context.version) {
      result = result.replace(/\$\{VERSION\}/g, context.version);
    }
    
    // Check for unresolved variables
    const unresolved = result.match(/\$\{[^}]+\}/g);
    if (unresolved && !config.allowUndefined) {
      throw new Error(`Unresolved variables in path: ${unresolved.join(', ')}`);
    }
    
    return result;
  }
}
