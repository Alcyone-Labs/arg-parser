import { IFlag, ProcessedFlag } from "./types";
export declare class FlagManager {
    #private;
    constructor(options?: {
        throwForDuplicateFlags?: boolean;
    }, initialFlags?: readonly IFlag[]);
    static _safeFlag(flag: IFlag): ProcessedFlag;
    addFlag(flag: IFlag): this;
    _setProcessedFlagForInheritance(processedFlag: ProcessedFlag): this;
    addFlags(flags: readonly IFlag[]): this;
    hasFlag(name: string): boolean;
    getFlag(name: string): ProcessedFlag | undefined;
    get flags(): ProcessedFlag[];
    get flagNames(): string[];
}
//# sourceMappingURL=FlagManager.d.ts.map