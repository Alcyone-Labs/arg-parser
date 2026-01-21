import { Component, type IComponentConfig } from "../Component";

export interface IStackNavigatorConfig extends IComponentConfig {
  initialComponent: Component;
}

export class StackNavigator extends Component {
  private stack: Component[] = [];

  constructor(config: IStackNavigatorConfig) {
    super(config);
    this.stack.push(config.initialComponent);
  }

  public push(component: Component): void {
    this.stack.push(component);
    // Resize the new component immediately to current bounds
    component.resize(this.x, this.y, this.width, this.height);
  }

  public pop(): void {
    if (this.stack.length > 1) {
      this.stack.pop();
      // Ensure the restored component is resized
      this.currentComponent.resize(this.x, this.y, this.width, this.height);
    }
  }

  public setRoot(component: Component): void {
    this.stack = [component];
    component.resize(this.x, this.y, this.width, this.height);
  }

  public get currentComponent(): Component {
    return this.stack[this.stack.length - 1];
  }

  public override resize(x: number, y: number, width: number, height: number): void {
    super.resize(x, y, width, height);
    // Resize all components in stack? Or just the active one?
    // Good practice to resize current one. Older ones can retain state or resize on return.
    // For simplicity, resize current.
    this.currentComponent.resize(x, y, width, height);
  }

  public render(): string[] {
    return this.currentComponent.render();
  }

  public override handleInput(key: string): void {
    // 1. Check for Back navigation (Esc or Left Arrow)
    if ((key === "\u001b" || key === "\u001b[D") && this.stack.length > 1) {
      this.pop();
      // Resize the restored component to ensure it fits
      this.currentComponent.resize(this.x, this.y, this.width, this.height);
      return;
    }

    // 2. Delegate to active component
    this.currentComponent.handleInput(key);
  }

  public override handleMouse(event: any): void {
    this.currentComponent.handleMouse(event);
  }
}
