var ae = (g) => {
  throw TypeError(g);
};
var Q = (g, e, n) => e.has(g) || ae("Cannot " + n);
var t = (g, e, n) => (Q(g, e, "read from private field"), n ? n.call(g) : e.get(g)), N = (g, e, n) => e.has(g) ? ae("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(g) : e.set(g, n), M = (g, e, n, a) => (Q(g, e, "write to private field"), a ? a.call(g, n) : e.set(g, n), n), A = (g, e, n) => (Q(g, e, "access private method"), n);
import $ from "chalk";
import { createRegExp as de, anyOf as ue, oneOrMore as me, char as fe } from "magic-regexp";
import { z as f } from "zod";
const U = {}, he = f.object({
  name: f.string().min(1, "Flag name cannot be empty").describe(
    "The output property name, used as a return key `{name: value}`. Must be unique."
  ),
  allowLigature: f.boolean().default(!0).describe(
    "Enable both forms of flag input, e.g., `./script.js -f=value` and `-f value`."
  ),
  allowMultiple: f.boolean().default(!1).describe(
    "Allow passing the same flag multiple times, e.g., `-f val1 -f val2` results in an array."
  ),
  description: f.union([f.string(), f.array(f.string())]).describe("Textual description for help messages."),
  options: f.array(f.string().min(1)).min(1, "Flag must have at least one option (e.g., ['-f', '--flag'])").describe("Array of option strings, e.g., ['-f', '--flag']."),
  defaultValue: f.any().optional().describe("Default value if the flag is not provided."),
  type: f.union([
    f.any().refine((g) => g === String, { message: "Must be String constructor" }),
    f.any().refine((g) => g === Number, { message: "Must be Number constructor" }),
    f.any().refine((g) => g === Boolean, { message: "Must be Boolean constructor" }),
    f.any().refine((g) => g === Array, { message: "Must be Array constructor" }),
    f.any().refine((g) => g === Object, { message: "Must be Object constructor" }),
    f.function().args(f.string()).returns(f.any()),
    // Custom parser function
    f.string().refine(
      (g) => ["boolean", "string", "number", "array", "object"].includes(
        g.toLowerCase()
      ),
      { message: "Invalid type string. Must be one of 'boolean', 'string', 'number', 'array', 'object'." }
    )
  ]).default("string").describe("Expected data type or a custom parser function. Defaults to 'string'."),
  mandatory: f.union([f.boolean(), f.function().args(f.any()).returns(f.boolean())]).optional().describe("Makes the flag mandatory, can be a boolean or a function conditional on other args."),
  flagOnly: f.boolean().default(!1).describe(
    "If true, the flag's presence is noted (true/false), and any subsequent value is not consumed by this flag."
  ),
  validate: f.function().args(f.any().optional(), f.any().optional()).returns(f.union([f.boolean(), f.string(), f.void(), f.promise(f.union([f.boolean(), f.string(), f.void()]))])).optional().describe("Custom validation function for the flag's value (receives value, parsedArgs)."),
  enum: f.array(f.any()).optional().describe("Array of allowed values for the flag.")
}).passthrough().transform((g) => {
  const e = { ...g };
  return "default" in e && e.default !== void 0 && !("defaultValue" in e) && (e.defaultValue = e.default), "required" in e && e.required !== void 0 && !("mandatory" in e) && (e.mandatory = e.required), e;
});
var L, Z;
const oe = class oe {
  constructor(e = {}, n = []) {
    N(this, L, /* @__PURE__ */ new Map());
    N(this, Z);
    M(this, Z, e.throwForDuplicateFlags ?? !1), this.addFlags(n);
  }
  static _safeFlag(e) {
    const n = he.parse(e);
    let a;
    const l = n.type;
    if (typeof l == "string")
      switch (l.toLowerCase()) {
        case "boolean":
          a = Boolean;
          break;
        case "string":
          a = String;
          break;
        case "number":
          a = Number;
          break;
        case "array":
          a = Array;
          break;
        case "object":
          a = Object;
          break;
        default:
          throw new Error(`Invalid type string: ${l}`);
      }
    else
      a = l;
    return {
      ...n,
      options: n.options,
      type: a,
      validate: n.validate,
      enum: n.enum,
      mandatory: n.mandatory
    };
  }
  addFlag(e) {
    const n = oe._safeFlag(e);
    if (t(this, L).has(n.name)) {
      if (t(this, Z))
        throw new Error(
          `FlagManager: Flag '${n.name}' already exists.`
        );
      return console.warn(
        `Warning: FlagManager: Flag '${n.name}' already exists. Duplicate not added.`
      ), this;
    }
    return t(this, L).set(n.name, n), this;
  }
  _setProcessedFlagForInheritance(e) {
    return t(this, L).has(e.name) ? this : (t(this, L).set(e.name, e), this);
  }
  addFlags(e) {
    for (const n of e)
      this.addFlag(n);
    return this;
  }
  hasFlag(e) {
    return t(this, L).has(e);
  }
  getFlag(e) {
    return t(this, L).get(e);
  }
  get flags() {
    return Array.from(t(this, L).values());
  }
  get flagNames() {
    return Array.from(t(this, L).values()).map((e) => e.name);
  }
};
L = new WeakMap(), Z = new WeakMap();
let X = oe;
class R extends Error {
  constructor(e, n = []) {
    super(e), this.cmdChain = n, this.name = "ArgParserError", this.commandChain = n;
  }
}
var S, k, P, E, D, H, I, T, _, K, B, F, w, y, z, re, ie, Y, le, G, ce, ee, ne, te;
const W = class W {
  constructor(e = {}, n) {
    N(this, y);
    N(this, S, "Argument Parser");
    N(this, k);
    N(this, P, "");
    N(this, E, {
      extraNewLine: !0,
      wrapAtWidth: 50,
      blankSpaceWidth: 30,
      mandatoryCharacter: "*"
    });
    N(this, D);
    N(this, H, !1);
    N(this, I);
    N(this, T, !0);
    N(this, _);
    N(this, K, {});
    N(this, B, !1);
    N(this, F, /* @__PURE__ */ new Map());
    N(this, w);
    M(this, S, e.appName || "app"), e.blankSpaceWidth && !isNaN(Number(e.blankSpaceWidth)) && Number(e.blankSpaceWidth) > 20 && (t(this, E).blankSpaceWidth = Number(e.blankSpaceWidth)), e.wrapAtWidth && !isNaN(Number(e.wrapAtWidth)) && Number(e.wrapAtWidth) > 30 && (t(this, E).wrapAtWidth = Number(e.wrapAtWidth)), typeof e.extraNewLine == "boolean" && (t(this, E).extraNewLine = !!e.extraNewLine), typeof e.mandatoryCharacter == "string" && (t(this, E).mandatoryCharacter = e.mandatoryCharacter), typeof e.throwForDuplicateFlags == "boolean" && M(this, H, e.throwForDuplicateFlags), M(this, w, new X(
      {
        throwForDuplicateFlags: t(this, H)
      },
      n || []
    )), M(this, T, e.handleErrors ?? !0), M(this, B, e.inheritParentFlags ?? !1), M(this, I, e.description), M(this, D, e.handler), M(this, k, e.appCommandName);
    const a = {
      name: "help",
      description: "Display this help message and exits",
      mandatory: !1,
      type: Boolean,
      options: ["-h", "--help"],
      defaultValue: void 0,
      allowLigature: !1,
      allowMultiple: !1,
      flagOnly: !0,
      enum: [],
      validate: (l, i) => !0
      // Ensure signature matches Zod schema for .args()
    };
    if (t(this, w).addFlag(a), e.subCommands)
      for (const l of e.subCommands)
        this.addSubCommand(l);
  }
  get flags() {
    return t(this, w).flags;
  }
  get flagNames() {
    return t(this, w).flagNames;
  }
  _addToOutput(e, n, a, l) {
    let i = n;
    if (e.type === Boolean ? typeof n == "boolean" ? i = n : typeof n == "string" ? i = /(true|yes|1)/i.test(n) : i = new e.type(i) : typeof e.type == "function" ? i = e.type(i) : typeof e.type == "object" && (i = new e.type(i)), e.enum && e.enum.length > 0) {
      const o = e.enum.map((c) => typeof c == "string" ? `'${c}'` : c).join(", ");
      if (!e.enum.includes(i))
        throw new R(
          `Invalid value '${i}' for flag '${$.yellow(e.name)}'. Allowed values: ${o}`,
          this.getCommandChain()
        );
    }
    if (e.validate) {
      const o = e.validate(i, a);
      if (o === !1)
        throw new R(
          `Validation failed for flag '${$.yellow(e.name)}' with value '${i}'`,
          this.getCommandChain()
        );
      if (typeof o == "string")
        throw new R(o, this.getCommandChain());
    }
    return e.allowMultiple && !Array.isArray(a[e.name]) && (a[e.name] = []), e.allowMultiple ? a[e.name].push(i) : a[e.name] = i;
  }
  addFlags(e) {
    return t(this, w).addFlags(e), this;
  }
  addFlag(e) {
    return t(this, w).addFlag(e), this;
  }
  addSubCommand(e) {
    if (t(this, F).has(e.name))
      throw new Error(`Sub-command '${e.name}' already exists`);
    const n = e.parser;
    if (!(n instanceof W))
      throw new Error(
        `Parser for subcommand '${e.name}' is not an instance of ArgParser. Please provide 'new ArgParser(...)' for the 'parser' property of an ISubCommand.`
      );
    if (M(n, _, this), M(n, P, e.name), !t(n, k) && t(this, k) && M(n, k, t(this, k)), t(n, B)) {
      const a = t(this, w).flags;
      for (const l of a)
        t(n, w).hasFlag(l.name) || t(n, w)._setProcessedFlagForInheritance(l);
    }
    return t(this, F).set(e.name, e), e.handler && n.setHandler(e.handler), this;
  }
  /**
   * Sets the handler function for this specific parser instance.
   * This handler will be executed if this parser is the final one
   * in the command chain and `executeHandlers` is enabled on the root parser.
   *
   * @param handler - The function to execute.
   * @returns The ArgParser instance for chaining.
   */
  setHandler(e) {
    return M(this, D, e), this;
  }
  printAll(e) {
    if (e)
      try {
        const n = U.dirname(e);
        if (U.existsSync(n) || U.mkdirSync(n, { recursive: !0 }), e.toLowerCase().endsWith(".json")) {
          const a = A(this, y, te).call(this, this), l = JSON.stringify(a, null, 2);
          U.writeFileSync(e, l), console.log(`ArgParser configuration JSON dumped to: ${e}`);
        } else {
          const l = A(this, y, ne).call(this, this, 0).replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
            ""
          );
          U.writeFileSync(e, l), console.log(`ArgParser configuration text dumped to: ${e}`);
        }
      } catch (n) {
        console.error(
          `Error writing ArgParser configuration to file '${e}':`,
          n
        );
      }
    else
      console.log(`
--- ArgParser Configuration Dump ---`), A(this, y, ee).call(this, this, 0), console.log("--- End Configuration Dump ---\\n");
  }
  parse(e, n) {
    if (A(this, y, re).call(this, e, n))
      return {};
    try {
      const {
        finalParser: a,
        commandChain: l,
        parserChain: i
      } = A(this, y, z).call(this, e, this, [], [this]), { finalArgs: o, handlerToExecute: c } = this._parseRecursive(
        e,
        this,
        {},
        [],
        n
      );
      return l.length > 0 && (o.$commandChain = l), A(this, y, ie).call(this, o, i, l), A(this, y, Y).call(this, o, a), A(this, y, le).call(this, c, o, (n == null ? void 0 : n.skipHandlers) ?? !1), o;
    } catch (a) {
      if (a instanceof R) {
        if (t(this, T))
          return A(this, y, ce).call(this, a), {};
        throw a;
      } else
        throw a;
    }
  }
  /**
   * Recursive helper for parsing arguments and handling sub-commands.
   * This method assumes the global help check has already been performed in `parse`.
   */
  _parseRecursive(e, n, a, l, i) {
    var j, p;
    let o = -1, c = null;
    for (let b = 0; b < e.length; b++) {
      const O = e[b];
      if (t(n, F).has(O)) {
        o = b, c = O;
        break;
      }
    }
    const s = o === -1 ? e : e.slice(0, o), { parsedArgs: r, firstUnconsumedIndex: m } = A(j = n, y, G).call(j, s, i);
    A(p = n, y, Y).call(p, r, n);
    const u = {
      ...a,
      ...r
    };
    if (o === -1 || c === null) {
      if (m < s.length) {
        const x = s[m];
        throw new R(
          `Unknown command: '${$.yellow(x)}'`,
          l
        );
      }
      const b = { ...u };
      l.length > 0 && (b.$commandChain = l);
      let O;
      return t(n, D) && (O = {
        handler: t(n, D),
        context: {
          args: r,
          parentArgs: a,
          commandChain: l,
          parser: n
        }
      }), { finalArgs: b, handlerToExecute: O };
    }
    if (m < s.length) {
      const b = s[m];
      throw new R(
        `Unknown command: '${$.yellow(b)}'`,
        l
      );
    }
    const d = t(n, F).get(c);
    if (!d || !(d.parser instanceof W))
      throw new R(
        `Internal error: Subcommand '${c}' is misconfigured or its parser is not a valid ArgParser instance.`,
        l
      );
    const h = d.parser, C = e.slice(o + 1), v = [...l, c], V = {
      ...a,
      ...r
    };
    return this._parseRecursive(
      C,
      h,
      V,
      v,
      i
    );
  }
  helpText() {
    const e = $.cyan, n = $.green, a = $.white, l = $.red, i = $.dim;
    let o = t(this, S), c = this;
    for (; t(c, _); )
      c = t(c, _);
    c && (o = t(c, S));
    const s = t(this, P) ? `${o} ${t(this, P)}` : o;
    let r = `${e(`${s} Help`)} (${t(this, E).mandatoryCharacter} = Mandatory fields):

`;
    t(this, I) && (r += `${a(t(this, I))}

`);
    const m = (d = 1) => "  ".repeat(d);
    t(this, F).size > 0 && (r += `${e("Available sub-commands:")}
`, r += Array.from(t(this, F).entries()).sort(([d], [h]) => d.localeCompare(h)).map(([d, h]) => {
      const C = h.parser;
      if (!(C instanceof W))
        return `${m()}${n(d.padEnd(20))} [Error: Subcommand '${d}' has an invalid parser configuration]`;
      let v = `${m()}${n(d.padEnd(20))} ${a(t(C, I) || "")}`;
      const j = ((C && t(C, w) ? t(C, w).flags : void 0) || []).filter(
        (b) => b.name !== "help"
      );
      j.length > 0 ? (v += `
${m(2)}${i("Flags:")}`, j.sort(
        (b, O) => b.name.localeCompare(O.name)
      ).forEach((b) => {
        const O = b.options.map((J) => n(J)).join(", "), x = Array.isArray(b.description) ? b.description[0] : b.description;
        v += `
${m(3)}${O} - ${i(x)}`;
      })) : v += `
${m(2)}${i("Flags:")} none`;
      const p = Array.from(
        t(C, F).keys()
      );
      return p.length > 0 ? v += `
${m(2)}${i("Sub-commands:")} ${p.join(", ")}` : v += `
${m(2)}${i("Sub-commands:")} none`, v;
    }).join(`

`), r += `
`), r += `
${e("Flags:")}
`;
    const u = t(this, w).flags;
    return u.length > 0 ? r += u.sort((d, h) => d.name.localeCompare(h.name)).map((d) => {
      const h = d.options.toSorted((x, J) => x.length - J.length).map((x) => n(x)).join(", "), C = typeof d.mandatory == "function" ? "dynamic" : d.mandatory, v = C === !0 ? ` ${l(t(this, E).mandatoryCharacter)}` : C === "dynamic" ? ` ${i("(conditionally mandatory)")}` : "", V = Array.isArray(d.description) ? d.description : [d.description], j = [];
      let p = "unknown";
      typeof d.type == "function" ? (p = d.type.name || "custom function", p === "Boolean" && (p = "boolean"), p === "String" && (p = "string"), p === "Number" && (p = "number"), p === "Array" && (p = "array"), p === "Object" && (p = "object")) : typeof d.type == "string" && (p = d.type), j.push(`Type: ${p}`), d.flagOnly && j.push("Flag only (no value expected)"), d.defaultValue !== void 0 && d.defaultValue !== null && j.push(`Default: ${JSON.stringify(d.defaultValue)}`), d.enum && d.enum.length > 0 && j.push(
        `Allowed values: ${d.enum.map((x) => `'${x}'`).join(", ")}`
      );
      const b = Math.max(
        ...u.map(
          (x) => x.options.join(", ").length
        ),
        0
      ), O = h.padEnd(b + 5) + v;
      return `
${m()}${O}
${m(2)}${a(V[0])}
${j.map((x) => `${m(3)}${i(x)}`).join(`
`)}
${V.slice(1).map((x) => `
${m(2)}${a(x)}`).join("")}
  `.trim();
    }).join(`

`) : r += `${m()}${i("none")}`, r;
  }
  getSubCommand(e) {
    return t(this, F).get(e);
  }
  hasFlag(e) {
    return t(this, w).hasFlag(e);
  }
  getCommandChain() {
    const e = [];
    let n = this;
    for (; n && t(n, _); )
      e.unshift(t(n, P)), n = t(n, _);
    return e;
  }
  getLastParseResult() {
    return t(this, K);
  }
};
S = new WeakMap(), k = new WeakMap(), P = new WeakMap(), E = new WeakMap(), D = new WeakMap(), H = new WeakMap(), I = new WeakMap(), T = new WeakMap(), _ = new WeakMap(), K = new WeakMap(), B = new WeakMap(), F = new WeakMap(), w = new WeakMap(), y = new WeakSet(), z = function(e, n, a, l) {
  let i = -1, o = null;
  for (let d = 0; d < e.length; d++) {
    const h = e[d];
    if (t(n, F).has(h)) {
      i = d, o = h;
      break;
    }
  }
  if (i === -1 || o === null)
    return {
      finalParser: n,
      commandChain: a,
      parserChain: l,
      remainingArgs: e
    };
  const c = t(n, F).get(o);
  if (!c || !(c.parser instanceof W))
    throw new Error(
      `Internal error: Subcommand '${o}' configuration is invalid or parser is missing.`
    );
  const s = c.parser, r = e.slice(i + 1), m = [...a, o], u = [...l, s];
  return A(this, y, z).call(this, r, s, m, u);
}, re = function(e, n) {
  var o, c, s, r;
  if (e.length === 0 && !t(this, _) && !t(this, D))
    return console.log(this.helpText()), typeof process == "object" && typeof process.exit == "function" && process.exit(0), !0;
  if (e.includes("--LIB-debug-print"))
    return this.printAll("ArgParser.full.json"), typeof process == "object" && typeof process.exit == "function" && process.exit(0), !0;
  const { finalParser: a } = A(this, y, z).call(this, e, this, [], [this]);
  if (e.includes("--LIB-debug")) {
    console.log(
      $.yellow.bold(`
--- ArgParser --LIB-debug Runtime Context ---`)
    );
    const {
      commandChain: m,
      parserChain: u
    } = A(this, y, z).call(this, e, this, [], [this]);
    console.log(
      `Identified Command Chain: ${$.cyan(m.join(" -> ") || "(root)")}`
    ), console.log(
      `Identified Final Parser: ${$.cyan(t(a, P) || t(a, S))}`
    );
    let d = this, h = [...e], C = {};
    const v = [], V = h.findIndex(
      (p) => t(d, F).has(p)
    ), j = V === -1 ? h : h.slice(0, V);
    v.push({ level: "(root)", argsSlice: j });
    try {
      const { parsedArgs: p } = A(o = d, y, G).call(o, j, { skipHelpHandling: !0 });
      v[0].parsed = p, C = { ...C, ...p };
    } catch (p) {
      v[0].error = p.message;
    }
    h = V === -1 ? [] : h.slice(V);
    for (let p = 0; p < m.length; p++) {
      const b = m[p];
      if (!t(d, F).has(b)) {
        v.push({
          level: "Error",
          argsSlice: [],
          error: `Could not find sub-command parser for '${b}'`
        });
        break;
      }
      d = (c = t(d, F).get(b)) == null ? void 0 : c.parser, h = h.slice(1);
      const O = h.findIndex(
        (q) => t(d, F).has(q)
      ), x = O === -1 ? h : h.slice(0, O), J = {
        level: b,
        argsSlice: x
      };
      v.push(J);
      try {
        const { parsedArgs: q } = A(s = d, y, G).call(s, x, {
          skipHelpHandling: !0
        });
        J.parsed = q, C = { ...C, ...q };
      } catch (q) {
        J.error = q.message;
      }
      h = O === -1 ? [] : h.slice(O);
    }
    return console.log($.yellow(`
Parsing Simulation Steps:`)), v.forEach((p) => {
      console.log(`  Level: ${$.cyan(p.level)}`), console.log(
        `    Args Slice Considered: ${JSON.stringify(p.argsSlice)}`
      ), p.parsed && console.log(
        `    Parsed Args at this Level: ${JSON.stringify(p.parsed)}`
      ), p.error && console.log(
        `    ${$.red("Error during parse simulation:")} ${p.error}`
      );
    }), console.log(
      $.yellow(
        `
Final Accumulated Args State (before final validation):`
      )
    ), console.log(JSON.stringify(C, null, 2)), console.log($.yellow(`
Arguments Remaining After Simulation:`)), console.log(JSON.stringify(h, null, 2)), console.log(
      $.yellow.bold(
        `
--- ArgParser Static Configuration (Final Parser) ---`
      )
    ), a.printAll(), console.log($.yellow.bold("--- End ArgParser --LIB-debug ---")), typeof process == "object" && typeof process.exit == "function" && process.exit(0), !0;
  }
  let l = "undefined_parser";
  if (a instanceof W ? l = a["#subCommandName"] || a["#appName"] : a && (l = a.name || a.appName || "unknown_type"), !(a instanceof W))
    return console.error(
      `[ArgParser #_handleGlobalChecks Critical Error] identifiedFinalParser is not an instance of ArgParser. Cannot process help. Name: ${l}, Constructor: ${a ? (r = a.constructor) == null ? void 0 : r.name : "undefined"}`
    ), !1;
  const i = t(a, w).getFlag("help");
  if (i && !(n != null && n.skipHelpHandling)) {
    const m = i.options;
    if (e.some(
      (d) => m.includes(d)
    ))
      return console.log(a.helpText()), typeof process == "object" && typeof process.exit == "function" && process.exit(0), !0;
  }
  return !1;
}, ie = function(e, n, a) {
  const l = [], i = /* @__PURE__ */ new Set();
  for (const o of n) {
    const c = o.getCommandChain();
    for (const s of t(o, w).flags) {
      if (s.name === "help" || i.has(s.name) || !(typeof s.mandatory == "function" ? s.mandatory(e) : s.mandatory)) continue;
      const m = e[s.name];
      let u = !1;
      s.allowMultiple ? (m === void 0 || Array.isArray(m) && m.length === 0) && (u = !0) : m === void 0 && (u = !0), u && (i.has(s.name) || (l.push({
        name: s.name,
        parserName: t(o, P) || t(o, S),
        commandChain: c
      }), i.add(s.name)));
    }
  }
  if (l.length > 0)
    throw new R(
      `Missing mandatory flags: ${l.map((o) => $.yellow(o.name)).join(", ")}`,
      a
    );
}, Y = function(e, n) {
  for (const a of t(n, w).flags) {
    const l = a.name;
    e[l] === void 0 && a.defaultValue !== void 0 && (a.allowMultiple ? e[l] = Array.isArray(a.defaultValue) ? a.defaultValue : [a.defaultValue] : e[l] = a.defaultValue);
  }
}, le = function(e, n, a) {
  if (a || !e)
    return;
  const l = e.context.parser, i = t(l, w).flags, o = e.context.args;
  for (const c of i) {
    const s = c.name;
    n.hasOwnProperty(s) ? o[s] = n[s] : c.allowMultiple && !o.hasOwnProperty(s) && (o[s] = []);
  }
  e.context.args = o, e.handler(e.context);
}, G = function(e, n) {
  var c, s;
  const a = t(this, w).flags, l = Object.fromEntries(
    a.map((r) => [
      r.name,
      r.allowMultiple ? [] : void 0
    ])
  );
  let i = /* @__PURE__ */ new Set();
  for (const r of a)
    if (r.allowLigature && !r.flagOnly) {
      const m = de(
        ue(
          ...r.options.map((u) => `${u}=`)
        ),
        me(fe).groupedAs("arg")
      );
      for (let u = 0; u < e.length; u++) {
        if (i.has(u)) continue;
        const d = e[u], h = m.exec(`${d}`);
        if ((c = h == null ? void 0 : h.groups) != null && c.arg && (this._addToOutput(
          r,
          (s = h == null ? void 0 : h.groups) == null ? void 0 : s.arg,
          l,
          n
        ), i.add(u), !r.allowMultiple))
          break;
      }
    }
  for (const r of a)
    for (let m = 0; m < e.length; m++) {
      if (i.has(m)) continue;
      const u = e[m], d = m + 1, h = d < e.length, C = h ? e[d] : void 0, v = typeof C == "string" && C.startsWith("-");
      if (r.options.includes(u) && (i.add(m), r.flagOnly ? this._addToOutput(r, !0, l, n) : h && !v ? (this._addToOutput(r, C, l, n), i.add(d)) : r.type === Boolean && this._addToOutput(r, !0, l, n), !r.allowMultiple))
        break;
    }
  let o = e.length;
  for (let r = 0; r < e.length; r++)
    if (!i.has(r)) {
      o = r;
      break;
    }
  return { parsedArgs: l, firstUnconsumedIndex: o };
}, ce = function(e) {
  let n = "your-script";
  if (t(this, k))
    n = t(this, k);
  else if (t(this, S) && t(this, S) !== "Argument Parser")
    n = t(this, S);
  else if (typeof process < "u" && process.argv && process.argv[1])
    try {
      n = U.basename(process.argv[1]);
    } catch {
    }
  const a = [
    n,
    ...e.commandChain || []
  ].join(" ");
  if (console.error(`
${$.red.bold("Error:")} ${e.message}`), console.error(
    `
${$.dim(`Try '${a} --help' for usage details.`)}`
  ), typeof process == "object" && typeof process.exit == "function")
    process.exit(1);
  else
    throw e;
}, ee = function(e, n, a = /* @__PURE__ */ new Set()) {
  const l = "  ".repeat(n), i = "  ".repeat(n + 1), o = "  ".repeat(n + 2);
  console.log(
    `${l}Parser: ${$.blueBright(t(e, P) || t(e, S))}`
  ), t(e, I) && console.log(`${i}Description: ${t(e, I)}`), console.log(`${i}Options:`), console.log(`${o}appName: ${t(e, S)}`), console.log(
    `${o}appCommandName: ${t(e, k) ?? $.dim("undefined")}`
  ), console.log(`${o}handleErrors: ${t(e, T)}`), console.log(
    `${o}throwForDuplicateFlags: ${t(e, H)}`
  ), console.log(
    `${o}inheritParentFlags: ${t(e, B)}`
  ), console.log(`${o}Handler Defined: ${!!t(e, D)}`), console.log(
    `${i}Internal Params: ${JSON.stringify(t(e, E))}`
  );
  const c = t(e, w).flags;
  c.length > 0 ? (console.log(`${i}Flags (${c.length}):`), c.forEach((r) => {
    console.log(`${o}* ${$.green(r.name)}:`), console.log(`${o}  Options: ${r.options.join(", ")}`), console.log(
      `${o}  Description: ${Array.isArray(r.description) ? r.description.join(" | ") : r.description}`
    ), console.log(
      `${o}  Type: ${typeof r.type == "function" ? r.type.name || "custom function" : r.type}`
    ), console.log(
      `${o}  Mandatory: ${typeof r.mandatory == "function" ? "dynamic" : r.mandatory ?? !1}`
    ), console.log(
      `${o}  Default: ${JSON.stringify(r.defaultValue)}`
    ), console.log(`${o}  Flag Only: ${r.flagOnly}`), console.log(`${o}  Allow Multiple: ${r.allowMultiple}`), console.log(`${o}  Allow Ligature: ${r.allowLigature}`), console.log(
      `${o}  Enum: ${r.enum && r.enum.length > 0 ? r.enum.join(", ") : "none"}`
    ), console.log(`${o}  Validator Defined: ${!!r.validate}`);
  })) : console.log(`${i}Flags: ${$.dim("none")}`);
  const s = Array.from(t(e, F).values());
  s.length > 0 ? (console.log(`${i}Sub-Commands (${s.length}):`), s.forEach((r) => {
    A(this, y, ee).call(this, r.parser, n + 1, a);
  })) : console.log(`${i}Sub-Commands: ${$.dim("none")}`);
}, ne = function(e, n, a = /* @__PURE__ */ new Set()) {
  if (a.has(e)) return "";
  a.add(e);
  let l = "";
  const i = "  ".repeat(n), o = "  ".repeat(n + 1), c = "  ".repeat(n + 2), s = (u) => {
    l += u + "\\n";
  };
  s(
    `${i}Parser: ${t(e, P) || t(e, S)}`
    // #appName is guaranteed
  ), t(e, I) && s(`${o}Description: ${t(e, I)}`), s(`${o}Options:`), s(`${c}appName: ${t(e, S)}`), s(
    `${c}appCommandName: ${t(e, k) ?? "undefined"}`
  ), s(`${c}handleErrors: ${t(e, T)}`), s(
    `${c}throwForDuplicateFlags: ${t(e, H)}`
  ), s(`${c}inheritParentFlags: ${t(e, B)}`), s(`${c}Handler Defined: ${!!t(e, D)}`), s(
    `${o}Internal Params: ${JSON.stringify(t(e, E))}`
  );
  const r = t(e, w).flags;
  r.length > 0 ? (s(`${o}Flags (${r.length}):`), r.forEach((u) => {
    var h;
    s(`${c}* ${u.name}:`), s(`${c}  Options: ${u.options.join(", ")}`), s(
      `${c}  Description: ${Array.isArray(u.description) ? u.description.join(" | ") : u.description}`
    );
    let d = "unknown";
    if (typeof u.type == "function")
      d = u.type.name || "custom function";
    else if (typeof u.type == "string")
      d = u.type;
    else if (typeof u.type == "object" && u.type)
      try {
        d = ((h = u.type.constructor) == null ? void 0 : h.name) || "object";
      } catch {
        d = "object";
      }
    s(`${c}  Type: ${d}`), s(
      `${c}  Mandatory: ${typeof u.mandatory == "function" ? "dynamic" : u.mandatory ?? !1}`
    ), s(
      `${c}  Default: ${JSON.stringify(u.defaultValue)}`
    ), s(`${c}  Flag Only: ${u.flagOnly}`), s(`${c}  Allow Multiple: ${u.allowMultiple}`), s(`${c}  Allow Ligature: ${u.allowLigature}`), s(
      `${c}  Enum: ${u.enum && u.enum.length > 0 ? u.enum.join(", ") : "none"}`
    ), s(`${c}  Validator Defined: ${!!u.validate}`);
  })) : s(`${o}Flags: none`);
  const m = Array.from(t(e, F).values());
  return m.length > 0 ? (s(`${o}Sub-Commands (${m.length}):`), m.forEach((u) => {
    l += A(this, y, ne).call(this, u.parser, n + 1, a);
  })) : s(`${o}Sub-Commands: none`), l;
}, te = function(e, n = /* @__PURE__ */ new Set()) {
  if (n.has(e))
    return {
      note: `Reference to already processed parser: ${t(e, P) || t(e, S)}`
    };
  n.add(e);
  const a = {
    parserName: t(e, P) || t(e, S),
    // #appName is guaranteed
    description: t(e, I),
    options: {
      appName: t(e, S),
      appCommandName: t(e, k) ?? void 0,
      handleErrors: t(e, T),
      throwForDuplicateFlags: t(e, H),
      inheritParentFlags: t(e, B)
    },
    handlerDefined: !!t(e, D),
    internalParams: t(e, E),
    flags: [],
    subCommands: {}
    // Will be an object where keys are sub-command names
  }, l = t(e, w).flags;
  a.flags = l.map((o) => {
    var s;
    let c = "unknown";
    if (typeof o.type == "function")
      c = o.type.name || "custom function";
    else if (typeof o.type == "string")
      c = o.type;
    else if (typeof o.type == "object" && o.type)
      try {
        c = ((s = o.type.constructor) == null ? void 0 : s.name) || "object";
      } catch {
        c = "object";
      }
    return {
      name: o.name,
      options: o.options,
      description: o.description,
      type: c,
      mandatory: typeof o.mandatory == "function" ? "dynamic" : o.mandatory ?? !1,
      defaultValue: o.defaultValue,
      flagOnly: o.flagOnly,
      allowMultiple: o.allowMultiple,
      allowLigature: o.allowLigature,
      enum: o.enum,
      validatorDefined: !!o.validate
    };
  });
  const i = Array.from(t(e, F).values());
  return i.length > 0 && i.forEach((o) => {
    a.subCommands[o.name] = A(this, y, te).call(this, o.parser, n);
  }), a;
};
let se = W;
export {
  se as ArgParser,
  R as ArgParserError
};
//# sourceMappingURL=index.min.mjs.map
