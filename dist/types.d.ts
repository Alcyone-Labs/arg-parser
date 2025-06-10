import { z } from 'zod';
type ArgParserInstance = any;
export declare const zodFlagSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    allowLigature: z.ZodDefault<z.ZodBoolean>;
    allowMultiple: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    options: z.ZodArray<z.ZodString, "many">;
    defaultValue: z.ZodOptional<z.ZodAny>;
    type: z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodAny>, z.ZodEffects<z.ZodString, string, string>]>>;
    mandatory: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodBoolean>]>>;
    flagOnly: z.ZodDefault<z.ZodBoolean>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid, z.ZodPromise<z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid]>>]>>>;
    enum: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodString;
    allowLigature: z.ZodDefault<z.ZodBoolean>;
    allowMultiple: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    options: z.ZodArray<z.ZodString, "many">;
    defaultValue: z.ZodOptional<z.ZodAny>;
    type: z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodAny>, z.ZodEffects<z.ZodString, string, string>]>>;
    mandatory: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodBoolean>]>>;
    flagOnly: z.ZodDefault<z.ZodBoolean>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid, z.ZodPromise<z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid]>>]>>>;
    enum: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodString;
    allowLigature: z.ZodDefault<z.ZodBoolean>;
    allowMultiple: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    options: z.ZodArray<z.ZodString, "many">;
    defaultValue: z.ZodOptional<z.ZodAny>;
    type: z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodAny>, z.ZodEffects<z.ZodString, string, string>]>>;
    mandatory: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodBoolean>]>>;
    flagOnly: z.ZodDefault<z.ZodBoolean>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid, z.ZodPromise<z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid]>>]>>>;
    enum: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, z.ZodTypeAny, "passthrough">>, {
    [key: string]: any;
}, z.objectInputType<{
    name: z.ZodString;
    allowLigature: z.ZodDefault<z.ZodBoolean>;
    allowMultiple: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    options: z.ZodArray<z.ZodString, "many">;
    defaultValue: z.ZodOptional<z.ZodAny>;
    type: z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodEffects<z.ZodAny, any, any>, z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodAny>, z.ZodEffects<z.ZodString, string, string>]>>;
    mandatory: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodBoolean>]>>;
    flagOnly: z.ZodDefault<z.ZodBoolean>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid, z.ZodPromise<z.ZodUnion<[z.ZodBoolean, z.ZodString, z.ZodVoid]>>]>>>;
    enum: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type IFlagCore = z.input<typeof zodFlagSchema>;
export type IFlag = IFlagCore & {
    /** @alias defaultValue */
    default?: any;
    /** @alias mandatory */
    required?: boolean | ((parsedArgs: TParsedArgs<any>) => boolean);
    handler?: (ctx: HandlerContext) => void | Promise<void>;
};
export type ProcessedFlagCore = z.output<typeof zodFlagSchema>;
export type ProcessedFlag = Omit<ProcessedFlagCore, "type" | "validate" | "enum" | "mandatory"> & {
    type: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor | ((value: string) => any);
    validate?: (value: any, parsedArgs?: TParsedArgs<ProcessedFlag[]>) => boolean | string | void | Promise<boolean | string | void>;
    enum?: any[];
    mandatory?: boolean | ((parsedArgs: TParsedArgs<ProcessedFlag[]>) => boolean);
};
export type ResolveType<T> = T extends (...args: any[]) => infer R ? R : T extends new (...args: any[]) => infer S ? S : T extends 'string' ? string : T extends 'number' ? number : T extends 'boolean' ? boolean : T extends 'array' ? any[] : T extends 'object' ? Record<string, any> : any;
export type ExtractFlagType<Flag extends ProcessedFlag> = Flag["flagOnly"] extends true ? Flag["allowMultiple"] extends true ? boolean[] : boolean : Flag["allowMultiple"] extends true ? Array<ResolveType<Flag["type"]>> : ResolveType<Flag["type"]>;
export type TParsedArgs<Flags extends readonly (IFlag | ProcessedFlag)[]> = {
    [K in Flags[number]["name"]]: Flags[number] extends ProcessedFlag ? ExtractFlagType<Extract<Flags[number], {
        name: K;
    } & ProcessedFlag>> : any;
};
export type HandlerContext = {
    args: TParsedArgs<ProcessedFlag[]>;
    parentArgs?: TParsedArgs<ProcessedFlag[]>;
    commandChain: string[];
    parser: ArgParserInstance;
};
type ArgParserForSubcommand = any;
export interface ISubCommand {
    name: string;
    description?: string;
    parser: ArgParserForSubcommand;
    handler?: (ctx: HandlerContext) => void | Promise<void>;
}
export type FlagsArray = readonly ProcessedFlag[];
export {};
//# sourceMappingURL=types.d.ts.map