import {
  AbstractCalmConnection,
  type IAbstractCalmConnectionOptions,
} from './AbstractCalmConnection';

export interface ISandboxCalmConnectionOptions
  extends IAbstractCalmConnectionOptions {
  apiKey: string;
}

export class SandboxCalmConnection extends AbstractCalmConnection {
  private readonly apiKey: string;
  constructor(options: ISandboxCalmConnectionOptions) {
    super(options);
    this.apiKey = options.apiKey;
  }
  protected async attachAuth(): Promise<Record<string, string>> {
    return { APIKey: this.apiKey };
  }
}
