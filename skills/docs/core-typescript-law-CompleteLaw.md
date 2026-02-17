# TYPESCRIPT LAW 2026

## The Complete Runtime and Type System Specification

**First Edition**

*by BlobMaster*

*"Everything that doesn't follow this law is shit code, broken, exploitable."*

---

# TABLE OF CONTENTS

## [CHAPTER 1: TYPE SYSTEM ABSOLUTES](#chapter-1-type-system-absolutes)
- [1.1 Forbidden Constructs](#11-forbidden-constructs)
- [1.2 Numeric Types](#12-numeric-types)
- [1.3 Enum Architecture](#13-enum-architecture)
- [1.4 Interface Law](#14-interface-law)
- [1.5 Type Alias Law](#15-type-alias-law)
- [1.6 Class Law](#16-class-law)
- [1.7 Generic Law](#17-generic-law)
- [1.8 Branded Types](#18-branded-types)
- [1.9 Utility Types](#19-utility-types)
- [1.10 Strict Mode Requirements](#110-strict-mode-requirements)
- [1.11 Const Assertions and Immutability](#111-const-assertions-and-immutability)

## [CHAPTER 2: RUNTIME SAFETY](#chapter-2-runtime-safety)
- [2.1 Reflect API](#21-reflect-api)
- [2.2 Object Security](#22-object-security)
- [2.3 Proxy Pattern](#23-proxy-pattern)
- [2.4 Defensive Programming](#24-defensive-programming)

## [CHAPTER 3: MEMORY MANAGEMENT](#chapter-3-memory-management)
- [3.1 Allocation Principles](#31-allocation-principles)
- [3.2 Weak References](#32-weak-references)
- [3.3 Buffer Management](#33-buffer-management)
- [3.4 Garbage Collection Optimization](#34-garbage-collection-optimization)

## [CHAPTER 4: CONCURRENCY](#chapter-4-concurrency)
- [4.1 Promise Patterns](#41-promise-patterns)
- [4.2 Atomics](#42-atomics)
- [4.3 Workers](#43-workers)
- [4.4 SharedArrayBuffer](#44-sharedarraybuffer)

## [CHAPTER 5: V8 OPTIMIZATION](#chapter-5-v8-optimization)
- [5.1 Hidden Classes](#51-hidden-classes)
- [5.2 Inline Caching](#52-inline-caching)
- [5.3 Function Optimization](#53-function-optimization)
- [5.4 Loop Optimization](#54-loop-optimization)
- [5.5 Numeric Optimization](#55-numeric-optimization)
- [5.6 Deoptimization Triggers](#56-deoptimization-triggers)

## [CHAPTER 6: RESOURCE MANAGEMENT](#chapter-6-resource-management)
- [6.1 Disposable Pattern](#61-disposable-pattern)
- [6.2 Error Handling](#62-error-handling)
- [6.3 Result Types](#63-result-types)

## [CHAPTER 7: SYMBOLS AND PROTOCOLS](#chapter-7-symbols-and-protocols)
- [7.1 Well-Known Symbols](#71-well-known-symbols)
- [7.2 Custom Symbols](#72-custom-symbols)

## [CHAPTER 8: ITERATION](#chapter-8-iteration)
- [8.1 Iterator Protocol](#81-iterator-protocol)
- [8.2 Iterator Helpers](#82-iterator-helpers)
- [8.3 Async Iteration](#83-async-iteration)

## [CHAPTER 9: BINARY DATA](#chapter-9-binary-data)
- [9.1 ArrayBuffer Architecture](#91-arraybuffer-architecture)
- [9.2 TypedArray Selection](#92-typedarray-selection)
- [9.3 DataView Usage](#93-dataview-usage)
- [9.4 Bitwise Operations](#94-bitwise-operations)

## [CHAPTER 10: MODERN APIs](#chapter-10-modern-apis)
- [10.1 Array Methods](#101-array-methods)
- [10.2 Object Methods](#102-object-methods)
- [10.3 String Methods](#103-string-methods)
- [10.4 RegExp Enhancements](#104-regexp-enhancements)
- [10.5 Cryptography](#105-cryptography)

## [CHAPTER 11: DOCUMENTATION](#chapter-11-documentation)
- [11.1 TSDoc Standard](#111-tsdoc-standard)

## [CHAPTER 12: MODULE ARCHITECTURE](#chapter-12-module-architecture)
- [12.1 ESM Requirements](#121-esm-requirements)
- [12.2 Global Augmentation](#122-global-augmentation)

## [CHAPTER 13: CODE QUALITY](#chapter-13-code-quality)
- [13.1 Optimization Path](#131-optimization-path)
- [13.2 Code Hygiene](#132-code-hygiene)
- [13.3 Naming](#133-naming)
- [13.4 Function Design](#134-function-design)
- [13.5 Error Messages](#135-error-messages)

## [CHAPTER 14: SECURITY](#chapter-14-security)
- [14.1 Input Validation](#141-input-validation)
- [14.2 Cryptographic Safety](#142-cryptographic-safety)
- [14.3 Resource Limits](#143-resource-limits)
- [14.4 State Integrity](#144-state-integrity)

## [APPENDIX A: COMPILER CONFIGURATION](#appendix-a-compiler-configuration)

## [APPENDIX B: QUICK REFERENCE](#appendix-b-quick-reference)

---

# CHAPTER 1: TYPE SYSTEM ABSOLUTES

## 1.1 Forbidden Constructs

### 1.1.1 The Any Prohibition

The `any` type is absolutely forbidden in all circumstances. There are no exceptions. There are no edge cases. There is no "just this once." The `any` type disables TypeScript's type checker for that value and all values derived from it. It propagates through the codebase like a virus, infecting every value it touches with type unsafety.

The `any` type effectively turns off type-checking. When you use `any`, TypeScript allows any operation on that value without checking if those operations are valid. This defeats the entire purpose of using TypeScript.

If a type is complex, model it properly with generics, conditional types, mapped types, or union types. If an external library has poor types, create proper type definitions or use declaration files. If you are reaching for `any`, your type design is broken and must be reconsidered.

Every `any` in production code will eventually cause a runtime error that TypeScript was designed to prevent. The `any` type is a runtime bug waiting to happen.

```typescript
// FORBIDDEN - NEVER DO THIS
function bad(data: any): any {
    return data.something.that.might.not.exist;
}

// CORRECT - Model the type properly
interface Data {
    readonly something: {
        readonly that: {
            readonly might: {
                readonly exist: string;
            };
        };
    };
}

function good(data: Data): string {
    return data.something.that.might.exist;
}
```

### 1.1.2 The Unknown Requirement at Boundaries

The `unknown` type is mandatory at trust boundaries where external data enters the system. It is forbidden as a lazy escape hatch within application logic where you could model the actual type.

When external data enters your system, you genuinely do not know its shape. Using `unknown` forces narrowing through validation before the type system permits operations. This is correct behavior, not a workaround.

**Required uses of `unknown`:**
- JSON.parse results
- Network response bodies
- User input
- Deserialized storage
- FFI boundaries
- Plugin/extension interfaces

**Forbidden uses of `unknown`:**
- Function parameters you control
- Return types you define
- Internal module interfaces
- Anywhere you could model the actual type but chose not to

Application code must never expose `unknown` in its internal interfaces. All public APIs must have fully specified types. The `unknown` at boundaries must be immediately validated and narrowed.

```typescript
// REQUIRED: unknown at trust boundary with immediate narrowing
function parseExternalData(json: string): ValidatedData {
    const raw: unknown = JSON.parse(json);
    if (!isValidData(raw)) {
        throw new ValidationError('Invalid data structure');
    }
    return raw;
}

// FORBIDDEN: unknown as laziness
function processBad(data: unknown): unknown {
    // You control both sides, model the types
}

// CORRECT: model the actual type
function processGood(data: TransactionInput): TransactionOutput {
    // Fully typed interface
}
```

### 1.1.3 The Object Type Prohibition

The `object` type (lowercase) is forbidden. It represents any non-primitive value but provides no information about the shape of that value. It is nearly as useless as `any` for type safety purposes.

You cannot access any properties on `object` typed values without type assertions. This forces you into unsafe patterns.

```typescript
// FORBIDDEN
function bad(obj: object): void {
    obj.property; // Error: Property 'property' does not exist on type 'object'
}

// CORRECT - Use specific interface
interface MyObject {
    readonly property: string;
}

function good(obj: MyObject): void {
    obj.property; // Safe access
}

// CORRECT - Use Record for dictionaries
function alsogood(obj: Readonly<Record<string, string>>): void {
    const value = obj['key']; // Type is string | undefined with noUncheckedIndexedAccess
}
```

### 1.1.4 The Function Type Prohibition

The `Function` type (uppercase) is forbidden. It represents any callable but provides no information about parameters or return type. It is the function equivalent of `any`.

```typescript
// FORBIDDEN
function bad(callback: Function): void {
    callback('wrong', 'number', 'of', 'arguments'); // No error!
}

// CORRECT - Specific function signature
function good(callback: (value: string) => number): void {
    const result = callback('correct'); // Typed as number
}

// CORRECT - Generic callback
function generic<T, R>(callback: (value: T) => R, value: T): R {
    return callback(value);
}
```

### 1.1.5 The Empty Object Prohibition

The `{}` type is forbidden. Contrary to intuition, `{}` does not mean "empty object". It means "any value that is not null or undefined", which includes strings, numbers, booleans, and all objects. This is almost never the intended meaning.

```typescript
// FORBIDDEN - {} accepts primitives!
function bad(obj: {}): void {
    // All of these are valid:
}
bad('string');  // No error!
bad(42);        // No error!
bad(true);      // No error!
bad({});        // No error!

// CORRECT - For truly empty objects
type EmptyObject = Record<string, never>;

function good(obj: EmptyObject): void {
    // Only accepts {}
}

// CORRECT - For any object
function alsoGood(obj: Readonly<Record<string, unknown>>): void {
    // Accepts objects, not primitives
}
```

### 1.1.6 The Implicit Any Prohibition

With `noImplicitAny` enabled (required), TypeScript raises an error whenever it cannot infer a type and would fall back to `any`. This catches accidental `any` introduction.

```typescript
// ERROR with noImplicitAny
function bad(x) { // Parameter 'x' implicitly has an 'any' type
    return x;
}

// CORRECT
function good(x: string): string {
    return x;
}
```

### 1.1.7 The Number Type Limitations

The `number` type for unbounded or external integers is dangerous. JavaScript's `number` has only 53-bit integer precision. Values above `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) silently lose precision.

**Use `bigint` for:**
- Satoshi amounts
- Block heights
- Timestamps in milliseconds
- Database IDs
- File sizes
- Cumulative totals
- Any value from external systems

**Use `number` for:**
- Array lengths
- Loop counters
- Small flags
- Port numbers
- Pixel coordinates
- Any value you control that will stay small

```typescript
// DANGEROUS - number can lose precision for large values
const unsafeBalance: number = 9_007_199_254_740_993;  // Actually stores 9_007_199_254_740_992

// CORRECT - bigint preserves precision
const safeBalance: bigint = 9_007_199_254_740_993n;
```

### 1.1.8 The Floating Point Prohibition for Financial Values

Floating-point math for financial values is forbidden. Floats have representation errors (`0.1 + 0.2 !== 0.3`), rounding issues, and non-associative arithmetic. Use fixed-point `bigint` with explicit scale factors for any precision-critical calculations.

```typescript
// FORBIDDEN - floating point for money
const price = 19.99;
const total = price * 3;  // 59.96999999999999

// CORRECT - integer cents or satoshis
const priceInCents = 1999n;
const total = priceInCents * 3n;  // 5997n exactly
```

### 1.1.9 The Non-Null Assertion Restriction

The non-null assertion operator (`!`) is forbidden. Using `value!` tells the TypeScript compiler to trust that a value is neither `null` nor `undefined`, bypassing the type checker entirely at that point. This is a lie to the compiler when you have not actually verified the value, and it will produce runtime errors that TypeScript was designed to prevent. See section 1.10.3 for additional detail on assertion minimization.

Always use explicit null checks, optional chaining, or narrowing type guards instead of the non-null assertion. If you find yourself reaching for `!`, your code either lacks a proper null check or your types are modeled incorrectly.

```typescript
/**
 * FORBIDDEN - non-null assertion hides potential null/undefined bugs.
 * The compiler trusts you, but the runtime will not.
 */
function forbidden(map: Map<string, number>, key: string): number {
    // If the key is missing, this returns undefined and .toFixed() throws at runtime
    return map.get(key)!.toFixed(2);
}

/**
 * CORRECT - explicit check narrows the type safely.
 * The compiler and the runtime agree on what is possible.
 */
function correct(map: Map<string, number>, key: string): string {
    const value: number | undefined = map.get(key);
    if (value === undefined) {
        throw new Error(`Key "${key}" not found in map`);
    }
    return value.toFixed(2);
}

/**
 * ALSO CORRECT - optional chaining with a fallback.
 */
function alsoCorrect(map: Map<string, number>, key: string): string {
    const value: number | undefined = map.get(key);
    return value?.toFixed(2) ?? 'N/A';
}
```

### 1.1.10 Explicit Type Annotations Required

Every variable declaration and every function return type must have an explicit type annotation. Relying on type inference for public-facing signatures makes the contract implicit and fragile. A refactor inside the function body can silently change its return type, breaking callers without any compiler warning at the definition site. Explicit annotations serve as documentation, enforce contracts, and catch accidental type drift.

Parameter types are already required by `noImplicitAny`, but return types and variable types must also be annotated as a matter of discipline. The only exception is trivially obvious const declarations where the literal type is self-documenting (e.g., `const PORT = 8080 as const`).

```typescript
/**
 * FORBIDDEN - no return type annotation.
 * If the implementation changes, callers silently break.
 */
function forbidden(input: string) {
    return input.length > 0;
}

/**
 * FORBIDDEN - untyped variable. The reader must trace the
 * right-hand side to understand what 'result' holds.
 */
const result = computeSomething();

/**
 * CORRECT - explicit return type locks the contract.
 * Any change to the return value is caught at the definition site.
 */
function correct(input: string): boolean {
    return input.length > 0;
}

/**
 * CORRECT - variable type is explicit and self-documenting.
 */
const result: ComputationOutput = computeSomething();

/**
 * CORRECT - typed arrow function with explicit return.
 */
const transform: (value: string) => number = (value: string): number => {
    return value.length;
};
```

### 1.1.11 Constructor Parameter Properties with Defaults

Prefer TypeScript parameter properties with default values in constructors over manual assignment with fallback logic. The pattern `public constructor(public readonly myValue: string = 'something')` declares the property, assigns it, and provides a default in a single expression. The alternative pattern of accepting a parameter and then assigning it with `||` or `??` is verbose, error-prone (especially with falsy values like `0` or `''`), and scatters property declarations away from the class body.

Parameter properties reduce boilerplate and keep the source of truth in one place. They also guarantee that the property is initialized before any other constructor logic runs.

```typescript
/**
 * FORBIDDEN - manual assignment with fallback.
 * The || operator treats '' and 0 as falsy, causing silent bugs.
 * The property declaration is separated from the assignment.
 */
class ForbiddenService {
    public readonly endpoint: string;
    public readonly timeout: number;

    public constructor(endpoint: string, timeout: number) {
        this.endpoint = endpoint || 'https://default.api.com';
        this.timeout = timeout || 30000;
    }
}

/**
 * CORRECT - parameter properties with defaults.
 * Single source of truth. No falsy-value bugs.
 * Property declaration and initialization in one expression.
 */
class CorrectService {
    public constructor(
        public readonly endpoint: string = 'https://default.api.com',
        public readonly timeout: number = 30000,
    ) {}
}
```

### 1.1.12 Classes over Loose Functions

Prefer classes, static classes, and singletons over loose functional components for readability and discoverability. A class groups related behavior under a single namespace, provides IDE autocomplete on the instance, and communicates intent through access modifiers and constructor contracts. Scattered functions in a module force the reader to mentally reconstruct the relationships between data and behavior.

This does not mean every utility must be a class. Pure transformation functions that take input and return output with no state are fine as standalone exports. But when functions share state, configuration, or lifecycle, they belong in a class.

```typescript
/**
 * FORBIDDEN - scattered functions sharing implicit state.
 * The reader must trace module-level variables to understand data flow.
 */
let connection: Connection | null = null;

function connect(url: string): void {
    connection = new Connection(url);
}

function query(sql: string): ResultSet {
    if (!connection) throw new Error('Not connected');
    return connection.execute(sql);
}

function disconnect(): void {
    connection?.close();
    connection = null;
}

/**
 * CORRECT - class encapsulates state and behavior.
 * All operations are discoverable via autocomplete on the instance.
 */
class DatabaseClient {
    #connection: Connection | null = null;

    public connect(url: string): void {
        this.#connection = new Connection(url);
    }

    public query(sql: string): ResultSet {
        if (!this.#connection) {
            throw new Error('DatabaseClient is not connected');
        }
        return this.#connection.execute(sql);
    }

    public disconnect(): void {
        this.#connection?.close();
        this.#connection = null;
    }
}

/**
 * CORRECT - static class for stateless utilities.
 * Groups related functions under a discoverable namespace.
 */
class MathUtils {
    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
}
```

### 1.1.13 Explicit Access Modifiers Required

Every class member must have an explicit access modifier: `public`, `protected`, or `private`. Omitting the modifier defaults to `public`, but this default is implicit and ambiguous to the reader. Private members must use the native `#` syntax for true runtime encapsulation. The TypeScript `private` keyword is only acceptable when `#` is technically impossible (e.g., declaration files, certain decorator patterns, or abstract members in legacy codebases).

Explicit modifiers communicate intent and enforce encapsulation boundaries. A class without modifiers is a class where every member looks public, even if the author intended some to be internal.

```typescript
/**
 * FORBIDDEN - missing access modifiers and using TypeScript 'private'.
 * No explicit intent. TypeScript 'private' is compile-time only.
 */
class ForbiddenLogger {
    logLevel: string = 'info';
    private buffer: string[] = [];

    log(message: string): void {
        this.buffer.push(message);
    }

    flush(): void {
        this.buffer = [];
    }
}

/**
 * CORRECT - explicit modifiers and native # for privacy.
 * Intent is clear. Runtime encapsulation is enforced.
 */
class CorrectLogger {
    #buffer: string[] = [];

    public readonly logLevel: string;

    public constructor(logLevel: string = 'info') {
        this.logLevel = logLevel;
    }

    public log(message: string): void {
        this.#buffer.push(message);
    }

    public flush(): void {
        this.#buffer = [];
    }

    protected formatMessage(message: string): string {
        return `[${this.logLevel.toUpperCase()}] ${message}`;
    }
}
```

### 1.1.14 Named Interfaces over Inline Type Literals

All object shapes used in variable declarations, function parameters, or return types must be defined as named interfaces and exported when consumed outside the module. Inline type literals (writing the shape directly in the variable declaration) are forbidden. They are impossible to reuse, impossible to import, impossible to document with TSDoc, and impossible to extend. They also clutter the code and make diffs harder to review.

When a type includes a fixed set of string values, use a const object with a derived type instead of a raw union of string literals. This pattern provides a runtime-accessible mapping, IDE autocomplete on the object keys, and a single source of truth for the allowed values.

```typescript
/**
 * FORBIDDEN - inline type literal on the variable.
 * Cannot be reused, imported, or documented.
 */
const config: {
    url?: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Readonly<Record<string, string>>;
    body: string | null;
    requestsPerWorker: number;
    concurrencyPerWorker: number;
    timeoutMs: number;
    workerCount: number;
} = {
    method: 'GET',
    headers: {},
    body: null,
    requestsPerWorker: 1000,
    concurrencyPerWorker: 10,
    timeoutMs: 30000,
    workerCount: 4,
};

/**
 * CORRECT - named const object for the method enum,
 * named interface for the config shape.
 * Both are reusable, importable, and documentable.
 */
const HttpMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
} as const;

type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

/** Configuration for the HTTP load testing worker pool. */
export interface LoadTestConfig {
    readonly url?: string;
    readonly method: HttpMethod;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string | null;
    readonly requestsPerWorker: number;
    readonly concurrencyPerWorker: number;
    readonly timeoutMs: number;
    readonly workerCount: number;
}

const config: LoadTestConfig = {
    method: HttpMethod.GET,
    headers: {},
    body: null,
    requestsPerWorker: 1000,
    concurrencyPerWorker: 10,
    timeoutMs: 30000,
    workerCount: 4,
};
```

### 1.1.15 Dead Code, Duplicated Code, and ESLint Bypasses Are Bugs

If your code contains dead code, duplicated logic, unused methods, or ESLint bypass comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error` without a paired test), your design is broken. These are not minor style issues; they are symptoms of architectural failure. Dead code increases attack surface and maintenance burden. Duplicated code means shared logic was not extracted. ESLint bypasses mean the rules caught a real problem that was silenced instead of fixed.

The only acceptable escape hatch annotation is `@ts-expect-error` in a test file that verifies the compiler rejects invalid usage. Every other suppression must be replaced by fixing the underlying type or logic error.

```typescript
/**
 * FORBIDDEN - dead code, duplication, and suppression.
 */
class ForbiddenProcessor {
    // Dead method - nothing calls this
    public legacyProcess(data: string): string {
        return data.trim();
    }

    // Duplicated logic in two places
    public processA(input: string): string {
        const trimmed: string = input.trim().toLowerCase();
        return trimmed.replace(/\s+/g, '-');
    }

    public processB(input: string): string {
        const trimmed: string = input.trim().toLowerCase();
        return trimmed.replace(/\s+/g, '-');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public hack(data: any): void { /* ... */ }
}

/**
 * CORRECT - no dead code, shared logic extracted, no suppressions.
 */
class CorrectProcessor {
    public slugify(input: string): string {
        return input.trim().toLowerCase().replace(/\s+/g, '-');
    }

    public process(data: ValidatedInput): ProcessedOutput {
        return { slug: this.slugify(data.title), timestamp: BigInt(Date.now()) };
    }
}
```

### 1.1.16 File and Class Size Limits

A single class must not exceed a few hundred lines. A single file must not exceed a reasonable size with clean code separation. If your class is 3000 lines long, your design is broken. Massive classes violate the single responsibility principle, are impossible to test in isolation, and become merge-conflict magnets in team environments.

When a class grows too large, decompose it into smaller classes that each own a single concern. Use composition to assemble the pieces. The resulting code is easier to test, easier to understand, and easier to modify without unintended side effects.

```typescript
/**
 * FORBIDDEN - monolithic class doing everything.
 * Impossible to test, review, or maintain.
 */
class ForbiddenMegaClass {
    // ... 500 lines of network logic ...
    // ... 500 lines of parsing logic ...
    // ... 500 lines of caching logic ...
    // ... 500 lines of validation logic ...
    // ... 500 lines of serialization logic ...
    // ... 500 lines of business logic ...
}

/**
 * CORRECT - decomposed into focused classes.
 * Each class is testable, reviewable, and maintainable.
 */
class NetworkClient {
    /* ~100-200 lines of network concerns */
}

class MessageParser {
    /* ~100-200 lines of parsing concerns */
}

class ResponseCache {
    /* ~100-200 lines of caching concerns */
}

class InputValidator {
    /* ~100-200 lines of validation concerns */
}

/** Composes the smaller classes into the full service. */
class ApplicationService {
    readonly #network: NetworkClient;
    readonly #parser: MessageParser;
    readonly #cache: ResponseCache;
    readonly #validator: InputValidator;

    public constructor(
        network: NetworkClient,
        parser: MessageParser,
        cache: ResponseCache,
        validator: InputValidator,
    ) {
        this.#network = network;
        this.#parser = parser;
        this.#cache = cache;
        this.#validator = validator;
    }
}
```

### 1.1.17 Top-Level Await over Promise Chains

Use top-level `await` with `try`/`catch` instead of `.then()` / `.catch()` chains. The `async`/`await` syntax is linear, readable, and produces meaningful stack traces. Promise chains with `.then` and `.catch` create nested callbacks, lose context on errors, and obscure the control flow. Top-level `await` is supported in ESM modules and is the preferred entry point pattern.

```typescript
/**
 * FORBIDDEN - .then/.catch chains at the entry point.
 * Stack traces are useless. Control flow is nested.
 */
TestApplication.main().catch((caughtError: unknown): void => {
    console.error('Fatal error:', caughtError);
    process.exit(1);
});

/**
 * CORRECT - top-level await with try/catch.
 * Linear flow. Meaningful stack traces.
 */
try {
    await TestApplication.main();
} catch (caughtError: unknown) {
    console.error('Fatal error:', caughtError);
    process.exit(1);
}
```

### 1.1.18 Browser Compatibility Requirement

Code must not be exclusively runnable in Node.js. All logic should be compatible with browser environments unless the module is explicitly marked as a server-only entry point. When platform-specific APIs are required (e.g., `Worker`, `crypto`, `fs`), the platform-specific code must be isolated behind an abstraction layer with runtime environment detection. This ensures that the core logic remains portable and testable in any JavaScript runtime.

```typescript
/**
 * FORBIDDEN - direct Node.js API usage in shared code.
 * Breaks in browsers, Deno, Bun, and Cloudflare Workers.
 */
import { readFileSync } from 'node:fs';

function loadConfig(): Config {
    const raw: string = readFileSync('./config.json', 'utf-8');
    return JSON.parse(raw) as Config;
}

/**
 * CORRECT - abstraction with environment detection.
 * Core logic works everywhere. Platform bridges are separate.
 */
interface FileReader {
    readonly read: (path: string) => Promise<string>;
}

class NodeFileReader implements FileReader {
    public async read(path: string): Promise<string> {
        const fs = await import('node:fs/promises');
        return fs.readFile(path, 'utf-8');
    }
}

class BrowserFileReader implements FileReader {
    public async read(path: string): Promise<string> {
        const response: Response = await fetch(path);
        return response.text();
    }
}

function createFileReader(): FileReader {
    if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
        return new NodeFileReader();
    }
    return new BrowserFileReader();
}
```

### 1.1.19 Intermediate Alias Assignments Forbidden

Intermediate assignments for the sole purpose of shortening property access are forbidden. Writing `const c = this.#cache` or `const cache = this.#cache` just to avoid typing `this.#cache` multiple times is lazy, obscures mutation targets, and breaks traceability. When you see `c.transaction.version = version`, you must hunt backwards to discover what `c` refers to. When you see `this.#cache.transaction.version = version`, the mutation target is immediately obvious.

The only valid reasons for intermediate assignment are: passing the value to a function, destructuring for multiple reads (not writes), or when the property access itself is computationally expensive and profiling proves it.

```typescript
/**
 * FORBIDDEN - pointless intermediate assignment to shorten access.
 * The reader cannot tell what is being mutated without scrolling up.
 */
public updateVersion(version: number): void {
    const c = this.#cache;
    c.transaction.version = version;
    c.extractedTransaction = undefined;
}

/**
 * ALSO FORBIDDEN - a longer variable name does not fix the problem.
 */
public updateVersion(version: number): void {
    const cache = this.#cache;
    cache.transaction.version = version;
    cache.extractedTransaction = undefined;
}

/**
 * CORRECT - direct property access. Mutation target is visible.
 */
public updateVersion(version: number): void {
    this.#cache.transaction.version = version;
    this.#cache.extractedTransaction = undefined;
}

/**
 * VALID - intermediate needed for a function call or destructured reads.
 */
public submit(): void {
    const transaction = this.#cache.transaction;
    this.#broadcaster.submit(transaction);
}

public computeHash(): Uint8Array {
    const { version, inputs, outputs } = this.#cache.transaction;
    return this.#hasher.hash(version, inputs, outputs);
}
```

### 1.1.20 Stringly-Typed Dispatch Forbidden

String literal parameters used to select behavior are forbidden. If a function behaves differently based on a string argument like `'feeRate'` or `'fee'`, it is performing stringly-typed dispatch, which is just untyped polymorphism with extra steps. Each distinct behavior should be its own function with a clear name. This makes the code self-documenting, eliminates impossible states, and allows the type system to verify each path independently.

```typescript
/**
 * FORBIDDEN - stringly-typed dispatch.
 * The function does two different things depending on a magic string.
 */
function calculate(key: 'feeRate' | 'fee'): number {
    if (key === 'feeRate' && this.#cache.feeRate !== undefined) {
        return this.#cache.feeRate;
    }
    if (key === 'fee' && this.#cache.fee !== undefined) {
        return this.#cache.fee;
    }
    const value: number = key === 'feeRate'
        ? this.#computeFeeRate()
        : this.#computeFee();
    return value;
}

/**
 * CORRECT - separate functions with distinct names.
 * Each function has a single responsibility and a clear contract.
 */
public calculateFeeRate(): number {
    if (this.#cache.feeRate !== undefined) {
        return this.#cache.feeRate;
    }
    const rate: number = this.#computeFeeRate();
    this.#cache.feeRate = rate;
    return rate;
}

public calculateFee(): number {
    if (this.#cache.fee !== undefined) {
        return this.#cache.fee;
    }
    const fee: number = this.#computeFee();
    this.#cache.fee = fee;
    return fee;
}
```

### 1.1.21 Truthy Checks on Cached Numerics Forbidden

Using truthy checks for cached numeric values is forbidden. The expression `if (cache.value)` evaluates to `false` when `value` is `0`, which is a perfectly valid cached result for many computations (fees, indices, counts, balances). This bug is silent and intermittent -- it only manifests when the cached value happens to be zero, making it extremely difficult to diagnose. Always use explicit `!== undefined` checks for cache hits.

```typescript
/**
 * FORBIDDEN - truthy check fails when the cached value is 0.
 * A fee of 0 satoshis is valid but would cause a re-computation.
 */
public getFee(): number {
    if (this.#cache.fee) {
        return this.#cache.fee;
    }
    const fee: number = this.#computeFee();
    this.#cache.fee = fee;
    return fee;
}

/**
 * CORRECT - explicit undefined check handles 0 correctly.
 * Zero is a valid cached value and is returned without recomputation.
 */
public getFee(): number {
    if (this.#cache.fee !== undefined) {
        return this.#cache.fee;
    }
    const fee: number = this.#computeFee();
    this.#cache.fee = fee;
    return fee;
}
```

### 1.1.22 Parameter Mutation for Communication Forbidden

Functions that communicate results by mutating a parameter object are forbidden. When a function modifies properties on an object passed as an argument, the data flow becomes invisible to the reader. The caller must know the internal implementation of the callee to understand which fields were changed and what they now contain. Return values explicitly. If a function needs to return multiple values, return an object.

```typescript
/**
 * FORBIDDEN - mutates the cache parameter to communicate results.
 * The caller must read the function body to know what changed.
 */
function inputFinalizeGetAmts(
    inputs: readonly Input[],
    tx: Transaction,
    cache: PsbtCache,
    mustFinalize: boolean,
): void {
    // ... somewhere deep inside ...
    cache.fee = totalInputs - totalOutputs;
    cache.feeRate = Math.floor(cache.fee / bytes);
}

// Caller has no idea where 'fee' came from:
inputFinalizeGetAmts(inputs, tx, cache, true);
const fee: number = cache.fee; // Magic value appeared on cache

/**
 * CORRECT - explicit return value makes data flow visible.
 * The caller sees exactly what the function produces.
 */
interface FinalizeResult {
    readonly fee: number;
    readonly feeRate: number;
}

function computeFinalizedAmounts(
    inputs: readonly Input[],
    tx: Transaction,
    mustFinalize: boolean,
): FinalizeResult {
    const totalInputs: number = inputs.reduce((sum, i) => sum + i.value, 0);
    const totalOutputs: number = tx.outputs.reduce((sum, o) => sum + o.value, 0);
    const fee: number = totalInputs - totalOutputs;
    const bytes: number = tx.byteLength();
    return { fee, feeRate: Math.floor(fee / bytes) };
}

// Caller sees the data flow explicitly:
const { fee, feeRate }: FinalizeResult = computeFinalizedAmounts(inputs, tx, true);
```

### 1.1.23 Dunder and Magic Property Names Forbidden

Dunder (double-underscore) and magic property names like `__CACHE`, `__TX`, `__FEE_RATE`, and `__EXTRACTED_TX` are Python conventions that have no place in TypeScript. They do not provide encapsulation -- any code can access `obj.__CACHE`. They are ugly, harder to search, and signal that the author wanted privacy but chose the wrong language feature. Use proper `#private` fields for encapsulation, and use descriptive camelCase names for everything else.

```typescript
/**
 * FORBIDDEN - Python-style dunder properties.
 * No actual privacy. Ugly naming. Harder to refactor.
 */
class ForbiddenPsbt {
    private readonly __CACHE: PsbtCache;
    private __TX: Transaction;

    public updateVersion(version: number): void {
        this.__TX.version = version;
        this.__CACHE.__EXTRACTED_TX = undefined;
        this.__CACHE.__FEE_RATE = undefined;
    }
}

/**
 * CORRECT - native #private fields with descriptive camelCase names.
 * True runtime encapsulation. Clean naming. Easy to search.
 */
class CorrectPsbt {
    readonly #cache: PsbtCache;
    #transaction: Transaction;

    public updateVersion(version: number): void {
        this.#transaction.version = version;
        this.#cache.extractedTransaction = undefined;
        this.#cache.feeRate = undefined;
    }
}
```

### 1.1.24 Object.defineProperty for Fake Privacy Forbidden

Using `Object.defineProperty` to hide properties by setting `enumerable: false` is forbidden. This is security theater: the property is still accessible by name, visible through `Object.getOwnPropertyDescriptors`, and discoverable in a debugger. It breaks IDE tooling, disables TypeScript type checking for those properties, and creates an illusion of privacy that provides no actual encapsulation. If you need private state, use `#private` fields.

```typescript
/**
 * FORBIDDEN - Object.defineProperty for fake privacy.
 * The property is still accessible. TypeScript cannot type-check it.
 * Debugger shows it. Reflection reveals it.
 */
class ForbiddenStore {
    public constructor() {
        Object.defineProperty(this, '__internalState', {
            enumerable: false,
            writable: true,
            value: { data: [] },
        });
    }
}

/**
 * CORRECT - native #private fields for actual privacy.
 * Runtime-enforced. Type-checked. IDE-supported.
 */
class CorrectStore {
    #internalState: { data: readonly string[] } = { data: [] };

    public getData(): readonly string[] {
        return this.#internalState.data;
    }
}
```

### 1.1.25 Inline Arrow Function Factories in Constructors Forbidden

Defining one-off arrow function factories inside constructors is forbidden. Patterns like creating a local `dpew` function that wraps `Object.defineProperty` inside the constructor add indirection, obscure what the constructor actually does, and make the code harder to search and debug. If a utility function is needed, define it as a private static method or a module-level function with a clear name. Constructors should contain only initialization logic, not function definitions.

```typescript
/**
 * FORBIDDEN - arrow function factory defined inside constructor.
 * Obscures the actual initialization logic.
 */
class ForbiddenComponent {
    public constructor(data: Uint8Array) {
        const dpew = <T>(
            obj: T,
            attr: string,
            enumerable: boolean,
            writable: boolean,
        ): void => {
            Object.defineProperty(obj, attr, { enumerable, writable });
        };
        dpew(this, '__cache', false, true);
        dpew(this, '__tx', false, true);
    }
}

/**
 * CORRECT - use #private fields. No factory functions needed.
 * The constructor only initializes. Privacy is real.
 */
class CorrectComponent {
    readonly #cache: ComponentCache;
    readonly #transaction: Transaction;

    public constructor(data: Uint8Array) {
        this.#cache = ComponentCache.create();
        this.#transaction = Transaction.fromBuffer(data);
    }
}
```

### 1.1.26 Boolean Error Swallowing Forbidden

Catching errors and returning boolean success indicators is forbidden when the caller needs to know what failed. Collecting `true`/`false` in a loop destroys all error context: which input failed, why it failed, and what the error message was. Either let errors propagate so the caller can handle them, or use a structured result type that preserves the error details alongside the success/failure status.

```typescript
/**
 * FORBIDDEN - errors swallowed into booleans.
 * When all inputs fail, the error message is generic and useless.
 */
public signAllInputs(keyPair: SignerPair): boolean[] {
    const results: boolean[] = [];
    for (let i: number = 0; i < this.#inputs.length; i++) {
        try {
            this.signInput(i, keyPair);
            results.push(true);
        } catch {
            results.push(false);
        }
    }
    if (results.every((v: boolean): boolean => !v)) {
        throw new Error('No inputs were signed');
    }
    return results;
}

/**
 * CORRECT - structured result preserves error context.
 * The caller knows exactly which input failed and why.
 */
interface SigningResult {
    readonly inputIndex: number;
    readonly success: boolean;
    readonly error?: Error;
}

public signAllInputs(keyPair: SignerPair): readonly SigningResult[] {
    const results: SigningResult[] = [];
    for (let i: number = 0; i < this.#inputs.length; i++) {
        try {
            this.signInput(i, keyPair);
            results.push({ inputIndex: i, success: true });
        } catch (error: unknown) {
            const err: Error = error instanceof Error
                ? error
                : new Error(String(error));
            results.push({ inputIndex: i, success: false, error: err });
        }
    }
    const failures: readonly SigningResult[] = results.filter(
        (r: SigningResult): boolean => !r.success,
    );
    if (failures.length === results.length) {
        throw new AggregateError(
            failures.map((f: SigningResult): Error | undefined => f.error),
            `All ${results.length} inputs failed to sign`,
        );
    }
    return results;
}
```

### 1.1.27 Promise Constructor Anti-Pattern Forbidden

The `new Promise` constructor with manual `resolve`/`reject` is forbidden when `async`/`await` suffices. The Promise constructor creates unnecessary nesting, makes error handling more complex (errors thrown inside the callback are caught by the Promise machinery, not by normal try/catch), and produces code that is harder to follow. Use `async` functions and `await` directly. The only legitimate use of the Promise constructor is wrapping callback-based APIs that have no promise equivalent.

```typescript
/**
 * FORBIDDEN - Promise constructor wrapping code that could be async/await.
 * Unnecessary nesting. Error handling is split between reject() and throws.
 */
public signAllInputsAsync(
    keyPair: AsyncSignerPair,
): Promise<readonly SigningResult[]> {
    return new Promise((resolve, reject) => {
        if (!keyPair?.publicKey) {
            return reject(new Error('Need valid key pair'));
        }
        const promises: Promise<void>[] = [];
        for (let i: number = 0; i < this.#inputs.length; i++) {
            promises.push(this.signInputAsync(i, keyPair));
        }
        Promise.all(promises)
            .then(() => resolve(this.#results))
            .catch(reject);
    });
}

/**
 * CORRECT - async/await. Linear flow. Single error handling model.
 */
public async signAllInputsAsync(
    keyPair: AsyncSignerPair,
): Promise<readonly SigningResult[]> {
    if (!keyPair?.publicKey) {
        throw new Error('Need valid key pair with publicKey');
    }
    const promises: readonly Promise<void>[] = this.#inputs.map(
        (_input: Input, i: number): Promise<void> => this.signInputAsync(i, keyPair),
    );
    await Promise.all(promises);
    return this.#results;
}
```

### 1.1.28 Empty Catch Blocks Forbidden

Empty catch blocks and `catch (_)` with no body are forbidden. Silently swallowing errors hides bugs, masks security vulnerabilities, and makes debugging impossible. If an error can legitimately be ignored, the catch block must contain a comment explaining why and must set explicit state (e.g., assigning `undefined` to a variable). If the error should not occur, let it propagate. If it indicates a recoverable condition, handle it.

```typescript
/**
 * FORBIDDEN - empty catch block silently swallows the error.
 * If fromOutputScript throws due to a bug, nobody will ever know.
 */
let address: string | undefined;
try {
    address = fromOutputScript(output.script, network);
} catch (_) {}

/**
 * CORRECT - explicit handling with documented intent.
 * The catch block explains why the error is expected and safe to handle.
 */
let address: string | undefined;
try {
    address = fromOutputScript(output.script, network);
} catch {
    // Non-standard scripts (OP_RETURN, bare multisig) cannot be decoded
    // to addresses. This is expected and the address remains undefined.
    address = undefined;
}
```

### 1.1.29 JSON Clone Hack Forbidden

`JSON.parse(JSON.stringify(obj))` for cloning is forbidden. This technique silently drops `undefined` properties, `Function` values, `Symbol` keys, `bigint` values (throws!), `Date` objects (converts to strings), `Map`, `Set`, `RegExp`, typed arrays, circular references (throws!), and class instances (strips prototypes). It is also slower than `structuredClone()` for non-trivial objects. Use `structuredClone()` for general-purpose deep cloning, or implement explicit clone methods when the object has domain-specific cloning semantics.

```typescript
/**
 * FORBIDDEN - JSON round-trip loses types and throws on bigint.
 */
const cloned = JSON.parse(JSON.stringify(original));

/**
 * CORRECT - structuredClone preserves more types and handles cycles.
 */
const cloned: PsbtOptions = structuredClone(original);

/**
 * CORRECT - explicit clone method for domain objects with custom semantics.
 */
class TransactionCache {
    readonly #fee: bigint | undefined;
    readonly #feeRate: number | undefined;

    public clone(): TransactionCache {
        return new TransactionCache(this.#fee, this.#feeRate);
    }
}
```

### 1.1.30 Console Output in Library Code Forbidden

`console.warn`, `console.log`, `console.error`, and all other console methods are forbidden in library code. Libraries must not assume how the consumer wants to handle diagnostics. A library that writes to the console pollutes test output, interferes with structured logging, and cannot be silenced without monkey-patching. Use a logger interface injected by the consumer, throw errors for error conditions, or return warnings as part of the result type.

```typescript
/**
 * FORBIDDEN - library code writing directly to console.
 * Cannot be silenced. Pollutes consumer's output.
 */
function signInput(input: PsbtInput, keyPair: Signer): Uint8Array {
    console.warn(
        'Warning: Signing non-segwit inputs without the full parent transaction'
        + ' means there is a risk of signing a non-existent transaction.',
    );
    return keyPair.sign(input.hash);
}

/**
 * CORRECT - warnings returned in the result type.
 * The consumer decides how to handle them.
 */
interface SigningOutput {
    readonly signature: Uint8Array;
    readonly warnings: readonly string[];
}

function signInput(input: PsbtInput, keyPair: Signer): SigningOutput {
    const warnings: string[] = [];
    if (!input.nonWitnessUtxo) {
        warnings.push(
            'Signing non-segwit input without full parent transaction.'
            + ' Risk of signing a non-existent transaction.',
        );
    }
    return { signature: keyPair.sign(input.hash), warnings };
}
```

### 1.1.31 Centralized Cache Invalidation Required

Multiple cache invalidation sites are forbidden. When adding an input requires clearing seven cache fields, and adding an output requires clearing four of the same fields, and signing clears three more, you have a cache coherence nightmare. Any new method that forgets to clear the right fields introduces a silent bug. Encapsulate all cache invalidation in a single method that takes a scope parameter, and call that method from every mutation point.

```typescript
/**
 * FORBIDDEN - cache invalidation scattered across multiple methods.
 * Adding a new cached field requires updating every method.
 */
class ForbiddenPsbt {
    public addInput(input: PsbtInput): this {
        this.#data.inputs.push(input);
        this.#cache.fee = undefined;
        this.#cache.feeRate = undefined;
        this.#cache.extractedTx = undefined;
        this.#cache.previousOutputs = undefined;
        this.#cache.signingScripts = undefined;
        this.#cache.values = undefined;
        this.#cache.taprootHashCache = undefined;
        return this;
    }

    public addOutput(output: PsbtOutput): this {
        this.#data.outputs.push(output);
        this.#cache.fee = undefined;
        this.#cache.feeRate = undefined;
        this.#cache.extractedTx = undefined;
        this.#cache.taprootHashCache = undefined;
        return this;
    }
}

/**
 * CORRECT - single invalidation method with scope control.
 * Adding a new cached field requires updating only one method.
 */
class CorrectPsbt {
    #invalidateCache(scope: 'full' | 'outputs'): void {
        this.#cache.fee = undefined;
        this.#cache.feeRate = undefined;
        this.#cache.extractedTx = undefined;
        this.#cache.taprootHashCache = undefined;
        if (scope === 'full') {
            this.#cache.previousOutputs = undefined;
            this.#cache.signingScripts = undefined;
            this.#cache.values = undefined;
        }
    }

    public addInput(input: PsbtInput): this {
        this.#data.inputs.push(input);
        this.#invalidateCache('full');
        return this;
    }

    public addOutput(output: PsbtOutput): this {
        this.#data.outputs.push(output);
        this.#invalidateCache('outputs');
        return this;
    }
}
```

### 1.1.32 Unnarrowed Unknown Property Access Forbidden

Functions that take `unknown` parameters and access properties without narrowing are forbidden. If a function accepts `Uint8Array | Buffer` or any union/unknown type, it must use proper type guards or narrowing checks before accessing type-specific properties. Casting without narrowing defeats the purpose of the type system and creates runtime errors when the wrong variant is passed.

```typescript
/**
 * FORBIDDEN - accessing properties on unknown without narrowing.
 * If 'data' is not a Buffer, this crashes at runtime.
 */
function forbidden(data: Uint8Array | Buffer): Uint8Array {
    if (Buffer.isBuffer(data)) {
        return data;
    }
    return Buffer.from(data) as unknown as Uint8Array;
}

/**
 * CORRECT - proper narrowing with type guard.
 * Each branch is type-safe. No casts needed.
 */
function correct(data: Uint8Array): Uint8Array {
    if (data instanceof Uint8Array) {
        return data;
    }
    throw new TypeError(
        `Expected Uint8Array, got ${typeof data === 'object' ? data?.constructor?.name ?? 'null' : typeof data}`,
    );
}

/**
 * CORRECT - type guard function for reusable narrowing.
 */
function isUint8Array(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
}

function processData(data: unknown): Uint8Array {
    if (!isUint8Array(data)) {
        throw new TypeError(`Expected Uint8Array, got ${typeof data}`);
    }
    return data;
}
```

### 1.1.33 Magic Default Buffers Forbidden

Magic default buffers like `Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])` are forbidden. Raw byte arrays with no explanation are meaningless to every reader who did not write them. They cannot be verified against a specification, they are fragile under refactoring, and they silently encode domain knowledge that should be documented. Use named constants with JSDoc comments that explain the byte-level format.

```typescript
/**
 * FORBIDDEN - magic byte array with no explanation.
 * What does [2, 0, 0, 0, 0, 0, 0, 0, 0, 0] mean?
 */
class ForbiddenTransaction {
    public constructor(
        buffer: Uint8Array = new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ) {
        this.#parse(buffer);
    }
}

/**
 * CORRECT - named constant with byte-level documentation.
 * Every byte is explained. The format is verifiable.
 */
class CorrectTransaction {
    /**
     * Minimal valid transaction v2: version 2 (LE u32),
     * zero inputs (varint), zero outputs (varint), locktime 0 (LE u32).
     */
    static readonly #EMPTY_TX_V2: Uint8Array = new Uint8Array([
        0x02, 0x00, 0x00, 0x00, // version = 2 (little-endian uint32)
        0x00,                   // input count = 0 (varint)
        0x00,                   // output count = 0 (varint)
        0x00, 0x00, 0x00, 0x00, // locktime = 0 (little-endian uint32)
    ]);

    public constructor(
        buffer: Uint8Array = CorrectTransaction.#EMPTY_TX_V2,
    ) {
        this.#parse(buffer);
    }
}
```

### 1.1.34 Parameter Mutation Forbidden

Mutating function parameters is forbidden. When a function modifies `tx.ins[idx].script`, `tx.ins[idx].witness`, or any other property on a passed-in object, the caller has no way to know this happened without reading the function's implementation. Functions should return new values. If mutation is absolutely necessary for performance, it must be explicit through naming (`mutateTransaction`) and parameter types (`cache: Mutable<PsbtCache>`).

```typescript
/**
 * FORBIDDEN - function silently mutates the transaction parameter.
 * The caller's object is changed without consent or documentation.
 */
function finalizeInput(
    tx: Transaction,
    inputIndex: number,
    script: Uint8Array,
    witness: readonly Uint8Array[],
): void {
    tx.ins[inputIndex].script = script;
    tx.ins[inputIndex].witness = witness;
}

/**
 * CORRECT - return a new object with the changes applied.
 * The caller explicitly receives the result and decides what to do.
 */
interface FinalizedInput {
    readonly script: Uint8Array;
    readonly witness: readonly Uint8Array[];
}

function finalizeInput(
    input: TransactionInput,
    script: Uint8Array,
    witness: readonly Uint8Array[],
): FinalizedInput {
    return { script, witness };
}

/**
 * ACCEPTABLE - when mutation is required for performance,
 * make it explicit through naming and types.
 */
function mutateTransactionInput(
    tx: MutableTransaction,
    inputIndex: number,
    script: Uint8Array,
    witness: readonly Uint8Array[],
): void {
    tx.ins[inputIndex].script = script;
    tx.ins[inputIndex].witness = [...witness];
}
```

### 1.1.35 Type Assertions to Satisfy Return Types Forbidden

Type assertions like `as unknown as TargetType` are forbidden for satisfying return types. This double-cast pattern is a complete escape hatch from the type system. It tells the compiler "I know better than you" while providing zero evidence. If the types do not align, fix the types or use proper type guards and narrowing. The type system exists to catch bugs; circumventing it with assertions re-introduces the bugs the system was designed to prevent.

```typescript
/**
 * FORBIDDEN - double type assertion to force a return type.
 * If the runtime value does not match TapKeySig, nothing catches it.
 */
function forbidden(
    hashes: readonly HashForSig[],
    sighashType: number,
): TapKeySig {
    return hashes
        .filter((h: HashForSig): boolean => !h.leafHash)
        .map((h: HashForSig): Uint8Array =>
            serializeTaprootSignature(signSchnorr(h.hash), sighashType),
        )[0] as unknown as TapKeySig;
}

/**
 * CORRECT - proper typing and explicit undefined handling.
 * The type guard narrows the filter. The result is typed correctly.
 */
interface KeyPathHash extends HashForSig {
    readonly leafHash: undefined;
}

function correct(
    hashes: readonly HashForSig[],
    sighashType: number,
): TapKeySig {
    const keyPathHashes: readonly KeyPathHash[] = hashes.filter(
        (h: HashForSig): h is KeyPathHash => h.leafHash === undefined,
    );
    if (keyPathHashes.length === 0) {
        throw new Error('No key path hash found for tap key signature');
    }
    const signature: Uint8Array = serializeTaprootSignature(
        signSchnorr(keyPathHashes[0].hash),
        sighashType,
    );
    return createTapKeySig(signature);
}
```

### 1.1.36 indexOf for Membership Checks Forbidden

`indexOf() >= 0` is forbidden for membership checks. The `includes()` method exists precisely for this purpose and communicates intent clearly. For arrays of objects where reference equality is insufficient, use `some()` with a predicate. The `indexOf` pattern is a holdover from pre-ES2016 JavaScript and has no place in modern TypeScript.

```typescript
/**
 * FORBIDDEN - indexOf for membership check.
 * Unclear intent. Easy to get the comparison wrong (> 0 vs >= 0 vs !== -1).
 */
function forbidden(type: string): boolean {
    return ['p2sh-p2wsh', 'p2wsh'].indexOf(type) >= 0;
}

/**
 * CORRECT - includes() communicates membership intent directly.
 */
function correct(type: string): boolean {
    return ['p2sh-p2wsh', 'p2wsh'].includes(type);
}

/**
 * CORRECT - some() for complex membership with a predicate.
 */
function containsInput(
    inputs: readonly TransactionInput[],
    targetHash: Uint8Array,
): boolean {
    return inputs.some(
        (input: TransactionInput): boolean => bytesEqual(input.hash, targetHash),
    );
}
```

### 1.1.37 Reduce with Boolean Accumulator Forbidden

Using `reduce` with a boolean accumulator to implement `every` or `some` semantics is forbidden. JavaScript provides `Array.prototype.every()` and `Array.prototype.some()` specifically for these operations. They are more readable, communicate intent directly, and short-circuit (stop iterating as soon as the result is determined). A `reduce` with a boolean accumulator always iterates the entire array even when the answer is known after the first element.

```typescript
/**
 * FORBIDDEN - reduce with boolean accumulator.
 * Iterates the entire array. Unclear intent. No short-circuit.
 */
function allSucceeded(results: readonly boolean[]): boolean {
    return results.reduce(
        (final: boolean, res: boolean): boolean => res && final,
        true,
    );
}

function anySucceeded(results: readonly boolean[]): boolean {
    return results.reduce(
        (final: boolean, res: boolean): boolean => res || final,
        false,
    );
}

/**
 * CORRECT - every() and some() with clear intent and short-circuit.
 */
function allSucceeded(results: readonly boolean[]): boolean {
    return results.every((result: boolean): boolean => result);
}

function anySucceeded(results: readonly boolean[]): boolean {
    return results.some((result: boolean): boolean => result);
}
```

### 1.1.38 Fallback Object for Optional Chaining Forbidden

Optional chaining into method calls that create phantom empty objects is forbidden. The pattern `(input || {}).partialSig` creates a new empty object when `input` is falsy, then accesses `.partialSig` on it, which returns `undefined`. This hides the fact that `input` was missing and causes silent undefined behavior downstream. Either throw early with a clear error message indicating the missing input, or use proper null checks that make the absence explicit.

```typescript
/**
 * FORBIDDEN - creates a phantom empty object to avoid a null check.
 * If input is undefined, this silently produces undefined
 * instead of telling the developer what went wrong.
 */
function forbidden(input: PsbtInput | undefined): readonly Uint8Array[] | undefined {
    const partialSig = (input || {}).partialSig;
    return partialSig;
}

/**
 * CORRECT - explicit null check with a descriptive error.
 * The developer knows immediately what is missing.
 */
function correct(input: PsbtInput | undefined, inputIndex: number): readonly Uint8Array[] {
    if (!input) {
        throw new Error(`Input at index ${inputIndex} does not exist`);
    }
    if (!input.partialSig) {
        throw new Error(`Input at index ${inputIndex} has no partial signatures`);
    }
    return input.partialSig;
}

/**
 * ALSO CORRECT - when absence is expected, use real optional chaining.
 */
function safeGet(input: PsbtInput | undefined): readonly Uint8Array[] | undefined {
    return input?.partialSig;
}
```

### 1.1.39 Confusing Re-Exports from Entry Points Forbidden

Re-exports from entry points are forbidden (per section 13.2.1), but the specific violation addressed here is worse: selective re-export with different visibility levels creates confusion about what is public API. When the same type is exported from two different files with different scopes or names, consumers cannot tell which is the canonical import path. Either a type is part of the public API and is exported once from the entry point, or it is internal and is not exported at all. Do not have two export statements for the same types.

```typescript
/**
 * FORBIDDEN - confusing dual exports of the same types.
 * Consumer sees ValidateSigFunction exported from both the entry
 * point and the internal types file. Which is canonical?
 */
// index.ts
export type { ValidateSigFunction, PsbtInput } from './psbt/types.js';

// psbt/types.ts
export interface ValidateSigFunction {
    (pubkey: Uint8Array, msghash: Uint8Array, signature: Uint8Array): boolean;
}

/**
 * CORRECT - single canonical export from the entry point.
 * Internal types are imported, then explicitly re-exported once.
 */
// psbt/types.ts (internal, not re-exported directly)
export interface ValidateSigFunction {
    (pubkey: Uint8Array, msghash: Uint8Array, signature: Uint8Array): boolean;
}

// index.ts (single canonical export)
import type { ValidateSigFunction } from './psbt/types.js';
import type { PsbtInput } from './psbt/types.js';
export type { ValidateSigFunction, PsbtInput };
```

### 1.1.40 Mixed Error Handling Strategies Forbidden

Functions that return `null` for "not found" alongside throwing for other error conditions are forbidden. A function that returns `null` when a script is missing but throws when a signature is invalid forces the caller to handle two completely different error models simultaneously: a null check and a try/catch. Pick one strategy per function. Either use a discriminated union Result type that encodes all failure modes, or throw for all error conditions with distinct error types. Never mix.

```typescript
/**
 * FORBIDDEN - mixed error handling: null for some failures, throw for others.
 * The caller needs both a null check and a try/catch.
 */
function forbidden(input: PsbtInput): GetScriptResult {
    const res: GetScriptResult = {
        script: null,   // null means "not found"?
        isSegwit: false,
        isP2SH: false,
        isP2WSH: false,
    };

    if (!input.witnessUtxo && !input.nonWitnessUtxo) {
        return res; // returns null script
    }

    if (input.witnessUtxo) {
        // ... but throws here for invalid data
        throw new Error('Invalid witness script');
    }

    return res;
}

/**
 * CORRECT - consistent discriminated union for all outcomes.
 * One pattern to check. No try/catch needed.
 */
interface GetScriptSuccess {
    readonly success: true;
    readonly script: Uint8Array;
    readonly isSegwit: boolean;
    readonly isP2SH: boolean;
    readonly isP2WSH: boolean;
}

interface GetScriptFailure {
    readonly success: false;
    readonly reason: 'no_utxo' | 'invalid_script' | 'unsupported_type';
}

type GetScriptResult = GetScriptSuccess | GetScriptFailure;

function correct(input: PsbtInput): GetScriptResult {
    if (!input.witnessUtxo && !input.nonWitnessUtxo) {
        return { success: false, reason: 'no_utxo' };
    }
    if (!isValidScript(input)) {
        return { success: false, reason: 'invalid_script' };
    }
    return {
        success: true,
        script: input.witnessUtxo!.script,
        isSegwit: true,
        isP2SH: false,
        isP2WSH: false,
    };
}
```

### 1.1.41 Delete-then-DefineProperty Hack Forbidden

Using `delete` on an object property followed by `Object.defineProperty` or `Reflect.defineProperty` to replace it with a getter/setter is forbidden. This pattern destroys V8 hidden classes (transitioning the object to dictionary mode, which is permanently slower), breaks prototype chain assumptions, and is a form of prototype pollution risk. If you need computed properties or lazy evaluation, design the class with getters from the start. Retrofitting getters onto existing objects at runtime is a hack that trades correctness for convenience.

```typescript
/**
 * FORBIDDEN - delete + defineProperty hack.
 * Destroys V8 hidden class. Breaks type safety. Prototype pollution risk.
 */
function forbidden(input: PsbtInput): void {
    delete (input as Record<string, unknown>).nonWitnessUtxo;
    Reflect.defineProperty(input, 'nonWitnessUtxo', {
        enumerable: true,
        get(): Uint8Array | undefined {
            return this._nonWitnessUtxoBuffer;
        },
        set(data: Uint8Array): void {
            this._nonWitnessUtxoBuffer = data;
            this._nonWitnessUtxoTx = undefined;
        },
    });
}

/**
 * CORRECT - design with getters from the start.
 * V8 hidden classes are stable. Type system is intact.
 */
class PsbtInputWrapper {
    #nonWitnessUtxoBuffer: Uint8Array | undefined;
    #nonWitnessUtxoTransaction: Transaction | undefined;

    public get nonWitnessUtxo(): Uint8Array | undefined {
        if (this.#nonWitnessUtxoBuffer !== undefined) {
            return this.#nonWitnessUtxoBuffer;
        }
        if (this.#nonWitnessUtxoTransaction !== undefined) {
            this.#nonWitnessUtxoBuffer = this.#nonWitnessUtxoTransaction.toBuffer();
            return this.#nonWitnessUtxoBuffer;
        }
        return undefined;
    }

    public set nonWitnessUtxo(data: Uint8Array | undefined) {
        this.#nonWitnessUtxoBuffer = data;
        this.#nonWitnessUtxoTransaction = undefined;
    }
}
```

---

## 1.2 Numeric Types

### 1.2.1 When to Use Number

The `number` type is fine for values guaranteed to stay small: array lengths, loop counters, bit flags, enum values, pixel coordinates, retry counts, port numbers, HTTP status codes, small indices, or anything bounded by application logic to stay well under `Number.MAX_SAFE_INTEGER`. These values will never overflow in practice.

```typescript
// CORRECT - number for bounded small values
const length: number = array.length;
const retryCount: number = 3;
const port: number = 8080;
const flags: number = FLAG_A | FLAG_B | FLAG_C;
for (let i = 0; i < length; i++) { /* ... */ }
```

### 1.2.2 When to Use BigInt

The `bigint` type is required for values that could grow large or where precision is critical: satoshi amounts, block heights, timestamps in milliseconds, database IDs, transaction counts, cumulative totals, file sizes, byte offsets in large files, or any value from external systems where you don't control the range.

```typescript
// CORRECT - bigint for potentially large or critical values
const satoshis: bigint = 2_100_000_000_000_000n;
const blockHeight: bigint = 850_000n;
const timestampMs: bigint = BigInt(Date.now());
const totalSupply: bigint = userBalances.reduce((sum, b) => sum + b, 0n);
const fileOffset: bigint = 0x1_0000_0000n; // >4GB
```

### 1.2.3 The Decision Question

The question to ask: "Can this value ever exceed 2^53 in any edge case?" If yes, or if you're unsure, use `bigint`. If no and you control all inputs, `number` is fine.

```typescript
// number - you control the bounds
const maxRetries: number = 5;
const arrayIndex: number = items.length - 1;
const bitMask: number = 0xFF00;

// bigint - external or unbounded
const userId: bigint = BigInt(apiResponse.user_id);      // external system
const tokenBalance: bigint = contract.balanceOf(addr);   // could be huge
const accumulatedFees: bigint = sumAllFees();            // grows over time
```

### 1.2.4 BigInt Literals

Use `bigint` literals with the `n` suffix: `0n`, `100n`, `2_100_000_000_000_000n`. Never use `BigInt(largeNumberLiteral)` - the number literal loses precision before conversion.

```typescript
// CORRECT
const amount = 9_007_199_254_740_993n;

// WRONG - precision already lost in the number literal
const broken = BigInt(9007199254740993);  // Wrong value!
```

### 1.2.5 Converting from External APIs

When external APIs return `number` for values that should be `bigint`, convert immediately:

```typescript
const externalId: number = api.getUserId();
const safeId: bigint = BigInt(Math.trunc(externalId));
```

### 1.2.6 Converting to APIs Requiring Number

When APIs require `number` but you have `bigint`, convert at the boundary with validation:

```typescript
function toSafeNumber(value: bigint): number {
    if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError(`Value ${value} exceeds safe integer range`);
    }
    return Number(value);
}
```

### 1.2.7 BigInt Division

Division with `bigint` truncates toward zero. For different rounding:

```typescript
function divFloor(a: bigint, b: bigint): bigint {
    const result = a / b;
    return (a < 0n !== b < 0n && a % b !== 0n) ? result - 1n : result;
}

function divCeil(a: bigint, b: bigint): bigint {
    const result = a / b;
    return (a > 0n === b > 0n && a % b !== 0n) ? result + 1n : result;
}
```

### 1.2.8 Fixed-Point Decimal

For fixed-point decimal representation, use `bigint` with explicit scale:

```typescript
const DECIMALS = 8n;
const SCALE = 10n ** DECIMALS; // 100_000_000n

type FixedPoint = Brand<bigint, 'FixedPoint'>;

function multiply(a: FixedPoint, b: FixedPoint): FixedPoint {
    return ((a * b) / SCALE) as FixedPoint;
}
```

### 1.2.9 JSON Serialization

JSON does not support `bigint`. Serialize as strings:

```typescript
function serializeBigInt(value: bigint): string {
    return value.toString();
}

function deserializeBigInt(data: string): bigint {
    if (!/^-?\d+$/.test(data)) throw new TypeError('Invalid bigint string');
    return BigInt(data);
}
```

### 1.2.10 Comparison and Arithmetic

Never use `==` for comparisons (type coercion). Use `===`. Mixed `bigint`/`number` in arithmetic throws TypeError - this is good, it catches bugs.

### 1.2.11 Bitwise Operations

Bitwise on `number` truncates to 32 bits. Bitwise on `bigint` preserves all bits:

```typescript
// 32-bit ops - number is correct
const crc: number = (crc32 ^ byte) >>> 0;
const rotated: number = ((x << 13) | (x >>> 19)) >>> 0;

// >32-bit ops - bigint required
const flags64: bigint = 1n << 63n;
const mask256: bigint = (1n << 256n) - 1n;

// BROKEN - number can't shift more than 31 bits usefully
const wrong = 1 << 64; // equals 1, not 2^64
```

---

## 1.3 Enum Architecture

### 1.3.1 Native Enum Prohibition

Native TypeScript `enum` declarations are forbidden. They generate runtime objects, prevent tree-shaking, have surprising behaviors with numeric enums and reverse mappings, and don't optimize well in V8.

Native enums have these problems:
1. They generate runtime code that can't be tree-shaken
2. Numeric enums create reverse mappings that bloat bundle size
3. They can be assigned any number, breaking type safety
4. They don't work well with discriminated unions
5. V8 cannot optimize them as well as const objects

```typescript
// FORBIDDEN - generates runtime object
enum Status {
    Pending,
    Active,
    Completed
}

// FORBIDDEN - string enum still generates runtime object
enum Direction {
    Up = "UP",
    Down = "DOWN"
}

// Numeric enums allow this nonsense:
const invalid: Status = 999; // No error! TypeScript allows any number
```

### 1.3.2 The Const Enum Pattern

The preferred enum pattern uses `as const` objects with derived types. This provides full type safety, IDE support, zero runtime cost for unused values, and optimal V8 optimization. Use `bigint` values for enums representing large or unbounded values.

```typescript
/**
 * The standard enum pattern for TypeScript Law 2026.
 * Use number for small bounded values, bigint for large/unbounded values.
 */

// number values for small bounded enums
const Status = {
    Pending: 0,
    Active: 1,
    Completed: 2,
} as const;

type Status = (typeof Status)[keyof typeof Status];
// Type is: 0 | 1 | 2

// bigint values for large/unbounded enums
const ChainId = {
    Bitcoin: 0n,
    Testnet: 1n,
    Signet: 2n,
} as const;

type ChainId = (typeof ChainId)[keyof typeof ChainId];
// Type is: 0n | 1n | 2n

// Usage - fully type safe
function processStatus(status: Status): void {
    switch (status) {
        case Status.Pending:
            // TypeScript knows this is 0
            break;
        case Status.Active:
            // TypeScript knows this is 1
            break;
        case Status.Completed:
            // TypeScript knows this is 2
            break;
        default:
            // Exhaustiveness check
            const _exhaustive: never = status;
            throw new Error(`Unknown status: ${_exhaustive}`);
    }
}

// This is an error - can't assign arbitrary numbers
const invalid: Status = 999; // Error: Type '999' is not assignable to type 'Status'
```

### 1.2.3 Symbol-Based Enum Pattern

For enums where the values must be unique and should never be serialized, use Symbol-based enums. Symbols guarantee uniqueness and prevent accidental comparison with other values.

```typescript
/**
 * Symbol-based enum for unique, non-serializable values.
 * Use when enum values must never be compared to non-enum values.
 * Use when values should not be serializable.
 */
const TokenType = {
    Identifier: Symbol('TokenType.Identifier'),
    Number: Symbol('TokenType.Number'),
    String: Symbol('TokenType.String'),
    Operator: Symbol('TokenType.Operator'),
    EOF: Symbol('TokenType.EOF'),
} as const;

type TokenType = (typeof TokenType)[keyof typeof TokenType];

// Values are globally unique and cannot be forged
// Cannot accidentally compare with strings or numbers
// Cannot be serialized to JSON (good for internal-only values)

interface Token {
    readonly type: TokenType;
    readonly value: string;
    readonly position: number;
}
```

For symbols that must be shared across realms or serialized for debugging:

```typescript
/**
 * Registry symbols for cross-realm sharing.
 * Symbol.for() returns the same symbol for the same key globally.
 */
const EventType = {
    Click: Symbol.for('Event.Click'),
    Hover: Symbol.for('Event.Hover'),
    Focus: Symbol.for('Event.Focus'),
    Blur: Symbol.for('Event.Blur'),
} as const;

type EventType = (typeof EventType)[keyof typeof EventType];

// Can retrieve the key for debugging
Symbol.keyFor(EventType.Click); // 'Event.Click'
```

### 1.2.4 Numeric Enum Pattern

For enums with numeric values that must be serialized or used in binary protocols:

```typescript
/**
 * Numeric enum for binary protocols.
 * Values are explicit and map to protocol specifications.
 */
const OpCode = {
    OP_0: 0x00,
    OP_FALSE: 0x00,
    OP_PUSHDATA1: 0x4c,
    OP_PUSHDATA2: 0x4d,
    OP_PUSHDATA4: 0x4e,
    OP_1NEGATE: 0x4f,
    OP_RESERVED: 0x50,
    OP_1: 0x51,
    OP_TRUE: 0x51,
    OP_2: 0x52,
    OP_3: 0x53,
    OP_16: 0x60,
    OP_NOP: 0x61,
    OP_IF: 0x63,
    OP_NOTIF: 0x64,
    OP_ELSE: 0x67,
    OP_ENDIF: 0x68,
    OP_VERIFY: 0x69,
    OP_RETURN: 0x6a,
    OP_DUP: 0x76,
    OP_EQUAL: 0x87,
    OP_EQUALVERIFY: 0x88,
    OP_HASH160: 0xa9,
    OP_HASH256: 0xaa,
    OP_CHECKSIG: 0xac,
    OP_CHECKMULTISIG: 0xae,
} as const;

type OpCode = (typeof OpCode)[keyof typeof OpCode];

// Reverse lookup must be explicit, not automatic
const OpCodeName = {
    [OpCode.OP_0]: 'OP_0',
    [OpCode.OP_PUSHDATA1]: 'OP_PUSHDATA1',
    [OpCode.OP_DUP]: 'OP_DUP',
    [OpCode.OP_HASH160]: 'OP_HASH160',
    [OpCode.OP_EQUALVERIFY]: 'OP_EQUALVERIFY',
    [OpCode.OP_CHECKSIG]: 'OP_CHECKSIG',
    // ... explicit mappings only for what you need
} as const satisfies Partial<Record<OpCode, string>>;
```

### 1.2.5 String Enum Pattern

For enums with string values:

```typescript
const HttpMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
} as const;

type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
// Type is: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

const ContentType = {
    JSON: 'application/json',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html',
} as const;

type ContentType = (typeof ContentType)[keyof typeof ContentType];
```

### 1.2.6 Enum Type Extraction Utilities

Standard utility types for working with const enums:

```typescript
/**
 * Extracts the value type from a const object.
 * @example ValueOf<typeof Status> // 0 | 1 | 2
 */
type ValueOf<T> = T[keyof T];

/**
 * Extracts the key type from a const object.
 * @example KeyOf<typeof Status> // 'Pending' | 'Active' | 'Completed'
 */
type KeyOf<T> = keyof T;

/**
 * Creates a reverse mapping type from value to key.
 */
type ReverseMap<T extends Record<string, string | number | symbol>> = {
    [K in keyof T as T[K] extends string | number | symbol ? T[K] : never]: K;
};

/**
 * Checks if a value is a valid enum value.
 */
function isEnumValue<T extends Record<string, unknown>>(
    enumObj: T,
    value: unknown
): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
}
```

---

## 1.4 Interface Law

### 1.4.1 Interface Over Type for Objects

Use `interface` for all object type definitions. Interfaces have superior performance in the TypeScript compiler, provide better error messages, support declaration merging, and are the idiomatic choice for object shapes.

The TypeScript compiler processes interfaces faster than type aliases for object shapes. Error messages reference the interface name rather than expanding the entire type. Interfaces can be extended and merged, enabling powerful patterns.

```typescript
// CORRECT: Use interface for objects
interface User {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

// INCORRECT: Don't use type for object shapes
type UserBad = {
    id: string;
    name: string;
};

// Use `type` only for:
// - Union types
// - Intersection types
// - Mapped types
// - Conditional types
// - Type aliases for primitives
// - Tuple types

type Result<T, E> = Success<T> | Failure<E>;  // Union - use type
type Combined = A & B;                         // Intersection - use type
type Readonly<T> = { readonly [K in keyof T]: T[K] }; // Mapped - use type
type UserId = string;                          // Alias - use type
type Point = readonly [number, number];        // Tuple - use type
```

### 1.4.2 Interface Extension

Interfaces extend other interfaces using the `extends` keyword. This creates an inheritance relationship where the child interface includes all properties of the parent.

```typescript
/**
 * Base entity with common fields.
 * All domain objects extend this.
 */
interface Entity {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * Auditable entities track who made changes.
 */
interface Auditable {
    readonly createdBy: string;
    readonly updatedBy: string;
}

/**
 * Versioned entities support optimistic locking.
 */
interface Versioned {
    readonly version: number;
}

/**
 * User extends Entity with user-specific fields.
 */
interface User extends Entity {
    readonly name: string;
    readonly email: string;
    readonly passwordHash: string;
}

/**
 * Admin extends User with additional permissions.
 */
interface Admin extends User {
    readonly permissions: readonly Permission[];
    readonly department: string;
}

/**
 * Multiple extension - combines all parent interfaces.
 */
interface AuditedEntity extends Entity, Auditable, Versioned {
    readonly notes: string;
}
```

### 1.4.3 Interface Merging

Interfaces with the same name in the same scope automatically merge. This is powerful for augmenting library types or building up complex types across modules.

```typescript
// First declaration
interface Config {
    readonly host: string;
    readonly port: number;
}

// Second declaration - merges with first
interface Config {
    readonly ssl: boolean;
    readonly timeout: number;
}

// Config now has all four properties
const config: Config = {
    host: 'localhost',
    port: 3000,
    ssl: true,
    timeout: 5000,
};

// Module augmentation pattern
declare module 'express' {
    interface Request {
        readonly userId?: string;
        readonly sessionId?: string;
    }
}
```

Use declaration merging deliberately. Avoid accidental merging by using unique interface names or namespaces.

### 1.3.4 Generic Interfaces

Interfaces can be generic, accepting type parameters that are substituted when the interface is used.

```typescript
/**
 * Generic repository interface.
 * @typeParam T - The entity type, must extend Entity
 */
interface Repository<T extends Entity> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<readonly T[]>;
    findBy(criteria: Partial<T>): Promise<readonly T[]>;
    save(entity: T): Promise<T>;
    delete(id: string): Promise<boolean>;
    exists(id: string): Promise<boolean>;
}

/**
 * Result type with success and error variants.
 * @typeParam T - The success value type
 * @typeParam E - The error type, defaults to Error
 */
interface Result<T, E extends Error = Error> {
    readonly success: boolean;
    readonly value?: T;
    readonly error?: E;
}

/**
 * Cache interface with configurable key and value types.
 * @typeParam K - Key type, defaults to string
 * @typeParam V - Value type
 */
interface Cache<K extends string | number | symbol = string, V = unknown> {
    get(key: K): V | undefined;
    set(key: K, value: V, ttl?: number): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    readonly size: number;
}

/**
 * Pagination interface for list responses.
 * @typeParam T - The item type
 */
interface PaginatedResponse<T> {
    readonly items: readonly T[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
}
```

### 1.3.5 Callable Interfaces

Interfaces can describe callable objects using call signatures.

```typescript
/**
 * Validator function interface with metadata.
 * @typeParam T - The type being validated
 */
interface Validator<T> {
    (value: unknown): value is T;
    readonly name: string;
    readonly schema: object;
    readonly errorMessage: string;
}

/**
 * Event handler with configuration.
 * @typeParam E - The event type
 */
interface EventHandler<E extends Event = Event> {
    (event: E): void | Promise<void>;
    readonly once?: boolean;
    readonly passive?: boolean;
    readonly capture?: boolean;
}

/**
 * Factory function interface.
 * @typeParam T - The type being created
 * @typeParam Args - Constructor arguments
 */
interface Factory<T, Args extends readonly unknown[] = readonly []> {
    (...args: Args): T;
    readonly prototype: T;
}

/**
 * Constructor interface for class types.
 * @typeParam T - The instance type
 */
interface Constructor<T, Args extends readonly unknown[] = readonly unknown[]> {
    new (...args: Args): T;
    readonly prototype: T;
}

/**
 * Middleware function pattern.
 */
interface Middleware<T> {
    (context: T, next: () => Promise<void>): Promise<void>;
    readonly name?: string;
}
```

### 1.3.6 Indexable Interfaces

Interfaces can describe objects with dynamic keys using index signatures.

```typescript
/**
 * String dictionary - all values are strings.
 */
interface StringDictionary {
    readonly [key: string]: string;
}

/**
 * Number-keyed collection (array-like).
 * @typeParam T - The element type
 */
interface ArrayLike<T> {
    readonly [index: number]: T;
    readonly length: number;
}

/**
 * Mixed index signature with known properties.
 * Known properties must be compatible with index signature.
 */
interface Configuration {
    readonly version: number;
    readonly name: string;
    readonly [key: string]: string | number | boolean;
}

/**
 * Template string index signatures (TypeScript 4.4+).
 * Only allow keys matching a pattern.
 */
interface EventHandlers {
    readonly [key: `on${string}`]: ((event: Event) => void) | undefined;
}

const handlers: EventHandlers = {
    onClick: (e) => console.log(e),
    onHover: (e) => console.log(e),
    // invalid: () => {} // Error: doesn't match pattern
};
```

Index signatures should be `readonly` unless mutation is explicitly required and justified.

### 1.3.7 Hybrid Interfaces

Interfaces can combine multiple patterns: callable, constructable, indexable, and regular properties.

```typescript
/**
 * jQuery-like interface combining multiple patterns.
 */
interface QueryInterface {
    // Call signature - select elements
    (selector: string): ElementCollection;
    (element: Element): ElementCollection;
    
    // Properties
    readonly version: string;
    readonly fn: PluginPrototype;
    
    // Methods
    ajax(options: AjaxOptions): Promise<Response>;
    get(url: string): Promise<Response>;
    post(url: string, data: unknown): Promise<Response>;
    
    // Index signature for plugins
    readonly [plugin: string]: unknown;
}

/**
 * Assert function that's also a namespace.
 */
interface Assert {
    // Call signature
    (condition: boolean, message?: string): asserts condition;
    
    // Methods
    equal<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    throws(fn: () => void, expected?: RegExp | Constructor<Error>): void;
    
    // Nested namespace
    readonly strict: {
        (condition: boolean, message?: string): asserts condition;
        equal<T>(actual: T, expected: T, message?: string): void;
    };
}
```

---

## 1.5 Type Alias Law

### 1.4.1 Union Types

Union types represent values that can be one of several types. Use union types for discriminated unions, literal types, and type narrowing.

```typescript
/**
 * Discriminated union - the preferred pattern.
 * Each variant has a literal type discriminator.
 */
type Result<T, E = Error> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: E };

/**
 * State machine using discriminated unions.
 */
type TransactionState =
    | { readonly status: 'unsigned'; readonly inputs: readonly Input[]; readonly outputs: readonly Output[] }
    | { readonly status: 'partially_signed'; readonly inputs: readonly Input[]; readonly outputs: readonly Output[]; readonly signatures: readonly Signature[] }
    | { readonly status: 'fully_signed'; readonly raw: Uint8Array; readonly txid: TxId }
    | { readonly status: 'broadcast'; readonly raw: Uint8Array; readonly txid: TxId; readonly broadcastTime: Date }
    | { readonly status: 'confirmed'; readonly raw: Uint8Array; readonly txid: TxId; readonly blockHash: BlockHash; readonly confirmations: number };

/**
 * Exhaustive switch handling.
 */
function processTransaction(tx: TransactionState): string {
    switch (tx.status) {
        case 'unsigned':
            return 'Transaction needs signatures';
        case 'partially_signed':
            return `Transaction has ${tx.signatures.length} signatures`;
        case 'fully_signed':
            return `Ready to broadcast: ${tx.txid}`;
        case 'broadcast':
            return `Waiting for confirmation since ${tx.broadcastTime}`;
        case 'confirmed':
            return `Confirmed with ${tx.confirmations} confirmations`;
        default:
            // Exhaustiveness check - if we miss a case, this errors
            const _exhaustive: never = tx;
            throw new Error(`Unknown status: ${_exhaustive}`);
    }
}

/**
 * Literal union for constrained strings.
 */
type Direction = 'north' | 'south' | 'east' | 'west';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;
```

All union members should be distinguishable through type narrowing. Discriminated unions with a literal `type`, `kind`, or `status` field are strongly preferred.

### 1.4.1a Export Each Variant Separately

ALWAYS export each variant of a discriminated union as a separate named interface. Inline union members are impossible to reuse, impossible to import individually, and impossible to extend. Every variant must be independently importable.

```typescript
// CORRECT - reusable, importable, extendable
export interface Success<T> {
    readonly success: true;
    readonly value: T;
}

export interface Failure<E> {
    readonly success: false;
    readonly error: E;
}

export type Result<T, E = Error> = Success<T> | Failure<E>;

// FORBIDDEN - inline variants, no reuse possible
type Result<T, E> = { success: true; value: T } | { success: false; error: E };
// Cannot import Success or Failure individually
// Cannot extend Success with additional fields
// Cannot use Success as a parameter type
```

### 1.4.1b Named Return Types

Always define named types or interfaces for return types. Never return inline objects. Named types are documentable, importable, and refactorable. When a function returns a complex object, that object deserves a name.

```typescript
// FORBIDDEN - inline return type, undocumented, unreusable
function analyze(tx: Transaction): { readonly fee: bigint; readonly size: number; readonly rate: bigint } {
    // ...
}

// CORRECT - named return type
interface TransactionAnalysis {
    readonly fee: bigint;
    readonly size: number;
    readonly rate: bigint;
}

function analyze(tx: Transaction): TransactionAnalysis {
    // ...
}

// Now consumers can import and use the return type
import type { TransactionAnalysis } from './analysis.js';

function formatAnalysis(analysis: TransactionAnalysis): string {
    return `Fee: ${analysis.fee}, Size: ${analysis.size}, Rate: ${analysis.rate}`;
}
```

### 1.4.2 Intersection Types

Intersection types combine multiple types into one. The result has all properties from all types.

```typescript
/**
 * Combine interfaces with intersection.
 */
type Timestamped = {
    readonly createdAt: Date;
    readonly updatedAt: Date;
};

type Identifiable = {
    readonly id: string;
};

type SoftDeletable = {
    readonly deletedAt: Date | null;
    readonly isDeleted: boolean;
};

type Entity = Timestamped & Identifiable;
type DeletableEntity = Entity & SoftDeletable;

/**
 * Add metadata to any type.
 */
type WithMetadata<T> = T & {
    readonly metadata: Readonly<Record<string, string>>;
};

type WithValidation<T> = T & {
    readonly isValid: boolean;
    readonly validationErrors: readonly string[];
};

/**
 * Combining function types.
 */
type Logger = {
    (message: string): void;
    readonly level: LogLevel;
};

type TimestampedLogger = Logger & {
    readonly startTime: Date;
};
```

Avoid deep intersections that create impossible types. Intersection of incompatible types produces `never`:

```typescript
type Impossible = { readonly a: string } & { readonly a: number };
// Property 'a' is string & number = never
```

### 1.4.3 Mapped Types

Mapped types transform existing types by iterating over their keys.

```typescript
/**
 * Built-in mapped types reimplemented for understanding.
 */

// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties required
type Required<T> = {
    [P in keyof T]-?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

// Remove readonly from all properties
type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

/**
 * Advanced mapped types.
 */

// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Make specific properties readonly
type ReadonlyBy<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

/**
 * Key remapping (TypeScript 4.1+).
 */

// Create getters for all properties
type Getters<T> = {
    [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

// Create setters for all properties
type Setters<T> = {
    [P in keyof T as `set${Capitalize<string & P>}`]: (value: T[P]) => void;
};

// Filter keys by value type
type StringKeys<T> = {
    [P in keyof T as T[P] extends string ? P : never]: T[P];
};

type FunctionKeys<T> = {
    [P in keyof T as T[P] extends (...args: readonly unknown[]) => unknown ? P : never]: T[P];
};

// Remove keys matching a pattern
type OmitMethods<T> = {
    [P in keyof T as T[P] extends (...args: readonly unknown[]) => unknown ? never : P]: T[P];
};

/**
 * Deep mapped types.
 */

type DeepReadonly<T> = T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

type DeepPartial<T> = T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

type DeepRequired<T> = T extends object
    ? { [P in keyof T]-?: DeepRequired<T[P]> }
    : T;

type DeepMutable<T> = T extends object
    ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
    : T;
```

### 1.4.4 Conditional Types

Conditional types select one of two types based on a condition.

```typescript
/**
 * Basic conditional types.
 */

// Check if type is string
type IsString<T> = T extends string ? true : false;

// Check if type is array
type IsArray<T> = T extends readonly unknown[] ? true : false;

// Check if type is function
type IsFunction<T> = T extends (...args: readonly unknown[]) => unknown ? true : false;

/**
 * Distributive conditional types.
 * When T is a union, the conditional distributes over each member.
 */

// Remove null and undefined from union
type NonNullable<T> = T extends null | undefined ? never : T;

// Extract types that extend U
type Extract<T, U> = T extends U ? T : never;

// Exclude types that extend U
type Exclude<T, U> = T extends U ? never : T;

/**
 * Type inference with infer.
 */

// Extract return type of function
type ReturnType<T> = T extends (...args: readonly unknown[]) => infer R ? R : never;

// Extract parameter types
type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

// Extract first parameter
type FirstParameter<T> = T extends (first: infer F, ...args: readonly unknown[]) => unknown ? F : never;

// Extract array element type
type ElementType<T> = T extends readonly (infer E)[] ? E : never;

// Unwrap Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Extract constructor instance type
type InstanceType<T> = T extends new (...args: readonly unknown[]) => infer R ? R : never;

// Extract constructor parameters
type ConstructorParameters<T> = T extends new (...args: infer P) => unknown ? P : never;

/**
 * Complex conditional types.
 */

// Get type name as string literal
type TypeName<T> =
    T extends string ? 'string' :
    T extends number ? 'number' :
    T extends boolean ? 'boolean' :
    T extends undefined ? 'undefined' :
    T extends null ? 'null' :
    T extends readonly unknown[] ? 'array' :
    T extends (...args: readonly unknown[]) => unknown ? 'function' :
    T extends object ? 'object' :
    'unknown';

// Make properties nullable
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};

// Get keys of specific value type
type KeysOfType<T, V> = {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
```

### 1.4.5 Template Literal Types

Template literal types combine literal types with string interpolation.

```typescript
/**
 * Basic template literals.
 */
type EventName<T extends string> = `on${Capitalize<T>}`;
// EventName<'click'> = 'onClick'

type Getter<T extends string> = `get${Capitalize<T>}`;
type Setter<T extends string> = `set${Capitalize<T>}`;

/**
 * Constrained string patterns.
 */
type HexColor = `#${string}`;
type CSSLength = `${number}${'px' | 'em' | 'rem' | '%' | 'vh' | 'vw'}`;
type SemVer = `${number}.${number}.${number}`;
type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Bitcoin-specific patterns.
 */
type Bech32Address = `bc1q${string}` | `bc1p${string}`;
type Bech32TestnetAddress = `tb1q${string}` | `tb1p${string}`;
type LegacyAddress = `1${string}` | `3${string}`;
type TestnetLegacyAddress = `m${string}` | `n${string}` | `2${string}`;

type BitcoinAddress = Bech32Address | LegacyAddress;
type TestnetAddress = Bech32TestnetAddress | TestnetLegacyAddress;

/**
 * API route patterns.
 */
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type APIEndpoint = `/${string}`;
type APIRoute = `${HTTPMethod} ${APIEndpoint}`;

/**
 * Intrinsic string manipulation types.
 */
type Upper = Uppercase<'hello'>;      // 'HELLO'
type Lower = Lowercase<'HELLO'>;      // 'hello'
type Cap = Capitalize<'hello'>;       // 'Hello'
type Uncap = Uncapitalize<'Hello'>;   // 'hello'

/**
 * Complex template patterns.
 */
type PropEventSource<T> = {
    [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K]) => void;
};

interface Person {
    readonly name: string;
    readonly age: number;
}

type PersonEvents = PropEventSource<Person>;
// {
//     onNameChange: (newValue: string) => void;
//     onAgeChange: (newValue: number) => void;
// }
```

### 1.4.6 Infer Keyword

The `infer` keyword extracts types from within conditional types.

```typescript
/**
 * Extract various type components.
 */

// Get return type
type ReturnType<T> = T extends (...args: readonly unknown[]) => infer R ? R : never;

// Get all parameter types as tuple
type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

// Get first parameter
type FirstParam<T> = T extends (arg: infer P, ...rest: readonly unknown[]) => unknown ? P : never;

// Get last parameter (recursive)
type LastParam<T> = T extends (arg: infer P) => unknown
    ? P
    : T extends (arg: unknown, ...rest: infer R) => unknown
        ? LastParam<(...args: R) => unknown>
        : never;

// Extract promise value
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

// Extract array element
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Extract Map key and value
type MapKey<T> = T extends Map<infer K, unknown> ? K : never;
type MapValue<T> = T extends Map<unknown, infer V> ? V : never;

// Extract Set element
type SetElement<T> = T extends Set<infer E> ? E : never;

/**
 * Multiple infers in one conditional.
 */
type FunctionParts<T> = T extends (...args: infer A) => infer R
    ? { readonly args: A; readonly return: R }
    : never;

type AsyncFunctionParts<T> = T extends (...args: infer A) => Promise<infer R>
    ? { readonly args: A; readonly asyncReturn: R }
    : never;

/**
 * Infer in template literals.
 */
type ExtractRouteParams<T extends string> = 
    T extends `${string}:${infer Param}/${infer Rest}`
        ? Param | ExtractRouteParams<Rest>
        : T extends `${string}:${infer Param}`
            ? Param
            : never;

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

### 1.4.7 Recursive Types

Types can reference themselves for recursive structures.

```typescript
/**
 * JSON type - recursive union.
 */
type JSON =
    | string
    | number
    | boolean
    | null
    | readonly JSON[]
    | { readonly [key: string]: JSON };

/**
 * Tree structures.
 */
interface TreeNode<T> {
    readonly value: T;
    readonly children: readonly TreeNode<T>[];
}

interface BinaryTreeNode<T> {
    readonly value: T;
    readonly left: BinaryTreeNode<T> | null;
    readonly right: BinaryTreeNode<T> | null;
}

/**
 * Linked list.
 */
interface LinkedListNode<T> {
    readonly value: T;
    readonly next: LinkedListNode<T> | null;
}

/**
 * Deep utility types (recursive).
 */
type DeepReadonly<T> = T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

type DeepPartial<T> = T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

type DeepRequired<T> = T extends object
    ? { [P in keyof T]-?: DeepRequired<T[P]> }
    : T;

/**
 * Path types for nested property access.
 */
type Path<T, K extends keyof T = keyof T> = K extends string
    ? T[K] extends object
        ? `${K}.${Path<T[K]>}` | K
        : K
    : never;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? PathValue<T[K], Rest>
        : never
    : P extends keyof T
        ? T[P]
        : never;

// Usage
interface Config {
    readonly database: {
        readonly host: string;
        readonly port: number;
    };
    readonly server: {
        readonly port: number;
    };
}

type ConfigPath = Path<Config>;
// 'database' | 'database.host' | 'database.port' | 'server' | 'server.port'

type HostType = PathValue<Config, 'database.host'>;
// string

/**
 * Flatten nested arrays.
 */
type Flatten<T> = T extends readonly (infer E)[]
    ? Flatten<E>
    : T;

type Nested = readonly [1, readonly [2, readonly [3, 4]]];
type Flat = Flatten<Nested>; // 1 | 2 | 3 | 4
```

---

## 1.6 Class Law

### 1.5.1 Class Structure Requirements

Every class must follow this exact structure, in this exact order:

1. Static private fields (`static #field`)
2. Static public fields (`static readonly field`)
3. Static initialization blocks (`static { }`)
4. Private instance fields (`#field`)
5. Protected instance fields (`protected readonly field`)
6. Public readonly instance fields (`readonly field`)
7. Public mutable instance fields (minimize these)
8. Constructor
9. Static factory methods
10. Public getters/setters
11. Public methods
12. Protected methods
13. Private methods (`#method()`)

```typescript
/**
 * Example class following the structure requirements.
 */
class TransactionBuilder {
    // 1. Static private fields
    static #instanceCount = 0;
    static #registry = new Map<string, TransactionBuilder>();
    
    // 2. Static public fields
    static readonly VERSION = 2;
    static readonly DEFAULT_SEQUENCE = 0xffffffff;
    static readonly MAX_INPUTS = 100;
    
    // 3. Static initialization blocks
    static {
        // Validate configuration
        if (this.MAX_INPUTS > 1000) {
            throw new Error('MAX_INPUTS too high');
        }
        // Freeze class to prevent modification
        Object.freeze(this);
        Object.freeze(this.prototype);
    }
    
    // 4. Private instance fields
    readonly #id: string;
    readonly #inputs: Input[] = [];
    readonly #outputs: Output[] = [];
    #version: number;
    #locktime: number;
    
    // 5. Protected instance fields (avoid when possible)
    protected readonly config: BuilderConfig;
    
    // 6. Public readonly instance fields
    readonly network: Network;
    readonly createdAt: Date;
    
    // 7. Public mutable instance fields (minimize)
    // Avoid these when possible
    
    // 8. Constructor
    constructor(network: Network, config: BuilderConfig = BuilderConfig.default()) {
        this.#id = crypto.randomUUID();
        this.#version = TransactionBuilder.VERSION;
        this.#locktime = 0;
        this.config = config;
        this.network = network;
        this.createdAt = new Date();
        
        TransactionBuilder.#instanceCount++;
        TransactionBuilder.#registry.set(this.#id, this);
    }
    
    // 9. Static factory methods
    static create(network: Network): TransactionBuilder {
        return new TransactionBuilder(network);
    }
    
    static fromHex(hex: string, network: Network): TransactionBuilder {
        const builder = new TransactionBuilder(network);
        builder.#parseHex(hex);
        return builder;
    }
    
    static getInstanceCount(): number {
        return this.#instanceCount;
    }
    
    // 10. Public getters/setters
    get id(): string {
        return this.#id;
    }
    
    get version(): number {
        return this.#version;
    }
    
    set version(v: number) {
        if (v < 1 || v > 2) {
            throw new RangeError('Version must be 1 or 2');
        }
        this.#version = v;
    }
    
    get inputCount(): number {
        return this.#inputs.length;
    }
    
    get outputCount(): number {
        return this.#outputs.length;
    }
    
    // 11. Public methods
    addInput(input: Input): this {
        this.#validateInput(input);
        this.#inputs.push(input);
        return this;
    }
    
    addOutput(output: Output): this {
        this.#validateOutput(output);
        this.#outputs.push(output);
        return this;
    }
    
    build(): Transaction {
        this.#validateTransaction();
        return this.#createTransaction();
    }
    
    toHex(): string {
        return this.#serialize().toString('hex');
    }
    
    // 12. Protected methods
    protected validateConfig(): boolean {
        return this.config.isValid();
    }
    
    protected getInputs(): readonly Input[] {
        return this.#inputs;
    }
    
    // 13. Private methods
    #validateInput(input: Input): void {
        if (!input.txid || input.txid.length !== 32) {
            throw new ValidationError('Invalid input txid');
        }
    }
    
    #validateOutput(output: Output): void {
        if (output.value < 0n) {
            throw new ValidationError('Output value cannot be negative');
        }
    }
    
    #validateTransaction(): void {
        if (this.#inputs.length === 0) {
            throw new ValidationError('Transaction must have at least one input');
        }
        if (this.#outputs.length === 0) {
            throw new ValidationError('Transaction must have at least one output');
        }
    }
    
    #createTransaction(): Transaction {
        return new Transaction(
            this.#version,
            this.#inputs,
            this.#outputs,
            this.#locktime
        );
    }
    
    #serialize(): Uint8Array {
        // Serialization implementation
        return new Uint8Array();
    }
    
    #parseHex(hex: string): void {
        // Parsing implementation
    }
}
```

### 1.5.2 Property Initialization Order

All properties must be initialized in the constructor in declaration order. V8 creates hidden classes based on property initialization order. Inconsistent order creates multiple hidden classes, destroying performance.

Never add properties after construction. Never conditionally initialize properties. This breaks V8's hidden class optimization.

```typescript
// CORRECT: All properties initialized in order
class User {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: Role;
    readonly createdAt: Date;
    readonly metadata: Readonly<Record<string, string>>;
    
    constructor(
        id: string,
        name: string,
        email: string,
        role: Role = Role.User,
        metadata: Readonly<Record<string, string>> = {}
    ) {
        // Initialize in declaration order
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.createdAt = new Date();
        this.metadata = metadata;
    }
}

// INCORRECT: Conditional initialization breaks hidden classes
class BadUser {
    readonly id: string;
    readonly name: string;
    readonly email?: string;  // Optional creates different shapes
    
    constructor(id: string, name: string, email?: string) {
        this.id = id;
        this.name = name;
        if (email) {
            this.email = email; // Shape change mid-construction!
        }
    }
}

// CORRECT: Always initialize, use null for "no value"
class GoodUser {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;  // Explicit null, always present
    
    constructor(id: string, name: string, email: string | null = null) {
        this.id = id;
        this.name = name;
        this.email = email;  // Always initialized
    }
}
```

### 1.5.3 Private Fields

Use `#privateFields` for true runtime encapsulation. Unlike TypeScript's `private` keyword which is compile-time only, `#` fields are enforced at runtime by the JavaScript engine. They cannot be accessed outside the class, not through reflection, not through `Reflect.ownKeys`, not through any mechanism.

```typescript
class Wallet {
    // True private - inaccessible from outside
    readonly #privateKey: Uint8Array;
    #balance: bigint;
    
    constructor(privateKey: Uint8Array) {
        if (privateKey.length !== 32) {
            throw new Error('Private key must be 32 bytes');
        }
        this.#privateKey = privateKey;
        this.#balance = 0n;
    }
    
    // Brand check using private field
    // This is the only way to verify genuine instances
    static isWallet(value: unknown): value is Wallet {
        try {
            return #privateKey in (value as Wallet);
        } catch {
            return false;
        }
    }
    
    get balance(): bigint {
        return this.#balance;
    }
    
    // Private methods
    #derivePublicKey(): Uint8Array {
        // Derivation using #privateKey
        return new Uint8Array(33);
    }
    
    #updateBalance(amount: bigint): void {
        this.#balance += amount;
    }
    
    getAddress(): string {
        const pubkey = this.#derivePublicKey();
        // Address derivation
        return '';
    }
}

// Private fields are invisible
const wallet = new Wallet(new Uint8Array(32));
Object.keys(wallet);                    // []
Object.getOwnPropertyNames(wallet);     // []
Reflect.ownKeys(wallet);                // []
JSON.stringify(wallet);                 // '{}'

// wallet.#privateKey                   // SyntaxError: Private field
// wallet['#privateKey']                // undefined (different property)
```

Never use TypeScript's `private` keyword for sensitive data. It provides no runtime protection:

```typescript
// BAD: TypeScript private is compile-time only
class BadWallet {
    private privateKey: Uint8Array;  // NOT actually private!
    
    constructor(key: Uint8Array) {
        this.privateKey = key;
    }
}

const bad = new BadWallet(new Uint8Array(32));
(bad as any).privateKey;  // Accessible!
bad['privateKey'];        // Accessible!
```

### 1.5.4 Static Members

Static members belong to the class itself, not instances. Use static private fields for class-level state that shouldn't be accessible outside.

```typescript
class ConnectionPool {
    // Static private state
    static #instances = new Map<string, ConnectionPool>();
    static #maxPoolSize = 10;
    static #connectionCount = 0;
    
    // Static public constants
    static readonly DEFAULT_TIMEOUT = 30000;
    static readonly MAX_RETRIES = 3;
    
    // Static initialization
    static {
        // Load configuration
        const envMax = process.env.MAX_POOL_SIZE;
        if (envMax) {
            const parsed = parseInt(envMax, 10);
            if (!isNaN(parsed) && parsed > 0) {
                this.#maxPoolSize = parsed;
            }
        }
        
        // Freeze to prevent modification
        Object.freeze(this);
    }
    
    // Static factory
    static getInstance(name: string): ConnectionPool {
        let instance = this.#instances.get(name);
        if (!instance) {
            instance = new ConnectionPool(name);
            this.#instances.set(name, instance);
        }
        return instance;
    }
    
    static getConnectionCount(): number {
        return this.#connectionCount;
    }
    
    // Instance members
    readonly #name: string;
    readonly #connections: Connection[] = [];
    
    private constructor(name: string) {
        this.#name = name;
    }
    
    acquire(): Connection {
        ConnectionPool.#connectionCount++;
        // ... implementation
        return new Connection();
    }
    
    release(connection: Connection): void {
        ConnectionPool.#connectionCount--;
        // ... implementation
    }
}
```

### 1.5.5 Abstract Classes

Abstract classes define contracts that subclasses must implement. They cannot be instantiated directly.

```typescript
/**
 * Abstract base for serializable objects.
 */
abstract class Serializable {
    /**
     * Serialize to bytes. Must be implemented by subclasses.
     */
    abstract serialize(): Uint8Array;
    
    /**
     * Deserialize from bytes. Must be implemented by subclasses.
     */
    abstract deserialize(data: Uint8Array): void;
    
    /**
     * Get the serialized byte length. Must be implemented by subclasses.
     */
    abstract get byteLength(): number;
    
    /**
     * Concrete method using abstract methods.
     * Subclasses inherit this implementation.
     */
    clone(): this {
        const data = this.serialize();
        const instance = Object.create(Object.getPrototypeOf(this)) as this;
        instance.deserialize(data);
        return instance;
    }
    
    /**
     * Concrete method for hex conversion.
     */
    toHex(): string {
        const bytes = this.serialize();
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Compare serialized forms.
     */
    equals(other: Serializable): boolean {
        const a = this.serialize();
        const b = other.serialize();
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
}

/**
 * Concrete implementation.
 */
class Transaction extends Serializable {
    readonly #version: number;
    readonly #inputs: readonly Input[];
    readonly #outputs: readonly Output[];
    readonly #locktime: number;
    #cachedBytes: Uint8Array | null = null;
    
    constructor(
        version: number,
        inputs: readonly Input[],
        outputs: readonly Output[],
        locktime: number
    ) {
        super();
        this.#version = version;
        this.#inputs = inputs;
        this.#outputs = outputs;
        this.#locktime = locktime;
    }
    
    override serialize(): Uint8Array {
        if (this.#cachedBytes) {
            return this.#cachedBytes;
        }
        // Serialization implementation
        const bytes = new Uint8Array(this.byteLength);
        // ... fill bytes
        this.#cachedBytes = bytes;
        return bytes;
    }
    
    override deserialize(data: Uint8Array): void {
        // Parsing implementation
    }
    
    override get byteLength(): number {
        // Calculate byte length
        return 0;
    }
}
```

### 1.5.6 Class Extension Rules

Class extension must follow these rules:

1. Call `super()` before accessing `this` in constructor
2. Don't override methods unless necessary
3. Use `override` keyword for all overrides
4. Maintain Liskov Substitution Principle (subtypes must be substitutable for base types)
5. Prefer composition over inheritance when possible

```typescript
class Animal {
    readonly name: string;
    readonly birthDate: Date;
    
    constructor(name: string) {
        this.name = name;
        this.birthDate = new Date();
    }
    
    speak(): string {
        return `${this.name} makes a sound`;
    }
    
    getAge(): number {
        return Date.now() - this.birthDate.getTime();
    }
}

class Dog extends Animal {
    readonly breed: string;
    readonly isGoodBoy: boolean;
    
    constructor(name: string, breed: string) {
        super(name);  // Must be first
        this.breed = breed;
        this.isGoodBoy = true;  // Always true
    }
    
    // MUST use override keyword
    override speak(): string {
        return `${this.name} barks!`;
    }
    
    // Dog-specific method
    fetch(): string {
        return `${this.name} fetches the ball`;
    }
}

class Cat extends Animal {
    readonly indoor: boolean;
    
    constructor(name: string, indoor: boolean = true) {
        super(name);
        this.indoor = indoor;
    }
    
    override speak(): string {
        return `${this.name} meows`;
    }
    
    // Cat-specific method
    ignore(): string {
        return `${this.name} ignores you completely`;
    }
}

// Liskov Substitution - works with any Animal
function makeSpeak(animal: Animal): string {
    return animal.speak();  // Works with Dog, Cat, or any Animal
}
```

### 1.5.7 Interface Implementation

Classes implement interfaces using the `implements` keyword. Multiple interfaces can be implemented.

```typescript
interface Hashable {
    hash(): Uint8Array;
    readonly hashAlgorithm: string;
}

interface Comparable<T> {
    compareTo(other: T): number;
    equals(other: T): boolean;
}

interface Cloneable<T> {
    clone(): T;
}

interface Disposable {
    [Symbol.dispose](): void;
    readonly disposed: boolean;
}

/**
 * Transaction implements multiple interfaces.
 */
class Transaction implements Hashable, Comparable<Transaction>, Cloneable<Transaction>, Disposable {
    readonly #data: Uint8Array;
    #disposed = false;
    #cachedHash: Uint8Array | null = null;
    
    constructor(data: Uint8Array) {
        this.#data = data;
    }
    
    // Hashable implementation
    get hashAlgorithm(): string {
        return 'sha256d';
    }
    
    hash(): Uint8Array {
        if (!this.#cachedHash) {
            // Double SHA256
            this.#cachedHash = sha256(sha256(this.#data));
        }
        return this.#cachedHash;
    }
    
    // Comparable implementation
    compareTo(other: Transaction): number {
        const thisHash = this.hash();
        const otherHash = other.hash();
        for (let i = 0; i < 32; i++) {
            if (thisHash[i] < otherHash[i]) return -1;
            if (thisHash[i] > otherHash[i]) return 1;
        }
        return 0;
    }
    
    equals(other: Transaction): boolean {
        return this.compareTo(other) === 0;
    }
    
    // Cloneable implementation
    clone(): Transaction {
        return new Transaction(this.#data.slice());
    }
    
    // Disposable implementation
    get disposed(): boolean {
        return this.#disposed;
    }
    
    [Symbol.dispose](): void {
        if (!this.#disposed) {
            this.#disposed = true;
            this.#cachedHash = null;
            // Release resources
        }
    }
}
```

### 1.5.8 Mixins

Mixins add functionality to classes without inheritance hierarchies. Use when you need to compose behaviors from multiple sources.

```typescript
/**
 * Constructor type for mixin targets.
 */
type Constructor<T = object> = new (...args: readonly unknown[]) => T;

/**
 * Timestamped mixin - adds creation and update timestamps.
 */
function Timestamped<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        readonly createdAt = new Date();
        updatedAt = new Date();
        
        touch(): void {
            this.updatedAt = new Date();
        }
    };
}

/**
 * Tagged mixin - adds tagging functionality.
 */
function Tagged<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        readonly #tags = new Set<string>();
        
        addTag(tag: string): void {
            this.#tags.add(tag.toLowerCase());
        }
        
        removeTag(tag: string): void {
            this.#tags.delete(tag.toLowerCase());
        }
        
        hasTag(tag: string): boolean {
            return this.#tags.has(tag.toLowerCase());
        }
        
        get tags(): readonly string[] {
            return [...this.#tags];
        }
    };
}

/**
 * Validatable mixin - adds validation support.
 */
function Validatable<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        #validationErrors: string[] = [];
        
        get isValid(): boolean {
            return this.#validationErrors.length === 0;
        }
        
        get validationErrors(): readonly string[] {
            return this.#validationErrors;
        }
        
        protected addError(error: string): void {
            this.#validationErrors.push(error);
        }
        
        protected clearErrors(): void {
            this.#validationErrors = [];
        }
    };
}

/**
 * Base entity class.
 */
class BaseEntity {
    readonly id: string = crypto.randomUUID();
}

/**
 * Compose mixins.
 */
const TimestampedTaggedEntity = Tagged(Timestamped(BaseEntity));
const ValidatableEntity = Validatable(Timestamped(BaseEntity));

/**
 * Use composed class.
 */
class Document extends TimestampedTaggedEntity {
    readonly title: string;
    readonly content: string;
    
    constructor(title: string, content: string) {
        super();
        this.title = title;
        this.content = content;
    }
}

const doc = new Document('My Document', 'Content here');
doc.addTag('important');
doc.touch();
console.log(doc.createdAt, doc.updatedAt, doc.tags);
```

### 1.5.9 Static Initialization Blocks

Static initialization blocks run once when the class is evaluated. Use for complex static initialization that requires logic.

```typescript
class Protocol {
    // Static private fields initialized by static block
    static readonly #opcodeMap: ReadonlyMap<number, string>;
    static readonly #nameMap: ReadonlyMap<string, number>;
    static readonly #validOpcodes: ReadonlySet<number>;
    
    // Static public constants
    static readonly VERSION = 1;
    static readonly MAX_SCRIPT_SIZE = 10000;
    
    static {
        // Build lookup tables
        const opcodes: ReadonlyArray<readonly [number, string]> = [
            [0x00, 'OP_0'],
            [0x4c, 'OP_PUSHDATA1'],
            [0x4d, 'OP_PUSHDATA2'],
            [0x4e, 'OP_PUSHDATA4'],
            [0x4f, 'OP_1NEGATE'],
            [0x51, 'OP_1'],
            [0x52, 'OP_2'],
            [0x53, 'OP_3'],
            [0x60, 'OP_16'],
            [0x61, 'OP_NOP'],
            [0x63, 'OP_IF'],
            [0x64, 'OP_NOTIF'],
            [0x67, 'OP_ELSE'],
            [0x68, 'OP_ENDIF'],
            [0x69, 'OP_VERIFY'],
            [0x6a, 'OP_RETURN'],
            [0x76, 'OP_DUP'],
            [0x87, 'OP_EQUAL'],
            [0x88, 'OP_EQUALVERIFY'],
            [0xa9, 'OP_HASH160'],
            [0xaa, 'OP_HASH256'],
            [0xac, 'OP_CHECKSIG'],
            [0xad, 'OP_CHECKSIGVERIFY'],
            [0xae, 'OP_CHECKMULTISIG'],
        ];
        
        const opcodeMap = new Map<number, string>();
        const nameMap = new Map<string, number>();
        const validOpcodes = new Set<number>();
        
        for (const [code, name] of opcodes) {
            opcodeMap.set(code, name);
            nameMap.set(name, code);
            validOpcodes.add(code);
        }
        
        this.#opcodeMap = opcodeMap;
        this.#nameMap = nameMap;
        this.#validOpcodes = validOpcodes;
        
        // Freeze class after initialization
        Object.freeze(this);
        Object.freeze(this.prototype);
    }
    
    static getOpcodeName(code: number): string | undefined {
        return this.#opcodeMap.get(code);
    }
    
    static getOpcodeValue(name: string): number | undefined {
        return this.#nameMap.get(name);
    }
    
    static isValidOpcode(code: number): boolean {
        return this.#validOpcodes.has(code);
    }
}
```

### 1.5.10 Decorators

Decorators modify class elements. Use for cross-cutting concerns like memoization, logging, validation, and dependency injection.

```typescript
/**
 * Method decorator for memoization.
 */
function memoize<This, Args extends readonly unknown[], Return>(
    target: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
): (this: This, ...args: Args) => Return {
    const cache = new Map<string, Return>();
    
    return function (this: This, ...args: Args): Return {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const result = target.call(this, ...args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Method decorator for timing.
 */
function timed<This, Args extends readonly unknown[], Return>(
    target: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
): (this: This, ...args: Args) => Return {
    const methodName = String(context.name);
    
    return function (this: This, ...args: Args): Return {
        const start = performance.now();
        const result = target.call(this, ...args);
        const end = performance.now();
        console.log(`${methodName} took ${end - start}ms`);
        return result;
    };
}

/**
 * Class decorator to seal.
 */
function sealed(
    target: Function,
    context: ClassDecoratorContext
): void {
    context.addInitializer(function () {
        Object.seal(this);
        Object.seal(this.prototype);
    });
}

/**
 * Class decorator to freeze.
 */
function frozen(
    target: Function,
    context: ClassDecoratorContext
): void {
    context.addInitializer(function () {
        Object.freeze(this);
        Object.freeze(this.prototype);
    });
}

/**
 * Field decorator for validation.
 */
function nonNegative<This, Value extends number>(
    target: undefined,
    context: ClassFieldDecoratorContext<This, Value>
): (initialValue: Value) => Value {
    return function (initialValue: Value): Value {
        if (initialValue < 0) {
            throw new RangeError(`${String(context.name)} cannot be negative`);
        }
        return initialValue;
    };
}

/**
 * Example usage.
 */
@frozen
class Calculator {
    @memoize
    fibonacci(n: number): number {
        if (n <= 1) return n;
        return this.fibonacci(n - 1) + this.fibonacci(n - 2);
    }
    
    @timed
    heavyComputation(iterations: number): number {
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i);
        }
        return result;
    }
}
```

---

## 1.7 Generic Law

### 1.6.1 Generic Constraints

Constrain generics to ensure type safety and enable operations.

```typescript
/**
 * Extends constraint - T must have specific properties.
 */
function getLength<T extends { readonly length: number }>(item: T): number {
    return item.length;
}

getLength('hello');           // OK - string has length
getLength([1, 2, 3]);         // OK - array has length
getLength({ length: 10 });    // OK - object has length
// getLength(42);             // Error - number has no length

/**
 * Key constraint - K must be a key of T.
 */
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { name: 'Alice', age: 30 };
getProperty(user, 'name');    // OK - 'name' is key of user
getProperty(user, 'age');     // OK - 'age' is key of user
// getProperty(user, 'email'); // Error - 'email' not in user

/**
 * Multiple constraints with intersection.
 */
interface Identifiable {
    readonly id: string;
}

interface Timestamped {
    readonly createdAt: Date;
}

function process<T extends Identifiable & Timestamped>(entity: T): string {
    return `${entity.id} created at ${entity.createdAt}`;
}

/**
 * Constructor constraint.
 */
function createInstance<T>(
    ctor: new () => T
): T {
    return new ctor();
}

/**
 * Constructor with args constraint.
 */
function createWithArgs<T, Args extends readonly unknown[]>(
    ctor: new (...args: Args) => T,
    ...args: Args
): T {
    return new ctor(...args);
}

/**
 * Function constraint.
 */
function callWithLogging<T extends (...args: readonly unknown[]) => unknown>(
    fn: T,
    ...args: Parameters<T>
): ReturnType<T> {
    console.log(`Calling with args:`, args);
    return fn(...args) as ReturnType<T>;
}
```

### 1.6.2 Generic Defaults

Provide default type parameters for optional generics.

```typescript
/**
 * Default type parameters.
 */
interface Response<T = unknown, E extends Error = Error> {
    readonly data?: T;
    readonly error?: E;
    readonly status: number;
}

// Usage - defaults applied
const response1: Response = { status: 200 };  // T = unknown, E = Error
const response2: Response<string> = { data: 'hello', status: 200 };
const response3: Response<number, TypeError> = { status: 500 };

/**
 * Container with default.
 */
class Container<T = unknown> {
    readonly #value: T;
    
    constructor(value: T) {
        this.#value = value;
    }
    
    get value(): T {
        return this.#value;
    }
    
    map<U>(fn: (value: T) => U): Container<U> {
        return new Container(fn(this.#value));
    }
}

const container1 = new Container(42);      // T inferred as number
const container2 = new Container<string>('hello');  // T explicit
const container3: Container = new Container(null);  // T = unknown

/**
 * Multiple defaults with dependencies.
 */
interface Repository<
    T extends Entity,
    ID = string,
    Query = Partial<T>
> {
    findById(id: ID): Promise<T | null>;
    find(query: Query): Promise<readonly T[]>;
    save(entity: T): Promise<T>;
    delete(id: ID): Promise<boolean>;
}
```

### 1.6.3 Generic Inference

Let TypeScript infer generic types when possible. Use `NoInfer<T>` to control inference location.

```typescript
/**
 * TypeScript infers T from usage.
 */
function identity<T>(value: T): T {
    return value;
}

const str = identity('hello');  // T inferred as 'hello' (literal type)
const num = identity(42);       // T inferred as 42 (literal type)

// Explicit when you need wider type
const strWide = identity<string>('hello');  // T is string, not 'hello'

/**
 * Inference from multiple arguments.
 */
function merge<T, U>(a: T, b: U): T & U {
    return { ...a, ...b };
}

const merged = merge({ a: 1 }, { b: 2 });
// Type: { a: number } & { b: number }

/**
 * NoInfer to control inference location.
 */
function createState<T>(
    initial: T,
    validator: (value: NoInfer<T>) => boolean
): { value: T; isValid: boolean } {
    return {
        value: initial,
        isValid: validator(initial),
    };
}

// T inferred from first argument only, not from validator
const state = createState('hello', (v) => v.length > 0);
// Without NoInfer, T might be inferred as string | number if validator
// accepted numbers, causing confusion.

/**
 * Inference in callbacks.
 */
function processItems<T, R>(
    items: readonly T[],
    processor: (item: T, index: number) => R
): readonly R[] {
    return items.map(processor);
}

const results = processItems([1, 2, 3], (n) => n.toString());
// T inferred as number, R inferred as string
```

### 1.6.4 Variance Annotations

TypeScript 4.7+ supports explicit variance annotations for type parameters.

```typescript
/**
 * Covariant (out) - type only appears in output positions.
 * Can substitute with subtype.
 */
interface Producer<out T> {
    produce(): T;
    readonly current: T;
}

/**
 * Contravariant (in) - type only appears in input positions.
 * Can substitute with supertype.
 */
interface Consumer<in T> {
    consume(value: T): void;
    process(items: readonly T[]): void;
}

/**
 * Invariant (in out) - type appears in both positions.
 * Cannot substitute.
 */
interface Processor<in out T> {
    process(value: T): T;
    transform(value: T): T;
}

/**
 * Practical example - covariant container.
 */
interface ReadonlyBox<out T> {
    readonly value: T;
    map<U>(fn: (value: T) => U): ReadonlyBox<U>;
}

// Dog extends Animal
class Animal { name = 'animal'; }
class Dog extends Animal { breed = 'unknown'; }

// ReadonlyBox<Dog> is assignable to ReadonlyBox<Animal>
// because Dog is subtype of Animal and T is covariant
const dogBox: ReadonlyBox<Dog> = { value: new Dog(), map: (fn) => ({ value: fn(new Dog()), map: null as any }) };
const animalBox: ReadonlyBox<Animal> = dogBox;  // OK

/**
 * Contravariant example.
 */
interface Comparator<in T> {
    compare(a: T, b: T): number;
}

// Comparator<Animal> is assignable to Comparator<Dog>
// because Animal is supertype of Dog and T is contravariant
const animalComparator: Comparator<Animal> = {
    compare: (a, b) => a.name.localeCompare(b.name)
};
const dogComparator: Comparator<Dog> = animalComparator;  // OK
```

### 1.6.5 Higher-Kinded Type Patterns

TypeScript doesn't have true higher-kinded types, but patterns can simulate them.

```typescript
/**
 * Type-level function using interface augmentation.
 */
interface TypeMap {
    Array: unknown[];
    Promise: Promise<unknown>;
    Set: Set<unknown>;
    Map: Map<unknown, unknown>;
}

type Apply<F extends keyof TypeMap, A> = 
    F extends 'Array' ? A[] :
    F extends 'Promise' ? Promise<A> :
    F extends 'Set' ? Set<A> :
    F extends 'Map' ? Map<A, unknown> :
    never;

type StringArray = Apply<'Array', string>;  // string[]
type NumberPromise = Apply<'Promise', number>;  // Promise<number>

/**
 * Functor-like pattern.
 */
interface Mappable<F extends keyof TypeMap> {
    map<A, B>(fa: Apply<F, A>, f: (a: A) => B): Apply<F, B>;
}

const arrayMappable: Mappable<'Array'> = {
    map: (arr, f) => arr.map(f)
};

/**
 * HKT simulation using branded types.
 */
interface HKT<URI, A> {
    readonly _URI: URI;
    readonly _A: A;
}

interface URItoKind<A> {
    Array: A[];
    Option: Option<A>;
    Result: Result<A, Error>;
}

type Kind<URI extends keyof URItoKind<unknown>, A> = URItoKind<A>[URI];

/**
 * Functor interface.
 */
interface Functor<F extends keyof URItoKind<unknown>> {
    map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
}
```

---

## 1.8 Branded Types

### 1.7.1 Brand Definition

Branded types create nominal typing in TypeScript's structural type system. They prevent accidentally using one type where another is expected, even when the underlying types are identical.

```typescript
/**
 * The brand symbol - unique and not accessible outside types.
 */
declare const __brand: unique symbol;

/**
 * Brand utility type.
 * Intersects T with a phantom property that only exists in the type system.
 * @typeParam T - The underlying type
 * @typeParam B - The brand identifier string
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Common branded types for Bitcoin/crypto.
 */
type TxId = Brand<Uint8Array, 'TxId'>;
type BlockHash = Brand<Uint8Array, 'BlockHash'>;
type MerkleRoot = Brand<Uint8Array, 'MerkleRoot'>;
type ScriptPubKey = Brand<Uint8Array, 'ScriptPubKey'>;
type ScriptSig = Brand<Uint8Array, 'ScriptSig'>;
type WitnessStack = Brand<readonly Uint8Array[], 'WitnessStack'>;
type PrivateKey = Brand<Uint8Array, 'PrivateKey'>;
type PublicKey = Brand<Uint8Array, 'PublicKey'>;
type Signature = Brand<Uint8Array, 'Signature'>;
type Address = Brand<string, 'Address'>;

/**
 * Numeric branded types.
 * Use bigint for values that can be large or come from external systems.
 * Use number only for values bounded to stay small.
 */
type Satoshis = Brand<bigint, 'Satoshis'>;
type BlockHeight = Brand<bigint, 'BlockHeight'>;
type Timestamp = Brand<bigint, 'Timestamp'>;
type Confirmations = Brand<number, 'Confirmations'>;  // Always small
type VoutIndex = Brand<number, 'VoutIndex'>;          // Always small
type Sequence = Brand<number, 'Sequence'>;            // 32-bit field

/**
 * ID branded types.
 */
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type SessionId = Brand<string, 'SessionId'>;

/**
 * Validated string branded types.
 */
type Email = Brand<string, 'Email'>;
type URL = Brand<string, 'URL'>;
type UUID = Brand<string, 'UUID'>;
type HexString = Brand<string, 'HexString'>;
```

### 1.7.2 Brand Application

Apply brands through validated factory functions. Never cast directly without validation.

```typescript
/**
 * TxId factory - validates and brands.
 */
function createTxId(bytes: Uint8Array): TxId {
    if (bytes.length !== 32) {
        throw new ValidationError(`TxId must be 32 bytes, got ${bytes.length}`);
    }
    return bytes as TxId;
}

function txIdFromHex(hex: string): TxId {
    if (hex.length !== 64) {
        throw new ValidationError(`TxId hex must be 64 characters, got ${hex.length}`);
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
        throw new ValidationError('TxId hex contains invalid characters');
    }
    const bytes = hexToBytes(hex);
    return createTxId(bytes);
}

/**
 * Satoshis factory - validates amount constraints.
 */
const MAX_SATOSHIS = 2_100_000_000_000_000n;  // 21 million BTC

function createSatoshis(value: bigint): Satoshis {
    if (value < 0n) {
        throw new ValidationError('Satoshis cannot be negative');
    }
    if (value > MAX_SATOSHIS) {
        throw new ValidationError(`Satoshis exceeds maximum supply: ${value}`);
    }
    return value as Satoshis;
}

function satoshisFromBtc(btc: number): Satoshis {
    if (!Number.isFinite(btc)) {
        throw new ValidationError('BTC amount must be finite');
    }
    if (btc < 0) {
        throw new ValidationError('BTC amount cannot be negative');
    }
    // Convert to satoshis (1 BTC = 100,000,000 satoshis)
    const satoshis = BigInt(Math.round(btc * 100_000_000));
    return createSatoshis(satoshis);
}

/**
 * Email factory - validates format.
 */
function createEmail(value: string): Email {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        throw new ValidationError(`Invalid email format: ${value}`);
    }
    return value.toLowerCase() as Email;
}

/**
 * BlockHeight factory.
 */
function createBlockHeight(value: bigint): BlockHeight {
    if (value < 0n) {
        throw new ValidationError('Block height cannot be negative');
    }
    return value as BlockHeight;
}

/**
 * Address factory with network validation.
 */
function createAddress(value: string, network: 'mainnet' | 'testnet'): Address {
    const isValid = network === 'mainnet'
        ? /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(value)
        : /^(tb1|[mn2])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(value);
    
    if (!isValid) {
        throw new ValidationError(`Invalid ${network} address: ${value}`);
    }
    return value as Address;
}
```

### 1.7.3 Brand Validation

Type guards for branded types allow safe narrowing.

```typescript
/**
 * Type guard for TxId.
 */
function isTxId(value: Uint8Array): value is TxId {
    return value.length === 32;
}

/**
 * Type guard for Satoshis.
 */
function isSatoshis(value: bigint): value is Satoshis {
    return value >= 0n && value <= MAX_SATOSHIS;
}

/**
 * Type guard for Email.
 */
function isEmail(value: string): value is Email {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Type guard for HexString.
 */
function isHexString(value: string): value is HexString {
    return /^[0-9a-fA-F]*$/.test(value) && value.length % 2 === 0;
}

/**
 * Assertion functions for branded types.
 */
function assertTxId(value: Uint8Array): asserts value is TxId {
    if (value.length !== 32) {
        throw new ValidationError(`Expected TxId (32 bytes), got ${value.length} bytes`);
    }
}

function assertSatoshis(value: bigint): asserts value is Satoshis {
    if (value < 0n) {
        throw new ValidationError('Satoshis cannot be negative');
    }
    if (value > MAX_SATOSHIS) {
        throw new ValidationError('Satoshis exceeds maximum supply');
    }
}

function assertEmail(value: string): asserts value is Email {
    if (!isEmail(value)) {
        throw new ValidationError(`Invalid email: ${value}`);
    }
}

/**
 * Usage example.
 */
function processTransaction(txid: TxId, amount: Satoshis): void {
    // Both parameters are validated by their types
    // Cannot accidentally pass a BlockHash where TxId is expected
    console.log(`Processing ${amount} satoshis for tx ${txidToHex(txid)}`);
}

// This would be a compile error:
// const blockHash: BlockHash = createBlockHash(someBytes);
// processTransaction(blockHash, amount);  // Error: BlockHash not assignable to TxId
```

---

## 1.9 Utility Types

### 1.9.1 Built-in Utility Types

Standard TypeScript utility types and their proper usage:

```typescript
/**
 * Partial<T> - Makes all properties optional.
 */
interface User {
    readonly id: string;
    readonly name: string;
    readonly email: string;
}

type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string; }

// Use for update operations where any subset of properties can change
function updateUser(id: string, updates: Partial<User>): User {
    // ...
}

/**
 * Required<T> - Makes all properties required.
 */
interface Config {
    host?: string;
    port?: number;
    ssl?: boolean;
}

type RequiredConfig = Required<Config>;
// { host: string; port: number; ssl: boolean; }

// Use when you've validated all optional properties exist
function connect(config: RequiredConfig): Connection {
    // All properties guaranteed to exist
}

/**
 * Readonly<T> - Makes all properties readonly.
 */
type ReadonlyUser = Readonly<User>;
// { readonly id: string; readonly name: string; readonly email: string; }

// Should be the default - make mutable explicit instead

/**
 * Record<K, V> - Object with keys K and values V.
 */
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
type StatusCodes = Record<number, string>;

// Use for dictionaries and lookup tables
const httpStatus: Record<number, string> = {
    200: 'OK',
    404: 'Not Found',
    500: 'Internal Server Error',
};

/**
 * Pick<T, K> - Select specific properties.
 */
type UserCredentials = Pick<User, 'email'>;
// { email: string; }

// Use to create subsets for specific use cases
type PublicUserInfo = Pick<User, 'id' | 'name'>;

/**
 * Omit<T, K> - Exclude specific properties.
 */
type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string; }

// Use to create types without sensitive fields
type PublicUser = Omit<User, 'passwordHash' | 'privateKey'>;

/**
 * Exclude<T, U> - Remove types from union.
 */
type AllTypes = string | number | boolean | null | undefined;
type NonNull = Exclude<AllTypes, null | undefined>;
// string | number | boolean

/**
 * Extract<T, U> - Keep only types assignable to U.
 */
type Strings = Extract<AllTypes, string>;
// string

type Primitives = Extract<string | number | object, string | number>;
// string | number

/**
 * NonNullable<T> - Remove null and undefined.
 */
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

/**
 * Parameters<T> - Extract function parameter types.
 */
function greet(name: string, age: number): string {
    return `Hello ${name}, you are ${age}`;
}

type GreetParams = Parameters<typeof greet>;
// [name: string, age: number]

/**
 * ReturnType<T> - Extract function return type.
 */
type GreetReturn = ReturnType<typeof greet>;
// string

/**
 * ConstructorParameters<T> - Extract constructor parameters.
 */
class MyClass {
    constructor(public name: string, public value: number) {}
}

type MyClassParams = ConstructorParameters<typeof MyClass>;
// [name: string, value: number]

/**
 * InstanceType<T> - Extract instance type from constructor.
 */
type MyClassInstance = InstanceType<typeof MyClass>;
// MyClass

/**
 * Awaited<T> - Unwrap Promise types recursively.
 */
type PromiseString = Promise<string>;
type JustString = Awaited<PromiseString>;
// string

type NestedPromise = Promise<Promise<Promise<number>>>;
type JustNumber = Awaited<NestedPromise>;
// number

/**
 * ThisParameterType<T> - Extract `this` parameter type.
 */
function toHex(this: Uint8Array): string {
    return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
}

type ToHexThis = ThisParameterType<typeof toHex>;
// Uint8Array

/**
 * OmitThisParameter<T> - Remove `this` parameter.
 */
type ToHexWithoutThis = OmitThisParameter<typeof toHex>;
// () => string
```

### 1.9.2 Custom Utility Types

Essential custom utility types for TypeScript Law compliance:

```typescript
/**
 * Deep readonly - makes all nested properties readonly.
 * Use for immutable data structures.
 */
type DeepReadonly<T> = T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]>
   }
    : T;

/**
 * Deep partial - makes all nested properties optional.
 * Use for deep merge operations.
 */
type DeepPartial<T> = T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

/**
 * Deep required - makes all nested properties required.
 */
type DeepRequired<T> = T extends object
    ? { [P in keyof T]-?: DeepRequired<T[P]> }
    : T;

/**
 * Deep mutable - removes readonly from all nested properties.
 * Use only when mutation is explicitly needed.
 */
type DeepMutable<T> = T extends object
    ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
    : T;

/**
 * Mutable - removes readonly from top-level properties.
 */
type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

/**
 * Optional keys - extracts keys of optional properties.
 */
type OptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Required keys - extracts keys of required properties.
 */
type RequiredKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

/**
 * Function type with explicit parameter and return types.
 */
type Fn<Args extends readonly unknown[] = readonly unknown[], R = unknown> =
    (...args: Args) => R;

/**
 * Async function type.
 */
type AsyncFn<Args extends readonly unknown[] = readonly unknown[], R = unknown> =
    (...args: Args) => Promise<R>;

/**
 * Prettify - expands type for better IDE display.
 * Useful for complex intersection/mapped types.
 */
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

/**
 * Strict omit - only allows keys that exist on T.
 * Unlike Omit, this errors if you try to omit non-existent keys.
 */
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Strict pick - type-safe pick.
 */
type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Exact - prevents excess properties.
 */
type Exact<T, Shape> = T extends Shape
    ? Exclude<keyof T, keyof Shape> extends never
        ? T
        : never
    : never;

/**
 * Union to intersection - converts union to intersection.
 */
type UnionToIntersection<U> = (
    U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never;

/**
 * Get nested property type by path.
 */
type Get<T, Path extends string> = Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? Get<T[K], Rest>
        : never
    : Path extends keyof T
        ? T[Path]
        : never;

/**
 * Set nested property type by path.
 */
type Set<T, Path extends string, V> = Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? { [P in keyof T]: P extends K ? Set<T[P], Rest, V> : T[P] }
        : never
    : Path extends keyof T
        ? { [P in keyof T]: P extends Path ? V : T[P] }
        : never;

/**
 * Nullable - makes type nullable.
 */
type Nullable<T> = T | null;

/**
 * Maybe - makes type optional (null or undefined).
 */
type Maybe<T> = T | null | undefined;

/**
 * Values of - extracts value types from object.
 */
type ValuesOf<T> = T[keyof T];

/**
 * Entries of - creates tuple type for Object.entries.
 */
type EntriesOf<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T];

/**
 * Merge - merges two types, B overrides A.
 */
type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * RequireAtLeastOne - requires at least one of the specified keys.
 */
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

/**
 * RequireOnlyOne - requires exactly one of the specified keys.
 */
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>>;
    }[Keys];

/**
 * XOR - exclusive or for types.
 */
type XOR<T, U> = (T | U) extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/**
 * PropertyKey - union of all valid object key types (often forgotten).
 */
type PropertyKey = string | number | symbol;

// Useful for generic key constraints
function getProperty<T, K extends PropertyKey>(obj: T, key: K): unknown {
    return (obj as Record<PropertyKey, unknown>)[key];
}

/**
 * KeysMatching<T, V> - filter object keys by value type.
 */
type KeysMatching<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

interface Mixed {
    name: string;
    age: number;
    active: boolean;
    count: number;
    label: string;
}

type StringKeys = KeysMatching<Mixed, string>;   // 'name' | 'label'
type NumberKeys = KeysMatching<Mixed, number>;   // 'age' | 'count'
type BooleanKeys = KeysMatching<Mixed, boolean>; // 'active'

/**
 * Expand<T> - force evaluation of complex types for debugging.
 */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type ExpandRecursive<T> = T extends object
    ? T extends infer O ? { [K in keyof O]: ExpandRecursive<O[K]> } : never
    : T;
```

### 1.9.3 Type System Philosophy

Complex typing is always good. If the type system catches an error at compile time, the runtime doesn't have to. Every type constraint you add is a bug that becomes impossible. Type complexity has zero runtime cost—it is erased during compilation—but the safety it provides is permanent.

Prefer complex compile-time types over simple runtime checks. A runtime `if` check runs every time the code executes and can be missed. A compile-time type constraint runs once during development and catches every violation before the code ships.

Use types aggressively. Every generic constraint, every branded type, every discriminated union, every conditional type narrows the space of possible bugs. The goal is to make invalid states unrepresentable in the type system so that incorrect code cannot compile.

```typescript
// WEAK - runtime check, can be forgotten
function transfer(from: string, to: string, amount: bigint): void {
    if (amount < 0n) throw new Error('Negative amount');
    // Nothing prevents passing a block hash as 'from'
}

// STRONG - compile-time guarantees, impossible to misuse
type Address = Brand<string, 'Address'>;
type Satoshis = Brand<bigint, 'Satoshis'>;

function transfer(from: Address, to: Address, amount: Satoshis): void {
    // Cannot pass wrong types - compiler rejects at call site
    // Satoshis factory already validated non-negative
}

// WEAK - runtime exhaustiveness
function getLabel(status: number): string {
    if (status === 0) return 'Pending';
    if (status === 1) return 'Active';
    return 'Unknown'; // silent bug if new status added
}

// STRONG - compile-time exhaustiveness
const Status = { Pending: 0, Active: 1, Completed: 2 } as const;
type Status = (typeof Status)[keyof typeof Status];

function getLabel(status: Status): string {
    switch (status) {
        case Status.Pending: return 'Pending';
        case Status.Active: return 'Active';
        case Status.Completed: return 'Completed';
        default:
            const _exhaustive: never = status;
            throw new Error(`Unhandled status: ${_exhaustive}`);
    }
}
```

---

## 1.10 Strict Mode Requirements

### 1.10.1 Compiler Options

The following tsconfig.json options are mandatory. No exceptions. No "we'll enable it later."

```json
{
    "compilerOptions": {
        // Strict mode - enables all strict checks
        "strict": true,
        
        // Individual strict flags (already enabled by strict, but explicit for clarity)
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitThis": true,
        "useUnknownInCatchVariables": true,
        "alwaysStrict": true,
        
        // Additional strict checks
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "noPropertyAccessFromIndexSignature": true,
        
        // Module settings
        "moduleResolution": "bundler",
        "module": "ESNext",
        "target": "ESNext",
        "lib": ["ESNext"],
        "isolatedModules": true,
        "verbatimModuleSyntax": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        
        // Output settings
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        
        // Consistency
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

**What each option does:**

- `noImplicitAny`: Errors when type is implicitly `any`
- `strictNullChecks`: `null` and `undefined` are distinct types
- `strictFunctionTypes`: Strict contravariance for function parameters
- `strictBindCallApply`: Type-check bind, call, apply
- `strictPropertyInitialization`: Class properties must be initialized
- `noImplicitThis`: Error on `this` with implicit `any` type
- `useUnknownInCatchVariables`: Catch variables are `unknown` not `any`
- `noUnusedLocals`: Error on unused local variables
- `noUnusedParameters`: Error on unused parameters
- `exactOptionalPropertyTypes`: Distinguish between `undefined` and missing
- `noImplicitReturns`: Every code path must return
- `noFallthroughCasesInSwitch`: Every case must break/return
- `noUncheckedIndexedAccess`: Array/object indexing returns `T | undefined`
- `noImplicitOverride`: Must use `override` keyword
- `noPropertyAccessFromIndexSignature`: Must use bracket notation for index signatures

### 1.10.2 Type Assertions

Minimize type assertions. When necessary, use `as` over angle brackets.

```typescript
// FORBIDDEN - angle bracket syntax conflicts with JSX
const value = <string>something;

// ACCEPTABLE - when necessary
const value = something as string;

// PREFER - type guards over assertions
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

if (isString(something)) {
    // something is string here, no assertion needed
    const value = something;
}

// Double assertion for impossible casts - DOCUMENT WHY
// Only when you can prove safety but TypeScript can't
const value = something as unknown as TargetType;

// BETTER - use assertion functions
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== 'string') {
        throw new TypeError(`Expected string, got ${typeof value}`);
    }
}

assertIsString(something);
// something is now string
```

### 1.10.3 Non-Null Assertions

Minimize `!` non-null assertions. Prefer null checks or optional chaining.

```typescript
// AVOID - non-null assertion hides potential bugs
const length = maybeString!.length;

// PREFER - optional chaining with default
const length = maybeString?.length ?? 0;

// PREFER - explicit null check
if (maybeString !== null && maybeString !== undefined) {
    const length = maybeString.length;
}

// PREFER - type guard
function isNotNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

if (isNotNull(maybeString)) {
    const length = maybeString.length;
}

// ACCEPTABLE - when you can prove it but TypeScript can't
// Document why it's safe
const element = document.getElementById('known-to-exist')!;
// ^ Element definitely exists because it's created by our template
```

### 1.10.4 Const Assertions

Use `as const` for immutable literal values. This preserves literal types and makes arrays into readonly tuples.

```typescript
// Without as const - types widen
const point = [10, 20];
// Type: number[]

// With as const - preserved literal types
const point = [10, 20] as const;
// Type: readonly [10, 20]

// Without as const - string type
const direction = 'north';
// Type: string

// With as const - literal type
const direction = 'north' as const;
// Type: 'north'

// Object with as const
const config = {
    host: 'localhost',
    port: 3000,
    ssl: false,
} as const;
// Type: { readonly host: "localhost"; readonly port: 3000; readonly ssl: false }

// Use for enum-like patterns
const Status = {
    Pending: 0,
    Active: 1,
    Completed: 2,
} as const;

// Combine with Object.freeze for runtime immutability
const CONSTANTS = Object.freeze({
    MAX_SIZE: 1024,
    MIN_SIZE: 64,
    DEFAULT_NAME: 'unnamed',
} as const);
```

### 1.10.5 Satisfies Operator

Use `satisfies` to validate a value matches a type while preserving the narrowest inferred type.

```typescript
interface Config {
    host: string;
    port: number;
    ssl: boolean;
}

// With type annotation - loses literal types
const config1: Config = {
    host: 'localhost',  // Type: string
    port: 3000,         // Type: number
    ssl: false,         // Type: boolean
};

config1.port;  // Type: number (not 3000)

// With satisfies - preserves literal types while validating
const config2 = {
    host: 'localhost',  // Type: "localhost"
    port: 3000,         // Type: 3000
    ssl: false,         // Type: false
} satisfies Config;

config2.port;  // Type: 3000 (literal)

// Catches errors while preserving types
const config3 = {
    host: 'localhost',
    port: 'invalid',  // Error: Type 'string' is not assignable to type 'number'
    ssl: false,
} satisfies Config;

// Works with complex types
type ColorMap = Record<string, readonly [number, number, number]>;

const colors = {
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
} as const satisfies ColorMap;

colors.red;  // Type: readonly [255, 0, 0]
```

---

## 1.11 Const Assertions and Immutability

### 1.11.1 Immutability by Default

Everything should be readonly by default. Mutability is the exception, not the rule. This prevents bugs, enables V8 optimization, and makes code easier to reason about.

When we construct new literal expressions with const assertions, we signal to the language that:
- No literal types in that expression should be widened
- Object literals get readonly properties
- Array literals become readonly tuples

```typescript
// ALL interface properties should be readonly
interface User {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly roles: readonly string[];
    readonly metadata: Readonly<Record<string, string>>;
}

// ALL class fields should be readonly unless mutation is justified
class Transaction {
    readonly #txid: TxId;
    readonly #inputs: readonly Input[];
    readonly #outputs: readonly Output[];
    readonly version: number;  // Only mutable if there's a reason
    
    constructor(/* ... */) {
        // ...
    }
}

// ALL function parameters should be readonly
function processItems(items: readonly Item[]): void {
    // Cannot mutate items
}

// Use DeepReadonly for nested structures
type ImmutableConfig = DeepReadonly<{
    database: {
        host: string;
        port: number;
        credentials: {
            username: string;
            password: string;
        };
    };
}>;
```

### 1.11.2 Const Assertions for Protocol Constants

Use `as const` for all protocol constants, opcodes, and static configuration.

```typescript
/**
 * Bitcoin script opcodes - immutable and type-safe.
 */
const OP = {
    // Constants
    OP_0: 0x00,
    OP_FALSE: 0x00,
    OP_PUSHDATA1: 0x4c,
    OP_PUSHDATA2: 0x4d,
    OP_PUSHDATA4: 0x4e,
    OP_1NEGATE: 0x4f,
    OP_RESERVED: 0x50,
    OP_1: 0x51,
    OP_TRUE: 0x51,
    
    // Flow control
    OP_NOP: 0x61,
    OP_IF: 0x63,
    OP_NOTIF: 0x64,
    OP_ELSE: 0x67,
    OP_ENDIF: 0x68,
    OP_VERIFY: 0x69,
    OP_RETURN: 0x6a,
    
    // Stack
    OP_DUP: 0x76,
    OP_DROP: 0x75,
    OP_SWAP: 0x7c,
    
    // Comparison
    OP_EQUAL: 0x87,
    OP_EQUALVERIFY: 0x88,
    
    // Crypto
    OP_RIPEMD160: 0xa6,
    OP_SHA256: 0xa8,
    OP_HASH160: 0xa9,
    OP_HASH256: 0xaa,
    OP_CHECKSIG: 0xac,
    OP_CHECKSIGVERIFY: 0xad,
    OP_CHECKMULTISIG: 0xae,
} as const;

type OpCode = (typeof OP)[keyof typeof OP];

// Sighash flags
const SIGHASH = {
    ALL: 0x01,
    NONE: 0x02,
    SINGLE: 0x03,
    ANYONECANPAY: 0x80,
    ALL_ANYONECANPAY: 0x81,
    NONE_ANYONECANPAY: 0x82,
    SINGLE_ANYONECANPAY: 0x83,
} as const;

type SighashFlag = (typeof SIGHASH)[keyof typeof SIGHASH];

// Script templates
const SCRIPT_TEMPLATES = {
    P2PKH: [OP.OP_DUP, OP.OP_HASH160, 'PUBKEYHASH', OP.OP_EQUALVERIFY, OP.OP_CHECKSIG],
    P2SH: [OP.OP_HASH160, 'SCRIPTHASH', OP.OP_EQUAL],
    P2WPKH: [OP.OP_0, 'PUBKEYHASH'],
    P2WSH: [OP.OP_0, 'SCRIPTHASH'],
} as const;
```

### 1.11.3 Combining Const Assertion with Object.freeze

For both compile-time and runtime immutability:

```typescript
/**
 * Create a deeply frozen, type-safe constant.
 */
function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
    const propNames = Reflect.ownKeys(obj);
    
    for (const name of propNames) {
        const value = (obj as Record<PropertyKey, unknown>)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    
    return Object.freeze(obj) as DeepReadonly<T>;
}

// Usage - immutable at compile time and runtime
const CONFIG = deepFreeze({
    version: 1,
    network: {
        host: 'localhost',
        port: 8332,
        timeout: 30000,
    },
    limits: {
        maxInputs: 100,
        maxOutputs: 100,
        maxScriptSize: 10000,
    },
} as const);

// TypeScript error: Cannot assign to 'host' because it is a read-only property
// CONFIG.network.host = 'other';

// Runtime error: Cannot assign to read only property 'host'
// (CONFIG as any).network.host = 'other';
```

### 1.11.4 Readonly Introduction Strategy

Readonly types must be introduced top-down, not bottom-up. When adding `readonly` to a foundational type, all consumers must be audited and fixed simultaneously. Piecemeal readonly adoption creates type incompatibilities where functions reject valid readonly inputs or return mutable types that break readonly callers. Either commit to full readonly propagation across the dependency chain, or use explicit mutable type aliases for the transition period.

Functions that only read should accept `readonly`. Functions that build internally use mutable locals and return `readonly`. Never accept mutable and return readonly without the function signature making the contract clear.

```typescript
// CORRECT - accept readonly, build with mutable local, return readonly
function processStack(input: readonly StackElement[]): readonly Uint8Array[] {
    const result: Uint8Array[] = []; // mutable local for building
    for (const element of input) {
        result.push(serializeElement(element));
    }
    return result; // mutable assignable to readonly return
}

// FORBIDDEN - accept mutable when you only read
function processStack(input: StackElement[]): Uint8Array[] {
    // Rejects readonly inputs for no reason
    // Callers with readonly arrays cannot use this function
}

// TRANSITION PATTERN - when full adoption isn't immediate
type Stack = readonly StackElement[];        // readonly for consumers
type MutableStack = StackElement[];          // explicit mutable for builders

function buildStack(): Stack {
    const result: MutableStack = [];
    result.push(value);
    return result; // MutableStack assignable to Stack
}
```

### 1.11.5 Object.freeze on Typed Arrays

`Object.freeze()` on typed arrays is forbidden. It does not prevent element mutation—only property addition. The underlying `ArrayBuffer` remains writable. This creates a false sense of security where code appears protected but is not.

For typed array constants, follow these rules based on visibility:

- **Internal module constants** (not exported): Only `const` binding and documentation (`/** @internal Do not mutate */`) are required. The threat model is self-mutation within the same file, which code review catches.
- **Exported typed array constants**: Must use factory functions returning fresh copies from a frozen `number[]` source, accepting the allocation overhead. If the overhead is unacceptable, do not export the constant; export a function that uses it internally.
- **Never rely on** `Object.freeze()`, `.slice()` defensive copies, or getter patterns for typed array immutability. All are bypassable through `ArrayBuffer` access, `DataView`, or prototype manipulation.

```typescript
// INTERNAL CONSTANT - documentation sufficient
/** @internal Do not mutate */
const EC_P: Uint8Array = fromHex(
    'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'
);

// EXPORTED CONSTANT - factory required
const EC_P_SOURCE: readonly number[] = Object.freeze([
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xfc, 0x2f,
]);

export function getEcP(): Uint8Array {
    return new Uint8Array(EC_P_SOURCE);
}

// FORBIDDEN - false sense of security
export const EC_P = Object.freeze(fromHex('...'));
// Elements still mutable: EC_P[0] = 0x00 does NOT throw

// FORBIDDEN - bypassable defensive copy
export const getEcP = (): Uint8Array => _source.slice();
// Bypassable via .buffer access:
// new Uint8Array(getEcP().buffer)[0] = 0x00 mutates the original
```

---

# CHAPTER 2: RUNTIME SAFETY

## 2.1 Reflect API

### 2.1.1 Property Access

Use `Reflect.get` for safe property access that works correctly with proxies and inheritance.

```typescript
/**
 * Safe property access with Reflect.
 * Returns undefined for missing properties instead of throwing.
 */
function safeGet<T extends object, K extends keyof T>(
    target: T,
    property: K,
    receiver?: unknown
): T[K] | undefined {
    try {
        return Reflect.get(target, property, receiver);
    } catch {
        return undefined;
    }
}

/**
 * The receiver parameter is crucial for getters.
 * It determines the `this` value in getter functions.
 */
class Parent {
    #value = 42;
    
    get value(): number {
        return this.#value;
    }
}

class Child extends Parent {
    #multiplier = 2;
    
    override get value(): number {
        return super.value * this.#multiplier;
    }
}

const child = new Child();

// Direct access uses child as receiver
child.value;  // 84

// Reflect.get with explicit receiver
Reflect.get(child, 'value', child);  // 84

// Wrong receiver would give wrong result
// Reflect.get(child, 'value', {});  // Error - can't access private
```

### 2.1.2 Property Modification

Use `Reflect.set` and check the return value for success. It returns false instead of throwing on frozen objects.

```typescript
/**
 * Safe property set.
 * Returns boolean indicating success.
 */
function safeSet<T extends object, K extends keyof T>(
    target: T,
    property: K,
    value: T[K],
    receiver?: unknown
): boolean {
    try {
        return Reflect.set(target, property, value, receiver);
    } catch {
        return false;
    }
}

// Example: fails gracefully on frozen objects
const frozen = Object.freeze({ value: 1 });
const success = Reflect.set(frozen, 'value', 2);
console.log(success);  // false
console.log(frozen.value);  // 1 (unchanged)

/**
 * Safe property definition with descriptors.
 */
function safeDefineProperty<T extends object>(
    target: T,
    property: PropertyKey,
    descriptor: PropertyDescriptor
): boolean {
    try {
        return Reflect.defineProperty(target, property, descriptor);
    } catch {
        return false;
    }
}

// Example
const obj = {};
const success = safeDefineProperty(obj, 'readonly', {
    value: 42,
    writable: false,
    enumerable: true,
    configurable: false,
});

/**
 * Safe property deletion.
 */
function safeDelete<T extends object>(
    target: T,
    property: PropertyKey
): boolean {
    try {
        return Reflect.deleteProperty(target, property);
    } catch {
        return false;
    }
}

// Returns false for non-configurable properties
const obj2 = {};
Object.defineProperty(obj2, 'permanent', {
    value: 1,
    configurable: false,
});
Reflect.deleteProperty(obj2, 'permanent');  // false
```

### 2.1.3 Property Inspection

```typescript
/**
 * Check property existence safely.
 */
function safeHas<T extends object>(
    target: T,
    property: PropertyKey
): boolean {
    try {
        return Reflect.has(target, property);
    } catch {
        return false;
    }
}

/**
 * Get all own keys (strings and symbols, enumerable and non-enumerable).
 */
function getAllKeys<T extends object>(target: T): PropertyKey[] {
    return Reflect.ownKeys(target);
}

// Example
const obj = { a: 1 };
const sym = Symbol('b');
Object.defineProperty(obj, sym, { value: 2, enumerable: false });
Object.defineProperty(obj, 'c', { value: 3, enumerable: false });

Reflect.ownKeys(obj);  // ['a', 'c', Symbol(b)]
Object.keys(obj);      // ['a'] (only enumerable string keys)

/**
 * Get property descriptor safely.
 */
function getDescriptor<T extends object>(
    target: T,
    property: PropertyKey
): PropertyDescriptor | undefined {
    return Reflect.getOwnPropertyDescriptor(target, property);
}
```

### 2.1.4 Prototype Operations

```typescript
/**
 * Safe prototype access.
 */
function getPrototype<T extends object>(target: T): object | null {
    return Reflect.getPrototypeOf(target);
}

function setPrototype<T extends object>(
    target: T,
    proto: object | null
): boolean {
    return Reflect.setPrototypeOf(target, proto);
}

/**
 * Extensibility control.
 */
function isExtensible<T extends object>(target: T): boolean {
    return Reflect.isExtensible(target);
}

function preventExtensions<T extends object>(target: T): boolean {
    return Reflect.preventExtensions(target);
}
```

### 2.1.5 Function Invocation

```typescript
/**
 * Safe function invocation.
 * More predictable than func.apply when func might have custom apply.
 */
function safeApply<T, A extends readonly unknown[], R>(
    func: (this: T, ...args: A) => R,
    thisArg: T,
    args: A
): R {
    return Reflect.apply(func, thisArg, args);
}

/**
 * Safe constructor invocation.
 */
function safeConstruct<T>(
    target: new (...args: readonly unknown[]) => T,
    args: readonly unknown[],
    newTarget?: new (...args: readonly unknown[]) => T
): T {
    return Reflect.construct(target, args, newTarget);
}

// newTarget allows specifying a different constructor for new.target
class Parent {
    constructor() {
        console.log(new.target.name);
    }
}

class Child extends Parent {}

Reflect.construct(Parent, [], Child);  // Logs "Child"
```

---

## 2.2 Object Security

### 2.2.1 Object.freeze

`Object.freeze` makes an object completely immutable. No properties can be added, removed, or modified. Nested objects remain mutable unless also frozen.

```typescript
/**
 * Deep freeze utility - recursively freezes all nested objects.
 */
function deepFreeze<T extends object>(obj: T): Readonly<T> {
    // Get all property keys including symbols
    const propNames = Reflect.ownKeys(obj);
    
    // Freeze nested objects first
    for (const name of propNames) {
        const value = (obj as Record<PropertyKey, unknown>)[name];
        
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value as object);
        }
    }
    
    return Object.freeze(obj);
}

// Usage
const config = deepFreeze({
    database: {
        host: 'localhost',
        port: 5432,
        credentials: {
            user: 'admin',
            password: 'secret',
        },
    },
});

// All these throw in strict mode, silently fail otherwise:
// config.database.port = 3000;
// config.database.credentials.password = 'new';
// delete config.database;
```

### 2.2.2 Object.seal

`Object.seal` prevents adding or removing properties but allows modification of existing values.

```typescript
interface State {
    count: number;
    name: string;
}

const state: State = Object.seal({
    count: 0,
    name: 'initial',
});

// OK - modifying existing properties
state.count = 1;
state.name = 'updated';

// Error - adding new property
// (state as any).newProp = true;

// Error - deleting property
// delete (state as any).count;
```

### 2.2.3 Object.preventExtensions

`Object.preventExtensions` prevents adding new properties but allows modification and deletion of existing ones.

```typescript
const obj = Object.preventExtensions({
    value: 1,
    name: 'test',
});

// OK - modify
obj.value = 2;

// OK - delete
delete (obj as { value?: number }).value;

// Error - add new property
// (obj as any).newProp = true;
```

### 2.2.4 Property Descriptors

Use property descriptors for fine-grained control over property behavior.

```typescript
const obj: Record<string, unknown> = {};

// Constant property - cannot be changed or deleted
Object.defineProperty(obj, 'CONSTANT', {
    value: 42,
    writable: false,
    enumerable: true,
    configurable: false,
});

// Hidden property - not enumerable
Object.defineProperty(obj, 'hidden', {
    value: 'secret',
    writable: true,
    enumerable: false,  // Won't appear in for...in or Object.keys
    configurable: true,
});

// Computed property - getter only
Object.defineProperty(obj, 'timestamp', {
    get(): number {
        return Date.now();
    },
    enumerable: true,
    configurable: false,
});

// Property with validation
let _value = 0;
Object.defineProperty(obj, 'validated', {
    get(): number {
        return _value;
    },
    set(newValue: number): void {
        if (typeof newValue !== 'number' || newValue < 0) {
            throw new TypeError('Value must be a non-negative number');
        }
        _value = newValue;
    },
    enumerable: true,
    configurable: false,
});
```

### 2.2.5 Prototype Hardening

Freeze critical prototypes at application startup to prevent prototype pollution attacks.

```typescript
/**
 * Harden all built-in prototypes.
 * Call this at application startup BEFORE any untrusted code runs.
 */
function hardenPrototypes(): void {
    const prototypes: readonly object[] = [
        Object.prototype,
        Array.prototype,
        Function.prototype,
        String.prototype,
        Number.prototype,
        Boolean.prototype,
        Symbol.prototype,
        BigInt.prototype,
        RegExp.prototype,
        Date.prototype,
        Error.prototype,
        TypeError.prototype,
        RangeError.prototype,
        SyntaxError.prototype,
        ReferenceError.prototype,
        URIError.prototype,
        EvalError.prototype,
        Promise.prototype,
        Map.prototype,
        Set.prototype,
        WeakMap.prototype,
        WeakSet.prototype,
        ArrayBuffer.prototype,
        SharedArrayBuffer.prototype,
        DataView.prototype,
        // TypedArray prototypes
        Int8Array.prototype,
        Uint8Array.prototype,
        Uint8ClampedArray.prototype,
        Int16Array.prototype,
        Uint16Array.prototype,
        Int32Array.prototype,
        Uint32Array.prototype,
        Float32Array.prototype,
        Float64Array.prototype,
        BigInt64Array.prototype,
        BigUint64Array.prototype,
    ];
    
    for (const proto of prototypes) {
        Object.freeze(proto);
    }
    
    // Also freeze key constructors
    Object.freeze(Object);
    Object.freeze(Array);
    Object.freeze(Function);
    Object.freeze(Promise);
    Object.freeze(JSON);
    Object.freeze(Math);
    Object.freeze(Reflect);
}

// Call at startup
hardenPrototypes();
```

### 2.2.6 Null Prototype Objects

Create objects with no prototype to prevent prototype chain attacks.

```typescript
/**
 * Create a dictionary with no prototype.
 * Safe for storing untrusted keys.
 */
function createDictionary<V>(): Record<string, V> {
    return Object.create(null) as Record<string, V>;
}

const dict = createDictionary<number>();

// No prototype properties
dict.constructor;       // undefined
dict.toString;          // undefined
dict.hasOwnProperty;    // undefined
dict.__proto__;         // undefined

// Safe to use any key
dict['constructor'] = 1;  // Just a regular property
dict['__proto__'] = 2;    // Just a regular property

/**
 * Safe property check for null-prototype objects.
 */
function hasKey<T extends object>(obj: T, key: PropertyKey): boolean {
    return Object.hasOwn(obj, key);
}

// Or use Object.hasOwn directly (ES2022+)
Object.hasOwn(dict, 'constructor');  // true (we added it)
Object.hasOwn({}, 'constructor');    // false (inherited)
```

---

## 2.3 Proxy Pattern

### 2.3.1 Proxy Fundamentals

Proxies intercept and customize fundamental operations on objects.

```typescript
/**
 * Basic proxy handler interface.
 */
interface ProxyHandler<T extends object> {
    // Property access
    get?(target: T, property: PropertyKey, receiver: unknown): unknown;
    set?(target: T, property: PropertyKey, value: unknown, receiver: unknown): boolean;
    has?(target: T, property: PropertyKey): boolean;
    deleteProperty?(target: T, property: PropertyKey): boolean;
    
    // Property enumeration
    ownKeys?(target: T): ArrayLike<PropertyKey>;
    getOwnPropertyDescriptor?(target: T, property: PropertyKey): PropertyDescriptor | undefined;
    defineProperty?(target: T, property: PropertyKey, descriptor: PropertyDescriptor): boolean;
    
    // Prototype
    getPrototypeOf?(target: T): object | null;
    setPrototypeOf?(target: T, prototype: object | null): boolean;
    
    // Extensibility
    isExtensible?(target: T): boolean;
    preventExtensions?(target: T): boolean;
    
    // Function calls (only for callable targets)
    apply?(target: T, thisArg: unknown, args: unknown[]): unknown;
    construct?(target: T, args: unknown[], newTarget: Function): object;
}
```

### 2.3.2 Proxy Traps

**Always use Reflect for default behavior in proxy traps.** This ensures correct semantics with inheritance and receivers.

```typescript
/**
 * Logging proxy - traces all property access.
 */
function createLoggingProxy<T extends object>(target: T, name: string): T {
    return new Proxy(target, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            console.log(`GET ${name}.${String(property)} = ${value}`);
            return value;
        },
        
        set(target, property, value, receiver) {
            console.log(`SET ${name}.${String(property)} = ${value}`);
            return Reflect.set(target, property, value, receiver);
        },
        
        has(target, property) {
            const result = Reflect.has(target, property);
            console.log(`HAS ${name}.${String(property)} = ${result}`);
            return result;
        },
        
        deleteProperty(target, property) {
            console.log(`DELETE ${name}.${String(property)}`);
            return Reflect.deleteProperty(target, property);
        },
    });
}

/**
 * Validation proxy - validates values before setting.
 */
function createValidatingProxy<T extends object>(
    target: T,
    validators: Partial<{ [K in keyof T]: (value: T[K]) => boolean }>
): T {
    return new Proxy(target, {
        set(target, property, value, receiver) {
            const validator = validators[property as keyof T];
            
            if (validator && !validator(value as T[keyof T])) {
                throw new ValidationError(
                    `Invalid value for ${String(property)}: ${value}`
                );
            }
            
            return Reflect.set(target, property, value, receiver);
        },
    });
}

// Usage
interface User {
    name: string;
    age: number;
    email: string;
}

const user = createValidatingProxy<User>(
    { name: '', age: 0, email: '' },
    {
        name: (v) => v.length > 0 && v.length < 100,
        age: (v) => Number.isInteger(v) && v >= 0 && v < 150,
        email: (v) => v.includes('@') && v.includes('.'),
    }
);

user.name = 'Alice';  // OK
user.age = 30;        // OK
// user.age = -5;     // Throws ValidationError

/**
 * Readonly proxy - prevents all modifications.
 */
function createReadonlyProxy<T extends object>(target: T): Readonly<T> {
    return new Proxy(target, {
        set() {
            throw new TypeError('Cannot modify readonly object');
        },
        deleteProperty() {
            throw new TypeError('Cannot delete from readonly object');
        },
        defineProperty() {
            throw new TypeError('Cannot define property on readonly object');
        },
        setPrototypeOf() {
            throw new TypeError('Cannot set prototype of readonly object');
        },
    }) as Readonly<T>;
}
```

### 2.3.3 Revocable Proxies

Revocable proxies can be disabled, making all operations throw.

```typescript
/**
 * Create revocable access to a resource.
 * Once revoked, all access throws TypeError.
 */
function createRevocableAccess<T extends object>(target: T): {
    proxy: T;
    revoke: () => void;
} {
    return Proxy.revocable(target, {
        get(target, property, receiver) {
            return Reflect.get(target, property, receiver);
        },
        set(target, property, value, receiver) {
            return Reflect.set(target, property, value, receiver);
        },
        has(target, property) {
            return Reflect.has(target, property);
        },
    });
}

// Usage
const { proxy, revoke } = createRevocableAccess({ secret: 'data' });

console.log(proxy.secret);  // 'data'

revoke();

// All operations now throw
// proxy.secret;  // TypeError: Cannot perform 'get' on a proxy that has been revoked

/**
 * Time-limited access pattern.
 */
function createTimeLimitedAccess<T extends object>(
    target: T,
    durationMs: number
): T {
    const { proxy, revoke } = Proxy.revocable(target, {
        get(target, property, receiver) {
            return Reflect.get(target, property, receiver);
        },
    });
    
    setTimeout(revoke, durationMs);
    
    return proxy;
}
```

### 2.3.4 Proxy Invariants

Proxies must maintain certain invariants - they cannot lie about fundamental object behavior:

1. If `getOwnPropertyDescriptor` returns a descriptor, it must be an object
2. A property cannot be reported as non-existent if it exists as non-configurable
3. A property cannot be reported as non-configurable if it doesn't exist or is configurable
4. `ownKeys` must return all non-configurable keys
5. `isExtensible` must match actual extensibility
6. `preventExtensions` must return false if target is extensible
7. `getPrototypeOf` must return actual prototype if target is non-extensible

```typescript
// This would throw - violates invariant
const badHandler: ProxyHandler<{ readonly a: number }> = {
    getOwnPropertyDescriptor(target, property) {
        if (property === 'a') {
            // Can't say non-configurable property doesn't exist
            return undefined;  // Throws TypeError
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
    },
};

const obj = Object.freeze({ a: 1 });
// new Proxy(obj, badHandler);  // Would throw
```

### 2.3.5 Type-Safe Dynamic Dispatch

The OPNet contract pattern demonstrates Proxy for type-safe dynamic method dispatch:

```typescript
const internal = Symbol.for('_btc_internal');

interface ContractMethods {
    balanceOf(address: Address): Promise<bigint>;
    transfer(to: Address, amount: bigint): Promise<boolean>;
    allowance(owner: Address, spender: Address): Promise<bigint>;
}

abstract class BaseContract<T extends ContractMethods> {
    readonly #interface: ContractInterface;
    readonly #address: Address;
    readonly #provider: Provider;
    
    protected constructor(
        address: Address,
        abi: ContractABI,
        provider: Provider
    ) {
        this.#address = address;
        this.#interface = new ContractInterface(abi);
        this.#provider = provider;
    }
    
    protected getFunction(
        name: string
    ): ((...args: unknown[]) => Promise<unknown>) | undefined {
        if (this.#interface.hasFunction(name)) {
            return this.#createCall(name);
        }
        return undefined;
    }
    
    #createCall(name: string): (...args: unknown[]) => Promise<unknown> {
        return async (...args: unknown[]): Promise<unknown> => {
            const encoded = this.#interface.encodeFunctionData(name, args);
            const result = await this.#provider.call({
                to: this.#address,
                data: encoded,
            });
            return this.#interface.decodeFunctionResult(name, result);
        };
    }
}
```

## 2.4 Defensive Programming

### 2.4.1 Input Validation

Validate all inputs at system boundaries. Trust nothing from external sources.

```typescript
/**
 * Validation result type - never throw from validators.
 */
type ValidationResult<T> =
    | { readonly valid: true; readonly value: T }
    | { readonly valid: false; readonly errors: readonly string[] };

/**
 * Validator builder pattern.
 */
class Validator<T> {
    readonly #checks: readonly ((value: unknown) => string | null)[];
    readonly #transform: (value: unknown) => T;
    
    private constructor(
        checks: readonly ((value: unknown) => string | null)[],
        transform: (value: unknown) => T
    ) {
        this.#checks = checks;
        this.#transform = transform;
    }
    
    static create<T>(transform: (value: unknown) => T): Validator<T> {
        return new Validator([], transform);
    }
    
    check(predicate: (value: unknown) => boolean, message: string): Validator<T> {
        return new Validator(
            [...this.#checks, (v) => predicate(v) ? null : message],
            this.#transform
        );
    }
    
    validate(input: unknown): ValidationResult<T> {
        const errors: string[] = [];
        
        for (const check of this.#checks) {
            const error = check(input);
            if (error !== null) {
                errors.push(error);
            }
        }
        
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        
        try {
            return { valid: true, value: this.#transform(input) };
        } catch (e) {
            return { 
                valid: false, 
                errors: [e instanceof Error ? e.message : 'Transform failed'] 
            };
        }
    }
}

/**
 * Common validators.
 */
const Validators = {
    string: Validator.create<string>((v) => String(v))
        .check((v) => typeof v === 'string', 'Must be a string'),
    
    nonEmptyString: Validator.create<string>((v) => String(v))
        .check((v) => typeof v === 'string', 'Must be a string')
        .check((v) => (v as string).length > 0, 'Must not be empty'),
    
    positiveInteger: Validator.create<number>((v) => Number(v))
        .check((v) => typeof v === 'number', 'Must be a number')
        .check((v) => Number.isInteger(v), 'Must be an integer')
        .check((v) => (v as number) > 0, 'Must be positive'),
    
    uint8Array: Validator.create<Uint8Array>((v) => v as Uint8Array)
        .check((v) => v instanceof Uint8Array, 'Must be Uint8Array'),
    
    txId: Validator.create<TxId>((v) => v as TxId)
        .check((v) => v instanceof Uint8Array, 'Must be Uint8Array')
        .check((v) => (v as Uint8Array).length === 32, 'Must be 32 bytes'),
    
    satoshis: Validator.create<Satoshis>((v) => BigInt(v as bigint) as Satoshis)
        .check((v) => typeof v === 'bigint', 'Must be bigint')
        .check((v) => (v as bigint) >= 0n, 'Must be non-negative')
        .check((v) => (v as bigint) <= 2_100_000_000_000_000n, 'Exceeds max supply'),
    
    hexString: Validator.create<HexString>((v) => (v as string).toLowerCase() as HexString)
        .check((v) => typeof v === 'string', 'Must be a string')
        .check((v) => /^[0-9a-fA-F]*$/.test(v as string), 'Must be hex characters')
        .check((v) => (v as string).length % 2 === 0, 'Must have even length'),
} as const;
```

### 2.4.2 Assertion Functions

Use assertion functions to narrow types after validation.

```typescript
/**
 * Base assertion error with context.
 */
class AssertionError extends Error {
    readonly context: Readonly<Record<string, unknown>>;
    
    constructor(message: string, context: Readonly<Record<string, unknown>> = {}) {
        super(message);
        this.name = 'AssertionError';
        this.context = context;
        Object.freeze(this);
    }
}

/**
 * Assert a condition is true.
 */
function assert(
    condition: boolean,
    message: string,
    context?: Readonly<Record<string, unknown>>
): asserts condition {
    if (!condition) {
        throw new AssertionError(message, context);
    }
}

/**
 * Assert value is defined (not null or undefined).
 */
function assertDefined<T>(
    value: T | null | undefined,
    name: string
): asserts value is T {
    if (value === null || value === undefined) {
        throw new AssertionError(`${name} must be defined`, { value });
    }
}

/**
 * Assert value is a specific type.
 */
function assertType<T>(
    value: unknown,
    guard: (v: unknown) => v is T,
    typeName: string
): asserts value is T {
    if (!guard(value)) {
        throw new AssertionError(`Expected ${typeName}`, { actualType: typeof value });
    }
}

/**
 * Assert array has minimum length.
 */
function assertMinLength<T>(
    array: readonly T[],
    minLength: number,
    name: string
): asserts array is readonly T[] & { readonly length: number } {
    if (array.length < minLength) {
        throw new AssertionError(
            `${name} must have at least ${minLength} elements`,
            { actualLength: array.length }
        );
    }
}

/**
 * Assert value is within range.
 */
function assertRange(
    value: number,
    min: number,
    max: number,
    name: string
): void {
    if (value < min || value > max) {
        throw new AssertionError(
            `${name} must be between ${min} and ${max}`,
            { value, min, max }
        );
    }
}

/**
 * Assert bigint is within range.
 */
function assertBigIntRange(
    value: bigint,
    min: bigint,
    max: bigint,
    name: string
): void {
    if (value < min || value > max) {
        throw new AssertionError(
            `${name} must be between ${min} and ${max}`,
            { value: value.toString(), min: min.toString(), max: max.toString() }
        );
    }
}

/**
 * Assert byte array has exact length.
 */
function assertByteLength(
    bytes: Uint8Array,
    expectedLength: number,
    name: string
): void {
    if (bytes.length !== expectedLength) {
        throw new AssertionError(
            `${name} must be exactly ${expectedLength} bytes`,
            { actualLength: bytes.length }
        );
    }
}

/**
 * Unreachable code assertion for exhaustiveness checks.
 */
function assertNever(value: never, message?: string): never {
    throw new AssertionError(
        message ?? `Unexpected value: ${JSON.stringify(value)}`,
        { value }
    );
}
```

### 2.4.3 Type Guards

Create comprehensive type guards for runtime type checking.

```typescript
/**
 * Primitive type guards.
 */
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
}

function isBigInt(value: unknown): value is bigint {
    return typeof value === 'bigint';
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

function isSymbol(value: unknown): value is symbol {
    return typeof value === 'symbol';
}

function isFunction(value: unknown): value is (...args: readonly unknown[]) => unknown {
    return typeof value === 'function';
}

function isObject(value: unknown): value is object {
    return value !== null && typeof value === 'object';
}

function isArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
}

function isNull(value: unknown): value is null {
    return value === null;
}

function isUndefined(value: unknown): value is undefined {
    return value === undefined;
}

function isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined;
}

function isNotNullish<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Collection type guards.
 */
function isUint8Array(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
    return value instanceof ArrayBuffer;
}

function isMap<K, V>(value: unknown): value is Map<K, V> {
    return value instanceof Map;
}

function isSet<T>(value: unknown): value is Set<T> {
    return value instanceof Set;
}

function isDate(value: unknown): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
}

function isError(value: unknown): value is Error {
    return value instanceof Error;
}

function isPromise<T>(value: unknown): value is Promise<T> {
    return value instanceof Promise;
}

/**
 * Structural type guards.
 */
function hasProperty<K extends PropertyKey>(
    obj: unknown,
    key: K
): obj is Record<K, unknown> {
    return isObject(obj) && key in obj;
}

function hasOwnProperty<K extends PropertyKey>(
    obj: unknown,
    key: K
): obj is Record<K, unknown> {
    return isObject(obj) && Object.hasOwn(obj, key);
}

function hasProperties<K extends PropertyKey>(
    obj: unknown,
    keys: readonly K[]
): obj is Record<K, unknown> {
    if (!isObject(obj)) return false;
    for (const key of keys) {
        if (!(key in obj)) return false;
    }
    return true;
}

/**
 * Array element type guards.
 */
function isArrayOf<T>(
    value: unknown,
    guard: (v: unknown) => v is T
): value is readonly T[] {
    return isArray(value) && value.every(guard);
}

function isNonEmptyArray<T>(value: readonly T[]): value is readonly [T, ...T[]] {
    return value.length > 0;
}

/**
 * Create type guard from validation schema.
 */
function createTypeGuard<T>(
    schema: {
        readonly [K in keyof T]: (value: unknown) => value is T[K];
    }
): (value: unknown) => value is T {
    return (value: unknown): value is T => {
        if (!isObject(value)) return false;
        
        for (const key of Object.keys(schema) as (keyof T)[]) {
            const guard = schema[key];
            if (!guard((value as Record<keyof T, unknown>)[key])) {
                return false;
            }
        }
        
        return true;
    };
}

// Usage
interface Transaction {
    readonly txid: Uint8Array;
    readonly version: number;
    readonly locktime: number;
}

const isTransaction = createTypeGuard<Transaction>({
    txid: isUint8Array,
    version: isInteger,
    locktime: isInteger,
});
```

### 2.4.4 Safe Operations

Wrap dangerous operations in safe wrappers.

```typescript
/**
 * Safe JSON parsing.
 */
function safeJsonParse<T>(
    json: string,
    validator: (value: unknown) => value is T
): T | null {
    try {
        const parsed: unknown = JSON.parse(json);
        return validator(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Safe JSON stringify.
 */
function safeJsonStringify(value: unknown): string | null {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

/**
 * Safe property access with default.
 */
function safeGet<T, K extends keyof T>(
    obj: T | null | undefined,
    key: K,
    defaultValue: T[K]
): T[K] {
    if (obj === null || obj === undefined) {
        return defaultValue;
    }
    const value = obj[key];
    return value === undefined ? defaultValue : value;
}

/**
 * Safe array access.
 */
function safeArrayGet<T>(
    array: readonly T[],
    index: number,
    defaultValue: T
): T {
    if (index < 0 || index >= array.length) {
        return defaultValue;
    }
    return array[index] ?? defaultValue;
}

/**
 * Safe map get with type narrowing.
 */
function safeMapGet<K, V>(
    map: ReadonlyMap<K, V>,
    key: K
): V | undefined {
    return map.get(key);
}

/**
 * Safe division.
 */
function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
    if (denominator === 0 || !Number.isFinite(denominator)) {
        return fallback;
    }
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
}

/**
 * Safe BigInt division.
 */
function safeBigIntDivide(numerator: bigint, denominator: bigint, fallback: bigint = 0n): bigint {
    if (denominator === 0n) {
        return fallback;
    }
    return numerator / denominator;
}

/**
 * Safe integer conversion.
 */
function safeToInteger(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof value === 'bigint') {
        const num = Number(value);
        return Number.isFinite(num) ? Math.trunc(num) : fallback;
    }
    return fallback;
}

/**
 * Safe BigInt conversion.
 */
function safeToBigInt(value: unknown, fallback: bigint = 0n): bigint {
    try {
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
        if (typeof value === 'string') return BigInt(value);
        return fallback;
    } catch {
        return fallback;
    }
}
```

### 2.4.5 Bounds Checking

Always validate array indices and buffer bounds.

```typescript
/**
 * Checked array access - throws on invalid index.
 */
function checkedGet<T>(array: readonly T[], index: number): T {
    if (index < 0 || index >= array.length || !Number.isInteger(index)) {
        throw new RangeError(`Index ${index} out of bounds [0, ${array.length})`);
    }
    return array[index]!;
}

/**
 * Checked array set - throws on invalid index.
 */
function checkedSet<T>(array: T[], index: number, value: T): void {
    if (index < 0 || index >= array.length || !Number.isInteger(index)) {
        throw new RangeError(`Index ${index} out of bounds [0, ${array.length})`);
    }
    array[index] = value;
}

/**
 * Checked buffer read.
 */
function checkedReadUint32(
    buffer: Uint8Array,
    offset: number,
    littleEndian: boolean = true
): number {
    if (offset < 0 || offset + 4 > buffer.length) {
        throw new RangeError(
            `Cannot read uint32 at offset ${offset}, buffer length ${buffer.length}`
        );
    }
    
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return view.getUint32(offset, littleEndian);
}

/**
 * Checked buffer write.
 */
function checkedWriteUint32(
    buffer: Uint8Array,
    offset: number,
    value: number,
    littleEndian: boolean = true
): void {
    if (offset < 0 || offset + 4 > buffer.length) {
        throw new RangeError(
            `Cannot write uint32 at offset ${offset}, buffer length ${buffer.length}`
        );
    }
    if (value < 0 || value > 0xFFFFFFFF) {
        throw new RangeError(`Value ${value} out of uint32 range`);
    }
    
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    view.setUint32(offset, value, littleEndian);
}

/**
 * Checked slice - validates bounds.
 */
function checkedSlice(
    buffer: Uint8Array,
    start: number,
    end: number
): Uint8Array {
    if (start < 0 || end < start || end > buffer.length) {
        throw new RangeError(
            `Invalid slice [${start}, ${end}) for buffer length ${buffer.length}`
        );
    }
    return buffer.slice(start, end);
}

/**
 * Checked subarray - validates bounds, returns view.
 */
function checkedSubarray(
    buffer: Uint8Array,
    start: number,
    end: number
): Uint8Array {
    if (start < 0 || end < start || end > buffer.length) {
        throw new RangeError(
            `Invalid subarray [${start}, ${end}) for buffer length ${buffer.length}`
        );
    }
    return buffer.subarray(start, end);
}
```

---

# CHAPTER 3: MEMORY MANAGEMENT

## 3.1 Allocation Principles

### 3.1.1 Allocation Avoidance

Allocation is the enemy of performance in hot paths. Every allocation triggers GC pressure. Minimize allocations through reuse and pre-allocation.

```typescript
/**
 * Pre-allocate buffers at startup for common sizes.
 */
class BufferPool {
    static readonly #pools: ReadonlyMap<number, Uint8Array[]> = new Map([
        [32, []],   // Hash outputs
        [33, []],   // Compressed public keys
        [64, []],   // Signatures
        [65, []],   // Uncompressed public keys
        [256, []],  // Small scripts
        [1024, []], // Medium buffers
        [4096, []], // Large buffers
    ]);
    
    static readonly #MAX_POOL_SIZE = 100;
    
    /**
     * Acquire a buffer from the pool or allocate new.
     */
    static acquire(size: number): Uint8Array {
        const pool = this.#pools.get(size);
        if (pool && pool.length > 0) {
            return pool.pop()!;
        }
        return new Uint8Array(size);
    }
    
    /**
     * Return a buffer to the pool for reuse.
     */
    static release(buffer: Uint8Array): void {
        const pool = this.#pools.get(buffer.length);
        if (pool && pool.length < this.#MAX_POOL_SIZE) {
            // Clear sensitive data before reuse
            buffer.fill(0);
            pool.push(buffer);
        }
        // If pool is full or no pool exists, let GC collect it
    }
    
    /**
     * Acquire and fill with data.
     */
    static acquireWith(data: Uint8Array): Uint8Array {
        const buffer = this.acquire(data.length);
        buffer.set(data);
        return buffer;
    }
    
    /**
     * Get pool statistics.
     */
    static getStats(): Readonly<Record<number, number>> {
        const stats: Record<number, number> = {};
        for (const [size, pool] of this.#pools) {
            stats[size] = pool.length;
        }
        return stats;
    }
}

/**
 * Object pool for frequently created objects.
 */
class ObjectPool<T> {
    readonly #pool: T[] = [];
    readonly #factory: () => T;
    readonly #reset: (obj: T) => void;
    readonly #maxSize: number;
    
    constructor(
        factory: () => T,
        reset: (obj: T) => void,
        maxSize: number = 100
    ) {
        this.#factory = factory;
        this.#reset = reset;
        this.#maxSize = maxSize;
    }
    
    acquire(): T {
        if (this.#pool.length > 0) {
            return this.#pool.pop()!;
        }
        return this.#factory();
    }
    
    release(obj: T): void {
        if (this.#pool.length < this.#maxSize) {
            this.#reset(obj);
            this.#pool.push(obj);
        }
    }
    
    get size(): number {
        return this.#pool.length;
    }
    
    preallocate(count: number): void {
        const toCreate = Math.min(count, this.#maxSize) - this.#pool.length;
        for (let i = 0; i < toCreate; i++) {
            this.#pool.push(this.#factory());
        }
    }
}

// Example usage
interface Point {
    x: number;
    y: number;
}

const pointPool = new ObjectPool<Point>(
    () => ({ x: 0, y: 0 }),
    (p) => { p.x = 0; p.y = 0; }
);

// In hot path
function processPoints(coords: readonly [number, number][]): number {
    let sumX = 0;
    let sumY = 0;
    
    for (const [x, y] of coords) {
        const point = pointPool.acquire();
        point.x = x;
        point.y = y;
        
        sumX += point.x;
        sumY += point.y;
        
        pointPool.release(point);
    }
    
    return sumX + sumY;
}
```

### 3.1.2 Stack Allocation Patterns

Prefer stack-allocated primitives over heap-allocated objects in hot paths.

```typescript
/**
 * BAD: Creates objects in hot loop.
 */
function processTransactionsBad(txs: readonly RawTransaction[]): TxStats {
    const stats: TxStats = { totalInputs: 0, totalOutputs: 0, totalValue: 0n };
    
    for (const tx of txs) {
        // Creates new object every iteration
        const parsed = parseTransaction(tx);
        stats.totalInputs += parsed.inputs.length;
        stats.totalOutputs += parsed.outputs.length;
        stats.totalValue += parsed.totalValue;
    }
    
    return stats;
}

/**
 * GOOD: Uses primitives and pre-allocated structures.
 */
function processTransactionsGood(txs: readonly RawTransaction[]): TxStats {
    // Single allocation for result
    let totalInputs = 0;
    let totalOutputs = 0;
    let totalValue = 0n;
    
    // Reusable parser state
    const parser = TransactionParser.acquire();
    
    try {
        for (const tx of txs) {
            // Parser reuses internal buffers
            parser.parse(tx);
            
            // Read primitives, no allocation
            totalInputs += parser.inputCount;
            totalOutputs += parser.outputCount;
            totalValue += parser.totalValue;
            
            parser.reset();
        }
    } finally {
        TransactionParser.release(parser);
    }
    
    return { totalInputs, totalOutputs, totalValue };
}

/**
 * Tuple returns avoid object allocation for small returns.
 */
function divmod(a: number, b: number): readonly [number, number] {
    return [Math.floor(a / b), a % b] as const;
}

// V8 can often optimize tuple returns to use registers
const [quotient, remainder] = divmod(17, 5);
```

### 3.1.3 String Interning

Reuse string instances for frequently used values.

```typescript
/**
 * String interner for repeated strings.
 */
class StringInterner {
    static readonly #cache = new Map<string, string>();
    static readonly #MAX_SIZE = 10000;
    static readonly #MAX_STRING_LENGTH = 100;
    
    /**
     * Intern a string - returns cached instance if exists.
     */
    static intern(str: string): string {
        // Don't intern long strings
        if (str.length > this.#MAX_STRING_LENGTH) {
            return str;
        }
        
        const cached = this.#cache.get(str);
        if (cached !== undefined) {
            return cached;
        }
        
        // Evict if too large (simple strategy)
        if (this.#cache.size >= this.#MAX_SIZE) {
            const firstKey = this.#cache.keys().next().value;
            if (firstKey !== undefined) {
                this.#cache.delete(firstKey);
            }
        }
        
        this.#cache.set(str, str);
        return str;
    }
    
    /**
     * Check if string is interned.
     */
    static isInterned(str: string): boolean {
        return this.#cache.has(str);
    }
    
    /**
     * Clear the cache.
     */
    static clear(): void {
        this.#cache.clear();
    }
    
    static get size(): number {
        return this.#cache.size;
    }
}

// Usage for opcode names, error messages, etc.
const opcodeName = StringInterner.intern('OP_CHECKSIG');
```

---

## 3.2 Weak References

### 3.2.1 WeakMap for Private Data

Use WeakMap to associate private data with objects without preventing garbage collection.

```typescript
/**
 * Private data pattern using WeakMap.
 * Data is automatically cleaned up when object is collected.
 */
const privateData = new WeakMap<object, PrivateState>();

interface PrivateState {
    readonly createdAt: Date;
    accessCount: number;
    lastAccess: Date;
}

class TrackedObject {
    constructor() {
        privateData.set(this, {
            createdAt: new Date(),
            accessCount: 0,
            lastAccess: new Date(),
        });
    }
    
    access(): void {
        const state = privateData.get(this);
        if (state) {
            state.accessCount++;
            state.lastAccess = new Date();
        }
    }
    
    getStats(): { readonly accessCount: number; readonly age: number } | null {
        const state = privateData.get(this);
        if (!state) return null;
        
        return {
            accessCount: state.accessCount,
            age: Date.now() - state.createdAt.getTime(),
        };
    }
}

// When TrackedObject instance is garbage collected,
// the privateData entry is automatically removed
```

### 3.2.2 WeakRef for Caches

Use WeakRef for caches where items can be reclaimed under memory pressure.

```typescript
/**
 * Weak cache - items may be collected by GC.
 */
class WeakCache<K extends object, V extends object> {
    readonly #cache = new Map<K, WeakRef<V>>();
    readonly #registry = new FinalizationRegistry<K>((key) => {
        this.#cache.delete(key);
    });
    
    get(key: K): V | undefined {
        const ref = this.#cache.get(key);
        if (!ref) return undefined;
        
        const value = ref.deref();
        if (!value) {
            // Reference was collected, clean up
            this.#cache.delete(key);
            return undefined;
        }
        
        return value;
    }
    
    set(key: K, value: V): void {
        const existing = this.#cache.get(key);
        if (existing) {
            // Unregister old value from finalization
            this.#registry.unregister(existing);
        }
        
        const ref = new WeakRef(value);
        this.#cache.set(key, ref);
        this.#registry.register(value, key, ref);
    }
    
    delete(key: K): boolean {
        const ref = this.#cache.get(key);
        if (ref) {
            this.#registry.unregister(ref);
        }
        return this.#cache.delete(key);
    }
    
    has(key: K): boolean {
        return this.get(key) !== undefined;
    }
    
    clear(): void {
        for (const [key, ref] of this.#cache) {
            this.#registry.unregister(ref);
        }
        this.#cache.clear();
    }
}

/**
 * Transaction cache with weak references.
 */
class TransactionCache {
    readonly #cache = new WeakCache<TxId, Transaction>();
    
    get(txid: TxId): Transaction | undefined {
        return this.#cache.get(txid);
    }
    
    set(txid: TxId, tx: Transaction): void {
        this.#cache.set(txid, tx);
    }
    
    getOrCreate(txid: TxId, factory: () => Transaction): Transaction {
        const existing = this.get(txid);
        if (existing) return existing;
        
        const tx = factory();
        this.set(txid, tx);
        return tx;
    }
}
```

### 3.2.3 FinalizationRegistry for Cleanup

Use FinalizationRegistry for cleanup actions when objects are collected.

```typescript
/**
 * Resource tracker using FinalizationRegistry.
 * Logs warnings for resources not properly disposed.
 */
class ResourceTracker {
    static readonly #registry = new FinalizationRegistry<string>((id) => {
        console.warn(`Resource ${id} was garbage collected without being disposed`);
        // Could also log to monitoring system
    });
    
    static track(resource: object, id: string): void {
        this.#registry.register(resource, id, resource);
    }
    
    static untrack(resource: object): void {
        this.#registry.unregister(resource);
    }
}

/**
 * Example tracked resource.
 */
class FileHandle implements Disposable {
    readonly #id: string;
    #disposed = false;
    
    constructor(path: string) {
        this.#id = `FileHandle:${path}:${Date.now()}`;
        ResourceTracker.track(this, this.#id);
    }
    
    [Symbol.dispose](): void {
        if (!this.#disposed) {
            this.#disposed = true;
            ResourceTracker.untrack(this);
            // Close file handle
        }
    }
    
    get disposed(): boolean {
        return this.#disposed;
    }
}

// Proper usage - no warning
{
    using file = new FileHandle('/path/to/file');
    // Use file...
} // Disposed automatically

// Improper usage - will warn when GC runs
const leaked = new FileHandle('/path/to/file');
// Never disposed, warning logged when collected
```

---

## 3.3 Buffer Management

### 3.3.1 View vs Copy

Understand when operations return views vs copies.

```typescript
/**
 * Subarray returns a VIEW - shares memory with original.
 * Changes to view affect original and vice versa.
 */
const original = new Uint8Array([1, 2, 3, 4, 5]);
const view = original.subarray(1, 4);  // [2, 3, 4]

view[0] = 99;
console.log(original);  // [1, 99, 3, 4, 5] - original changed!

/**
 * Slice returns a COPY - independent memory.
 * Changes to copy don't affect original.
 */
const copy = original.slice(1, 4);  // [99, 3, 4]

copy[0] = 100;
console.log(original);  // [1, 99, 3, 4, 5] - original unchanged

/**
 * Transfer moves ownership - original becomes unusable.
 */
const buffer = new ArrayBuffer(1024);
const transferred = buffer.transfer();  // New buffer with same content
console.log(buffer.byteLength);  // 0 - original is detached

/**
 * Buffer utilities with explicit copy/view semantics.
 */
const BufferUtils = {
    /**
     * Create a view into a buffer. No allocation.
     */
    view(buffer: Uint8Array, start: number, length: number): Uint8Array {
        return buffer.subarray(start, start + length);
    },
    
    /**
     * Create a copy of buffer range. Allocates new memory.
     */
    copy(buffer: Uint8Array, start: number = 0, end: number = buffer.length): Uint8Array {
        return buffer.slice(start, end);
    },
    
    /**
     * Concatenate buffers. Always allocates.
     */
    concat(buffers: readonly Uint8Array[]): Uint8Array {
        const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
        const result = new Uint8Array(totalLength);
        
        let offset = 0;
        for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        
        return result;
    },
    
    /**
     * Compare buffers for equality.
     */
    equals(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    },
    
    /**
     * Constant-time comparison for cryptographic use.
     */
    constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i]! ^ b[i]!;
        }
        return result === 0;
    },
} as const;
```

### 3.3.2 Streaming Buffers

Handle large data without loading everything into memory.

```typescript
/**
 * Chunked buffer reader for streaming large files.
 */
class ChunkedReader {
    readonly #chunkSize: number;
    #buffer: Uint8Array;
    #position: number = 0;
    #end: number = 0;
    
    constructor(chunkSize: number = 64 * 1024) {
        this.#chunkSize = chunkSize;
        this.#buffer = new Uint8Array(chunkSize);
    }
    
    /**
     * Process data in chunks.
     */
    async *readChunks(
        source: AsyncIterable<Uint8Array>
    ): AsyncGenerator<Uint8Array, void, undefined> {
        for await (const chunk of source) {
            // If chunk fits in remaining buffer space
            if (this.#end + chunk.length <= this.#buffer.length) {
                this.#buffer.set(chunk, this.#end);
                this.#end += chunk.length;
            } else {
                // Yield current buffer content
                if (this.#end > this.#position) {
                    yield this.#buffer.subarray(this.#position, this.#end);
                }
                
                // Reset and handle chunk
                this.#position = 0;
                
                if (chunk.length > this.#buffer.length) {
                    // Chunk larger than buffer, yield directly
                    yield chunk;
                    this.#end = 0;
                } else {
                    // Copy chunk to start of buffer
                    this.#buffer.set(chunk);
                    this.#end = chunk.length;
                }
            }
        }
        
        // Yield any remaining data
        if (this.#end > this.#position) {
            yield this.#buffer.subarray(this.#position, this.#end);
        }
    }
    
    reset(): void {
        this.#position = 0;
        this.#end = 0;
    }
}

/**
 * Ring buffer for fixed-size circular storage.
 */
class RingBuffer<T> {
    readonly #buffer: (T | undefined)[];
    readonly #capacity: number;
    #head: number = 0;
    #tail: number = 0;
    #size: number = 0;
    
    constructor(capacity: number) {
        this.#capacity = capacity;
        this.#buffer = new Array(capacity);
    }
    
    push(item: T): boolean {
        if (this.#size >= this.#capacity) {
            return false;  // Full
        }
        
        this.#buffer[this.#tail] = item;
        this.#tail = (this.#tail + 1) % this.#capacity;
        this.#size++;
        return true;
    }
    
    pop(): T | undefined {
        if (this.#size === 0) {
            return undefined;
        }
        
        const item = this.#buffer[this.#head];
        this.#buffer[this.#head] = undefined;  // Allow GC
        this.#head = (this.#head + 1) % this.#capacity;
        this.#size--;
        return item;
    }
    
    peek(): T | undefined {
        return this.#size > 0 ? this.#buffer[this.#head] : undefined;
    }
    
    get size(): number {
        return this.#size;
    }
    
    get capacity(): number {
        return this.#capacity;
    }
    
    get isFull(): boolean {
        return this.#size >= this.#capacity;
    }
    
    get isEmpty(): boolean {
        return this.#size === 0;
    }
    
    clear(): void {
        this.#buffer.fill(undefined);
        this.#head = 0;
        this.#tail = 0;
        this.#size = 0;
    }
}
```

---

## 3.4 Garbage Collection Optimization

### 3.4.1 GC-Friendly Patterns

Structure code to minimize GC pressure.

```typescript
/**
 * Avoid closures capturing large objects in long-lived callbacks.
 */

// BAD: Closure captures entire largeData array
function setupBadHandler(largeData: readonly string[]): () => void {
    return () => {
        // Only uses first element but captures entire array
        console.log(largeData[0]);
    };
}

// GOOD: Extract only what's needed
function setupGoodHandler(largeData: readonly string[]): () => void {
    const firstItem = largeData[0];  // Capture only what's needed
    return () => {
        console.log(firstItem);
    };
}

/**
 * Avoid creating functions in loops.
 */

// BAD: Creates new function each iteration
function processBad(items: readonly Item[]): void {
    for (const item of items) {
        item.onUpdate((value) => console.log(value));  // New function each time
    }
}

// GOOD: Reuse function reference
function processGood(items: readonly Item[]): void {
    const handler = (value: unknown) => console.log(value);
    for (const item of items) {
        item.onUpdate(handler);  // Same function reference
    }
}

/**
 * Avoid temporary object creation in hot paths.
 */

// BAD: Creates temporary object each call
function distanceBad(p1: Point, p2: Point): number {
    const delta = { x: p2.x - p1.x, y: p2.y - p1.y };  // Temporary object
    return Math.sqrt(delta.x * delta.x + delta.y * delta.y);
}

// GOOD: Use primitives
function distanceGood(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Pre-size arrays when length is known.
 */

// BAD: Array grows dynamically
function mapBad<T, U>(items: readonly T[], fn: (item: T) => U): U[] {
    const result: U[] = [];
    for (const item of items) {
        result.push(fn(item));  // May cause reallocation
    }
    return result;
}

// GOOD: Pre-allocate with known size
function mapGood<T, U>(items: readonly T[], fn: (item: T) => U): U[] {
    const result = new Array<U>(items.length);
    for (let i = 0; i < items.length; i++) {
        result[i] = fn(items[i]!);
    }
    return result;
}
```

### 3.4.2 Generational GC Awareness

V8 uses generational garbage collection. Understand the implications.

```typescript
/**
 * Young generation: Short-lived objects are cheap to allocate and collect.
 * Old generation: Long-lived objects are more expensive to manage.
 * 
 * Patterns:
 * 1. Short-lived temporaries are fine - they never leave young gen
 * 2. Avoid storing young objects in old objects (write barrier overhead)
 * 3. Large arrays/objects may be allocated directly in old gen
 */

/**
 * BAD: Creates long-lived closure with short-lived data reference.
 * This can cause old-to-young pointers, slowing GC.
 */
class BadCache {
    #data: Map<string, { value: unknown; timestamp: number }> = new Map();
    
    set(key: string, value: unknown): void {
        // Each entry is a new object that may get promoted to old gen
        // while 'value' might still be in young gen
        this.#data.set(key, { value, timestamp: Date.now() });
    }
}

/**
 * BETTER: Separate storage for stable vs changing data.
 */
class BetterCache {
    // Values that change frequently - may stay young
    readonly #values = new Map<string, unknown>();
    // Timestamps are primitives - no GC pointer issues
    readonly #timestamps = new Map<string, number>();
    
    set(key: string, value: unknown): void {
        this.#values.set(key, value);
        this.#timestamps.set(key, Date.now());
    }
    
    get(key: string): { value: unknown; timestamp: number } | undefined {
        const value = this.#values.get(key);
        const timestamp = this.#timestamps.get(key);
        
        if (value === undefined || timestamp === undefined) {
            return undefined;
        }
        
        // Create result object on demand - short-lived
        return { value, timestamp };
    }
}
```

## Chapter 4: Concurrency

---

## 4.1 Promise Patterns

### 4.1.1 Promise.withResolvers

`Promise.withResolvers<T>()` returns `{ promise, resolve, reject }`. Eliminates the awkward pattern of capturing resolve/reject from the executor.

```typescript
/**
 * Old pattern - awkward executor capture.
 */
function createDeferredOld<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
} {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    
    return { promise, resolve, reject };
}

/**
 * New pattern - clean and direct.
 */
function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
} {
    return Promise.withResolvers<T>();
}

/**
 * Use case: Event-based completion.
 */
class AsyncQueue<T> {
    readonly #queue: T[] = [];
    #waiter: {
        resolve: (value: T) => void;
        reject: (reason: unknown) => void;
    } | null = null;
    
    push(item: T): void {
        if (this.#waiter) {
            const { resolve } = this.#waiter;
            this.#waiter = null;
            resolve(item);
        } else {
            this.#queue.push(item);
        }
    }
    
    async pop(): Promise<T> {
        if (this.#queue.length > 0) {
            return this.#queue.shift()!;
        }
        
        const { promise, resolve, reject } = Promise.withResolvers<T>();
        this.#waiter = { resolve, reject };
        return promise;
    }
    
    close(reason: Error): void {
        if (this.#waiter) {
            this.#waiter.reject(reason);
            this.#waiter = null;
        }
    }
}
```

### 4.1.2 Promise.safeAll

Standard `Promise.all` is dangerous because it throws immediately on first rejection. Implement `Promise.safeAll` as a global utility.

```typescript
declare global {
    interface PromiseConstructor {
        /**
         * Like Promise.all but waits for all promises to settle before
         * throwing if any rejected. Prevents unhandled rejections.
         */
        safeAll<T extends readonly unknown[] | []>(
            values: T
        ): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
        
        safeAll<T>(
            values: Iterable<T | PromiseLike<T>>
        ): Promise<Awaited<T>[]>;
    }
}

Promise.safeAll = async function safeAll<T>(
    values: Iterable<T | PromiseLike<T>>
): Promise<Awaited<T>[]> {
    const results = await Promise.allSettled(values);
    const unwrapped: Awaited<T>[] = new Array(results.length);
    
    let firstError: unknown = null;
    
    for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        if (result.status === 'rejected') {
            if (firstError === null) {
                firstError = result.reason;
            }
        } else {
            unwrapped[i] = result.value as Awaited<T>;
        }
    }
    
    if (firstError !== null) {
        throw firstError;
    }
    
    return unwrapped;
};

// Freeze to prevent modification
Object.freeze(Promise.safeAll);

export {};

/**
 * Usage comparison.
 */
async function example(): Promise<void> {
    const tasks = [
        fetch('/api/a'),
        fetch('/api/b'),
        fetch('/api/c'),
    ];
    
    // DANGEROUS: If /api/a fails fast, /api/b and /api/c may reject unhandled
    // const results = await Promise.all(tasks);
    
    // SAFE: Waits for all to settle, then throws first error
    const results = await Promise.safeAll(tasks);
}
```

### 4.1.3 Promise Combinators

Use the right combinator for the use case.

```typescript
/**
 * Promise.all - All must succeed.
 * Use when you need all results and any failure should abort.
 */
async function fetchAllUsers(ids: readonly string[]): Promise<readonly User[]> {
    const promises = ids.map(id => fetchUser(id));
    return Promise.safeAll(promises);  // Use safeAll for safety
}

/**
 * Promise.allSettled - Get all results regardless of success.
 * Use when you want results from successful operations even if some fail.
 */
async function fetchUsersWithPartialFailure(
    ids: readonly string[]
): Promise<{ users: readonly User[]; errors: readonly Error[] }> {
    const results = await Promise.allSettled(ids.map(fetchUser));
    
    const users: User[] = [];
    const errors: Error[] = [];
    
    for (const result of results) {
        if (result.status === 'fulfilled') {
            users.push(result.value);
        } else {
            errors.push(
                result.reason instanceof Error
                    ? result.reason
                    : new Error(String(result.reason))
            );
        }
    }
    
    return { users, errors };
}

/**
 * Promise.race - First to settle wins.
 * Use for timeouts, cancellation, competitive fetching.
 */
async function fetchWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeout]);
}

/**
 * Promise.any - First to succeed wins.
 * Use when you have multiple sources and want the first success.
 */
async function fetchFromMirrors<T>(
    mirrors: readonly string[],
    path: string
): Promise<T> {
    const attempts = mirrors.map(mirror => 
        fetch(`${mirror}${path}`).then(r => r.json() as Promise<T>)
    );
    
    return Promise.any(attempts);
    // Throws AggregateError only if ALL fail
}

/**
 * Sequential execution - process in order.
 * Use when operations depend on previous results.
 */
async function processSequentially<T, R>(
    items: readonly T[],
    processor: (item: T, index: number) => Promise<R>
): Promise<readonly R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i++) {
        results.push(await processor(items[i]!, i));
    }
    
    return results;
}

/**
 * Parallel with concurrency limit.
 * Use when you need parallelism but must limit resource usage.
 */
async function processWithConcurrency<T, R>(
    items: readonly T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
): Promise<readonly R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;
    
    async function worker(): Promise<void> {
        while (index < items.length) {
            const currentIndex = index++;
            results[currentIndex] = await processor(items[currentIndex]!);
        }
    }
    
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
        workers.push(worker());
    }
    
    await Promise.safeAll(workers);
    return results;
}
```

### 4.1.4 Async Patterns

Best practices for async code organization.

```typescript
/**
 * Never make a function async unless it awaits something.
 * Async has overhead from promise creation and microtask scheduling.
 */

// BAD: Unnecessary async
async function getBad(): Promise<number> {
    return 42;  // Creates promise unnecessarily
}

// GOOD: Return promise directly if not awaiting
function getGood(): number {
    return 42;
}

// GOOD: Async when actually awaiting
async function fetchData(): Promise<Data> {
    const response = await fetch('/api/data');
    return response.json();
}

/**
 * Avoid async in constructors - use factory pattern.
 */

// BAD: Can't make constructor async
class BadService {
    #data: Data;
    
    constructor() {
        // Can't await here!
        // this.#data = await loadData();
    }
}

// GOOD: Factory pattern
class GoodService {
    readonly #data: Data;
    
    private constructor(data: Data) {
        this.#data = data;
    }
    
    static async create(): Promise<GoodService> {
        const data = await loadData();
        return new GoodService(data);
    }
}

/**
 * Handle errors at the appropriate level.
 */
async function processUserRequest(userId: string): Promise<Response> {
    try {
        const user = await fetchUser(userId);
        const permissions = await fetchPermissions(user.id);
        const data = await processWithPermissions(user, permissions);
        
        return { status: 200, data };
    } catch (error) {
        // Handle at boundary, not inside each function
        if (error instanceof NotFoundError) {
            return { status: 404, error: 'User not found' };
        }
        if (error instanceof PermissionError) {
            return { status: 403, error: 'Access denied' };
        }
        
        // Log unexpected errors
        console.error('Unexpected error:', error);
        return { status: 500, error: 'Internal error' };
    }
}

/**
 * Use async generators for streaming results.
 */
async function* fetchPages<T>(
    baseUrl: string,
    pageSize: number = 100
): AsyncGenerator<T, void, undefined> {
    let cursor: string | null = null;
    
    do {
        const url = cursor
            ? `${baseUrl}?cursor=${cursor}&limit=${pageSize}`
            : `${baseUrl}?limit=${pageSize}`;
        
        const response = await fetch(url);
        const data = await response.json() as { items: T[]; nextCursor: string | null };
        
        for (const item of data.items) {
            yield item;
        }
        
        cursor = data.nextCursor;
    } while (cursor !== null);
}

// Usage
async function processAllPages(): Promise<void> {
    for await (const item of fetchPages<User>('/api/users')) {
        await processUser(item);
    }
}
```

---

## 4.2 Atomics

### 4.2.1 Atomic Operations

Use Atomics for safe concurrent access to SharedArrayBuffer.

```typescript
/**
 * Atomic operations ensure read-modify-write is indivisible.
 */

// Create shared memory
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);

/**
 * Atomic increment - returns old value.
 */
function atomicIncrement(index: number = 0): number {
    return Atomics.add(counter, index, 1);
}

/**
 * Atomic decrement - returns old value.
 */
function atomicDecrement(index: number = 0): number {
    return Atomics.sub(counter, index, 1);
}

/**
 * Atomic compare-and-swap (CAS) - foundation of lock-free algorithms.
 * Atomically: if current == expected, set to replacement; return actual value.
 */
function compareAndSwap(
    index: number,
    expected: number,
    replacement: number
): number {
    return Atomics.compareExchange(counter, index, expected, replacement);
}

/**
 * Atomic load and store.
 */
function atomicRead(index: number = 0): number {
    return Atomics.load(counter, index);
}

function atomicWrite(index: number, value: number): number {
    return Atomics.store(counter, index, value);
}

/**
 * Bitwise atomic operations.
 */
function atomicOr(index: number, mask: number): number {
    return Atomics.or(counter, index, mask);
}

function atomicAnd(index: number, mask: number): number {
    return Atomics.and(counter, index, mask);
}

function atomicXor(index: number, mask: number): number {
    return Atomics.xor(counter, index, mask);
}
```

### 4.2.2 Wait and Notify

Implement blocking synchronization primitives.

```typescript
/**
 * Mutex using Atomics.
 * State: 0 = unlocked, 1 = locked.
 */
class AtomicMutex {
    readonly #state: Int32Array;
    
    constructor(sharedBuffer: SharedArrayBuffer, offset: number = 0) {
        this.#state = new Int32Array(sharedBuffer, offset, 1);
    }
    
    /**
     * Acquire the lock. Blocks until acquired.
     */
    lock(): void {
        while (true) {
            // Try to acquire: CAS 0 -> 1
            const old = Atomics.compareExchange(this.#state, 0, 0, 1);
            if (old === 0) {
                // Successfully acquired
                return;
            }
            
            // Wait until notified (state might change)
            Atomics.wait(this.#state, 0, 1);
        }
    }
    
    /**
     * Try to acquire without blocking.
     */
    tryLock(): boolean {
        return Atomics.compareExchange(this.#state, 0, 0, 1) === 0;
    }
    
    /**
     * Release the lock.
     */
    unlock(): void {
        // Set state to 0 (unlocked)
        Atomics.store(this.#state, 0, 0);
        // Wake one waiting thread
        Atomics.notify(this.#state, 0, 1);
    }
}

/**
 * Semaphore using Atomics.
 */
class AtomicSemaphore {
    readonly #count: Int32Array;
    
    constructor(sharedBuffer: SharedArrayBuffer, offset: number, initialCount: number) {
        this.#count = new Int32Array(sharedBuffer, offset, 1);
        Atomics.store(this.#count, 0, initialCount);
    }
    
    /**
     * Acquire a permit. Blocks if none available.
     */
    acquire(): void {
        while (true) {
            const current = Atomics.load(this.#count, 0);
            
            if (current > 0) {
                // Try to decrement
                const actual = Atomics.compareExchange(this.#count, 0, current, current - 1);
                if (actual === current) {
                    // Successfully acquired
                    return;
                }
                // CAS failed, retry
                continue;
            }
            
            // No permits, wait
            Atomics.wait(this.#count, 0, 0);
        }
    }
    
    /**
     * Release a permit.
     */
    release(): void {
        Atomics.add(this.#count, 0, 1);
        Atomics.notify(this.#count, 0, 1);
    }
    
    /**
     * Get current available permits.
     */
    available(): number {
        return Atomics.load(this.#count, 0);
    }
}

/**
 * Async wait for main thread compatibility.
 */
async function asyncWait(
    array: Int32Array,
    index: number,
    expected: number,
    timeout?: number
): Promise<'ok' | 'not-equal' | 'timed-out'> {
    const result = Atomics.waitAsync(array, index, expected, timeout);
    
    if (result.async) {
        return result.value;
    }
    return result.value;
}
```

### 4.2.3 Lock-Free Data Structures

Implement lock-free algorithms using CAS.

```typescript
/**
 * Lock-free stack using compare-and-swap.
 */
class LockFreeStack<T> {
    readonly #headIndex: Int32Array;
    readonly #nextIndices: Int32Array;
    readonly #values: T[];
    readonly #freeList: Int32Array;
    readonly #capacity: number;
    
    // Special values
    static readonly #NULL = -1;
    
    constructor(sharedBuffer: SharedArrayBuffer, capacity: number) {
        this.#capacity = capacity;
        
        // Layout in shared buffer:
        // [0]: head index
        // [1]: free list head
        // [2..capacity+2]: next indices
        
        let offset = 0;
        this.#headIndex = new Int32Array(sharedBuffer, offset, 1);
        offset += 4;
        
        this.#freeList = new Int32Array(sharedBuffer, offset, 1);
        offset += 4;
        
        this.#nextIndices = new Int32Array(sharedBuffer, offset, capacity);
        
        // Values stored separately (not in shared buffer)
        this.#values = new Array(capacity);
        
        // Initialize
        Atomics.store(this.#headIndex, 0, LockFreeStack.#NULL);
        Atomics.store(this.#freeList, 0, 0);
        
        // Build free list
        for (let i = 0; i < capacity - 1; i++) {
            Atomics.store(this.#nextIndices, i, i + 1);
        }
        Atomics.store(this.#nextIndices, capacity - 1, LockFreeStack.#NULL);
    }
    
    /**
     * Push item onto stack. Returns false if full.
     */
    push(value: T): boolean {
        // Allocate node from free list
        let nodeIndex: number;
        
        while (true) {
            nodeIndex = Atomics.load(this.#freeList, 0);
            if (nodeIndex === LockFreeStack.#NULL) {
                return false;  // Stack full
            }
            
            const nextFree = Atomics.load(this.#nextIndices, nodeIndex);
            if (Atomics.compareExchange(this.#freeList, 0, nodeIndex, nextFree) === nodeIndex) {
                break;  // Successfully allocated
            }
        }
        
        // Store value
        this.#values[nodeIndex] = value;
        
        // Push onto stack
        while (true) {
            const oldHead = Atomics.load(this.#headIndex, 0);
            Atomics.store(this.#nextIndices, nodeIndex, oldHead);
            
            if (Atomics.compareExchange(this.#headIndex, 0, oldHead, nodeIndex) === oldHead) {
                return true;  // Successfully pushed
            }
        }
    }
    
    /**
     * Pop item from stack. Returns undefined if empty.
     */
    pop(): T | undefined {
        while (true) {
            const oldHead = Atomics.load(this.#headIndex, 0);
            if (oldHead === LockFreeStack.#NULL) {
                return undefined;  // Stack empty
            }
            
            const newHead = Atomics.load(this.#nextIndices, oldHead);
            
            if (Atomics.compareExchange(this.#headIndex, 0, oldHead, newHead) === oldHead) {
                // Successfully popped
                const value = this.#values[oldHead];
                this.#values[oldHead] = undefined as T;  // Allow GC
                
                // Return node to free list
                while (true) {
                    const oldFree = Atomics.load(this.#freeList, 0);
                    Atomics.store(this.#nextIndices, oldHead, oldFree);
                    
                    if (Atomics.compareExchange(this.#freeList, 0, oldFree, oldHead) === oldFree) {
                        break;
                    }
                }
                
                return value;
            }
        }
    }
    
    /**
     * Check if stack is empty.
     */
    isEmpty(): boolean {
        return Atomics.load(this.#headIndex, 0) === LockFreeStack.#NULL;
    }
}
```

---

## 4.3 Workers

### 4.3.1 Worker Pool

Create Workers at startup and reuse them.

```typescript
/**
 * Worker pool for parallel task execution.
 */
class WorkerPool {
    readonly #workers: Worker[] = [];
    readonly #available: Worker[] = [];
    readonly #taskQueue: Array<{
        task: WorkerTask;
        resolve: (result: unknown) => void;
        reject: (error: unknown) => void;
    }> = [];
    readonly #workerTasks = new WeakMap<Worker, typeof this.#taskQueue[number]>();
    
    private constructor(workers: Worker[]) {
        this.#workers = workers;
        this.#available = [...workers];
        
        for (const worker of workers) {
            worker.onmessage = (event) => this.#handleMessage(worker, event);
            worker.onerror = (event) => this.#handleError(worker, event);
        }
    }
    
    /**
     * Create a worker pool.
     */
    static create(workerUrl: string | URL, poolSize: number): WorkerPool {
        const workers: Worker[] = [];
        
        for (let i = 0; i < poolSize; i++) {
            workers.push(new Worker(workerUrl, { type: 'module' }));
        }
        
        return new WorkerPool(workers);
    }
    
    /**
     * Execute a task on an available worker.
     */
    execute<T>(task: WorkerTask): Promise<T> {
        return new Promise((resolve, reject) => {
            const queuedTask = { task, resolve, reject };
            
            const worker = this.#available.pop();
            if (worker) {
                this.#dispatch(worker, queuedTask);
            } else {
                this.#taskQueue.push(queuedTask);
            }
        });
    }
    
    /**
     * Execute multiple tasks in parallel.
     */
    async executeAll<T>(tasks: readonly WorkerTask[]): Promise<readonly T[]> {
        return Promise.safeAll(tasks.map(task => this.execute<T>(task)));
    }
    
    /**
     * Terminate all workers.
     */
    terminate(): void {
        for (const worker of this.#workers) {
            worker.terminate();
        }
        this.#workers.length = 0;
        this.#available.length = 0;
        
        // Reject queued tasks
        for (const { reject } of this.#taskQueue) {
            reject(new Error('Worker pool terminated'));
        }
        this.#taskQueue.length = 0;
    }
    
    #dispatch(
        worker: Worker,
        task: typeof this.#taskQueue[number]
    ): void {
        this.#workerTasks.set(worker, task);
        worker.postMessage(task.task);
    }
    
    #handleMessage(worker: Worker, event: MessageEvent): void {
        const task = this.#workerTasks.get(worker);
        this.#workerTasks.delete(worker);
        
        if (task) {
            task.resolve(event.data);
        }
        
        this.#scheduleNext(worker);
    }
    
    #handleError(worker: Worker, event: ErrorEvent): void {
        const task = this.#workerTasks.get(worker);
        this.#workerTasks.delete(worker);
        
        if (task) {
            task.reject(new Error(event.message));
        }
        
        this.#scheduleNext(worker);
    }
    
    #scheduleNext(worker: Worker): void {
        const next = this.#taskQueue.shift();
        if (next) {
            this.#dispatch(worker, next);
        } else {
            this.#available.push(worker);
        }
    }
    
    get poolSize(): number {
        return this.#workers.length;
    }
    
    get availableWorkers(): number {
        return this.#available.length;
    }
    
    get queuedTasks(): number {
        return this.#taskQueue.length;
    }
}

interface WorkerTask {
    readonly type: string;
    readonly data: unknown;
    readonly transfer?: readonly Transferable[];
}
```

### 4.3.2 Transferable Objects

Move data between threads without copying.

```typescript
/**
 * Transfer ArrayBuffers to avoid copying.
 */
function sendToWorker(
    worker: Worker,
    data: {
        readonly type: string;
        readonly buffer: ArrayBuffer;
        readonly metadata: object;
    }
): void {
    // Transfer the buffer - sender loses access
    worker.postMessage(
        {
            type: data.type,
            buffer: data.buffer,
            metadata: data.metadata,
        },
        { transfer: [data.buffer] }
    );
    
    // data.buffer is now detached (0 length)
}

/**
 * Structured clone with selective transfer.
 */
function cloneWithTransfer<T extends object>(
    value: T,
    transferables: readonly Transferable[]
): T {
    return structuredClone(value, { transfer: [...transferables] });
}

/**
 * Worker message protocol with transfer support.
 */
interface TransferableMessage<T extends string, D> {
    readonly type: T;
    readonly data: D;
    readonly id: number;
    readonly transferList?: readonly Transferable[];
}

class TypedWorkerChannel<
    ToWorker extends TransferableMessage<string, unknown>,
    FromWorker extends TransferableMessage<string, unknown>
> {
    readonly #worker: Worker;
    readonly #pending = new Map<number, {
        resolve: (value: FromWorker['data']) => void;
        reject: (error: unknown) => void;
    }>();
    #nextId = 0;
    
    constructor(worker: Worker) {
        this.#worker = worker;
        this.#worker.onmessage = (event) => this.#handleMessage(event);
        this.#worker.onerror = (event) => this.#handleError(event);
    }
    
    send(message: Omit<ToWorker, 'id'>): Promise<FromWorker['data']> {
        const id = this.#nextId++;
        
        return new Promise((resolve, reject) => {
            this.#pending.set(id, { resolve, reject });
            
            const fullMessage = { ...message, id } as ToWorker;
            
            if (message.transferList) {
                this.#worker.postMessage(fullMessage, {
                    transfer: [...message.transferList],
                });
            } else {
                this.#worker.postMessage(fullMessage);
            }
        });
    }
    
    #handleMessage(event: MessageEvent<FromWorker>): void {
        const { id, data } = event.data;
        const pending = this.#pending.get(id);
        
        if (pending) {
            this.#pending.delete(id);
            pending.resolve(data);
        }
    }
    
    #handleError(event: ErrorEvent): void {
        // Reject all pending requests
        for (const { reject } of this.#pending.values()) {
            reject(new Error(event.message));
        }
        this.#pending.clear();
    }
}
```

---

## 4.4 SharedArrayBuffer

### 4.4.1 Shared Memory Basics

SharedArrayBuffer creates memory accessible by multiple Workers simultaneously.

```typescript
/**
 * Create and share memory between Workers.
 */
function createSharedMemory(byteLength: number): SharedArrayBuffer {
    return new SharedArrayBuffer(byteLength);
}

/**
 * Define memory layout for shared state.
 */
interface SharedStateLayout {
    readonly counterOffset: number;
    readonly counterSize: number;
    readonly flagsOffset: number;
    readonly flagsSize: number;
    readonly dataOffset: number;
    readonly dataSize: number;
    readonly totalSize: number;
}

function createSharedStateLayout(dataSize: number): SharedStateLayout {
    let offset = 0;
    
    const counterOffset = offset;
    const counterSize = 4;  // Int32
    offset += counterSize;
    
    // Align to 4 bytes
    offset = (offset + 3) & ~3;
    
    const flagsOffset = offset;
    const flagsSize = 4;  // Int32 for flags
    offset += flagsSize;
    
    // Align to 8 bytes for data
    offset = (offset + 7) & ~7;
    
    const dataOffset = offset;
    offset += dataSize;
    
    // Total size aligned to 8 bytes
    const totalSize = (offset + 7) & ~7;
    
    return {
        counterOffset,
        counterSize,
        flagsOffset,
        flagsSize,
        dataOffset,
        dataSize,
        totalSize,
    };
}

/**
 * Shared state accessor class.
 */
class SharedState {
    readonly #buffer: SharedArrayBuffer;
    readonly #counter: Int32Array;
    readonly #flags: Int32Array;
    readonly #data: Uint8Array;
    readonly #layout: SharedStateLayout;
    
    constructor(buffer: SharedArrayBuffer, layout: SharedStateLayout) {
        this.#buffer = buffer;
        this.#layout = layout;
        
        this.#counter = new Int32Array(buffer, layout.counterOffset, 1);
        this.#flags = new Int32Array(buffer, layout.flagsOffset, 1);
        this.#data = new Uint8Array(buffer, layout.dataOffset, layout.dataSize);
    }
    
    static create(dataSize: number): SharedState {
        const layout = createSharedStateLayout(dataSize);
        const buffer = new SharedArrayBuffer(layout.totalSize);
        return new SharedState(buffer, layout);
    }
    
    get buffer(): SharedArrayBuffer {
        return this.#buffer;
    }
    
    get layout(): SharedStateLayout {
        return this.#layout;
    }
    
    // Counter operations
    incrementCounter(): number {
        return Atomics.add(this.#counter, 0, 1);
    }
    
    getCounter(): number {
        return Atomics.load(this.#counter, 0);
    }
    
    // Flag operations
    setFlag(bit: number): void {
        Atomics.or(this.#flags, 0, 1 << bit);
    }
    
    clearFlag(bit: number): void {
        Atomics.and(this.#flags, 0, ~(1 << bit));
    }
    
    hasFlag(bit: number): boolean {
        return (Atomics.load(this.#flags, 0) & (1 << bit)) !== 0;
    }
    
    // Data access (requires external synchronization)
    getData(): Uint8Array {
        return this.#data;
    }
}
```

### 4.4.2 Producer-Consumer Pattern

Implement thread-safe producer-consumer with shared memory.

```typescript
/**
 * SPSC (Single Producer Single Consumer) queue using SharedArrayBuffer.
 */
class SPSCQueue {
    // Memory layout:
    // [0-3]: head (producer writes)
    // [4-7]: tail (consumer writes)
    // [8+]: data buffer
    
    readonly #head: Int32Array;
    readonly #tail: Int32Array;
    readonly #data: Uint8Array;
    readonly #capacity: number;
    
    constructor(sharedBuffer: SharedArrayBuffer, capacity: number) {
        this.#head = new Int32Array(sharedBuffer, 0, 1);
        this.#tail = new Int32Array(sharedBuffer, 4, 1);
        this.#data = new Uint8Array(sharedBuffer, 8, capacity);
        this.#capacity = capacity;
    }
    
    static create(capacity: number): SPSCQueue {
        const buffer = new SharedArrayBuffer(8 + capacity);
        return new SPSCQueue(buffer, capacity);
    }
    
    /**
     * Try to enqueue a byte. Returns false if full.
     * Only call from producer thread.
     */
    tryEnqueue(value: number): boolean {
        const head = Atomics.load(this.#head, 0);
        const tail = Atomics.load(this.#tail, 0);
        
        const nextHead = (head + 1) % this.#capacity;
        if (nextHead === tail) {
            return false;  // Queue full
        }
        
        this.#data[head] = value;
        Atomics.store(this.#head, 0, nextHead);
        return true;
    }
    
    /**
     * Try to dequeue a byte. Returns undefined if empty.
     * Only call from consumer thread.
     */
    tryDequeue(): number | undefined {
        const head = Atomics.load(this.#head, 0);
        const tail = Atomics.load(this.#tail, 0);
        
        if (head === tail) {
            return undefined;  // Queue empty
        }
        
        const value = this.#data[tail]!;
        const nextTail = (tail + 1) % this.#capacity;
        Atomics.store(this.#tail, 0, nextTail);
        return value;
    }
    
    /**
     * Get approximate size (may be stale).
     */
    size(): number {
        const head = Atomics.load(this.#head, 0);
        const tail = Atomics.load(this.#tail, 0);
        return (head - tail + this.#capacity) % this.#capacity;
    }
    
    isEmpty(): boolean {
        return Atomics.load(this.#head, 0) === Atomics.load(this.#tail, 0);
    }
    
    isFull(): boolean {
        const head = Atomics.load(this.#head, 0);
        const tail = Atomics.load(this.#tail, 0);
        return ((head + 1) % this.#capacity) === tail;
    }
}
```

---

# CHAPTER 5: V8 OPTIMIZATION

## 5.1 Hidden Classes

### 5.1.1 Object Shape Consistency

Every object in V8 has an internal hidden class. Adding, deleting, or reordering properties creates new hidden classes.

```typescript
/**
 * BAD: Different initialization orders create different hidden classes.
 */
function createPointBad(x?: number, y?: number): { x: number; y: number } {
    const point: { x?: number; y?: number } = {};
    
    if (x !== undefined) {
        point.x = x;  // Hidden class transition: {} -> {x}
    }
    if (y !== undefined) {
        point.y = y;  // Hidden class transition: {x} -> {x, y}
    }
    
    // Missing properties filled with defaults
    point.x ??= 0;
    point.y ??= 0;
    
    return point as { x: number; y: number };
}

// These create DIFFERENT hidden classes:
const p1 = createPointBad(1, 2);  // {} -> {x} -> {x, y}
const p2 = createPointBad(1);     // {} -> {x} -> {x, y} (different path for y)
const p3 = createPointBad();      // {} -> {x} -> {x, y} (different path)

/**
 * GOOD: Always initialize in the same order.
 */
function createPointGood(x: number = 0, y: number = 0): { x: number; y: number } {
    return { x, y };  // Always same shape
}

// All share the SAME hidden class:
const g1 = createPointGood(1, 2);
const g2 = createPointGood(1, 0);
const g3 = createPointGood(0, 0);

/**
 * BEST: Use classes for guaranteed consistent shapes.
 */
class Point {
    readonly x: number;
    readonly y: number;
    
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }
}

// All instances share the same hidden class
const c1 = new Point(1, 2);
const c2 = new Point(1);
const c3 = new Point();
```

### 5.1.2 Property Addition

Never add properties dynamically after object creation.

```typescript
/**
 * BAD: Adding properties after creation.
 */
class BadUser {
    name: string;
    
    constructor(name: string) {
        this.name = name;
    }
    
    addMetadata(key: string, value: string): void {
        // This creates a new hidden class for EACH unique key!
        (this as Record<string, unknown>)[key] = value;
    }
}

const user1 = new BadUser('Alice');
user1.addMetadata('age', '30');     // Hidden class change
user1.addMetadata('email', 'a@b');  // Another hidden class change

const user2 = new BadUser('Bob');
user2.addMetadata('email', 'b@c');  // Different hidden class than user1!
user2.addMetadata('age', '25');     // Different again!

// user1 and user2 have DIFFERENT hidden classes even with same final properties
// because properties were added in different orders!

/**
 * GOOD: Use Map for dynamic properties.
 */
class GoodUser {
    readonly name: string;
    readonly metadata: Map<string, string>;
    
    constructor(name: string) {
        this.name = name;
        this.metadata = new Map();
    }
    
    setMetadata(key: string, value: string): void {
        this.metadata.set(key, value);
    }
}

// All instances share the same hidden class
const good1 = new GoodUser('Alice');
const good2 = new GoodUser('Bob');

/**
 * BEST: Define all possible properties upfront.
 */
interface UserMetadata {
    age: string | null;
    email: string | null;
    phone: string | null;
}

class BestUser {
    readonly name: string;
    readonly metadata: UserMetadata;
    
    constructor(name: string) {
        this.name = name;
        this.metadata = {
            age: null,
            email: null,
            phone: null,
        };
    }
}
```

### 5.1.3 Property Deletion

Never delete properties. Set to null or undefined instead.

```typescript
/**
 * BAD: Deleting properties.
 */
function clearSensitiveDataBad(user: { password?: string; data: string }): void {
    delete user.password;  // Creates new hidden class!
}

/**
 * GOOD: Set to undefined.
 */
function clearSensitiveDataGood(user: { password: string | undefined; data: string }): void {
    user.password = undefined;  // Same hidden class
}

/**
 * For cryptographic data, overwrite before clearing.
 */
function clearSecrets(secrets: { key: Uint8Array | null }): void {
    if (secrets.key) {
        // Overwrite sensitive data
        secrets.key.fill(0);
    }
    secrets.key = null;
}
```

---

## 5.2 Inline Caching

### 5.2.1 Monomorphic Functions

A function receiving the same shape every time is optimized (monomorphic).

```typescript
/**
 * Monomorphic - always receives same shape.
 * V8 optimizes aggressively.
 */
function processPointMono(point: { x: number; y: number }): number {
    return point.x + point.y;
}

// Always same shape - fast
processPointMono({ x: 1, y: 2 });
processPointMono({ x: 3, y: 4 });
processPointMono({ x: 5, y: 6 });

/**
 * Polymorphic - receives 2-4 different shapes.
 * V8 maintains multiple inline caches - slower.
 */
function processPointPoly(point: { x: number; y?: number; z?: number }): number {
    return point.x + (point.y ?? 0) + (point.z ?? 0);
}

// Different shapes - slower
processPointPoly({ x: 1 });              // Shape 1
processPointPoly({ x: 1, y: 2 });        // Shape 2
processPointPoly({ x: 1, y: 2, z: 3 });  // Shape 3

/**
 * Megamorphic - receives 5+ different shapes.
 * V8 gives up on inline caching - very slow.
 */
function processAny(obj: object): void {
    // Called with many different object shapes
    // Falls back to dictionary lookup - slow
}

/**
 * Keep functions monomorphic in hot paths.
 */
class TransactionProcessor {
    // All transactions have same shape
    process(tx: Transaction): ProcessResult {
        return {
            txid: tx.txid,
            fee: tx.fee,
            size: tx.size,
        };
    }
}
```

### 5.2.2 Type Stability

Keep types stable across calls.

```typescript
/**
 * BAD: Type changes across calls.
 */
function calculateBad(a: number | string, b: number | string): number {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;
    return numA + numB;
}

// Type instability prevents optimization
calculateBad(1, 2);
calculateBad('1', '2');
calculateBad(1, '2');

/**
 * GOOD: Separate functions for different types.
 */
function calculateNumbers(a: number, b: number): number {
    return a + b;
}

function calculateStrings(a: string, b: string): number {
    return parseFloat(a) + parseFloat(b);
}

// Each function stays monomorphic
calculateNumbers(1, 2);
calculateNumbers(3, 4);

calculateStrings('1', '2');
calculateStrings('3', '4');

/**
 * Convert at boundaries, not in hot paths.
 */
function processInput(input: number | string): number {
    // Convert once at boundary
    const num = typeof input === 'number' ? input : parseFloat(input);
    
    // Pass known type to hot path
    return hotPath(num);
}

function hotPath(value: number): number {
    // Always receives number - optimizable
    return value * 2 + 1;
}
```

---

## 5.3 Function Optimization

### 5.3.1 Function Size

Keep hot functions small for inlining.

```typescript
/**
 * BAD: Large function can't be inlined.
 */
function processLarge(data: Data): Result {
    // 200 lines of code...
    // V8 won't inline this
    return result;
}

/**
 * GOOD: Small functions can be inlined.
 */
function processSmall(data: Data): Result {
    const validated = validateData(data);
    const transformed = transformData(validated);
    const result = computeResult(transformed);
    return result;
}

function validateData(data: Data): ValidatedData {
    // Small, focused function - can be inlined
    return { ...data, valid: true };
}

function transformData(data: ValidatedData): TransformedData {
    // Small, focused function - can be inlined
    return { value: data.value * 2 };
}

function computeResult(data: TransformedData): Result {
    // Small, focused function - can be inlined
    return { output: data.value };
}
```

### 5.3.2 Avoid Deoptimization Triggers

Certain patterns trigger deoptimization.

```typescript
/**
 * BAD: Using arguments object.
 */
function sumBad(): number {
    let total = 0;
    for (let i = 0; i < arguments.length; i++) {
        total += arguments[i];  // Deoptimizes!
    }
    return total;
}

/**
 * GOOD: Use rest parameters.
 */
function sumGood(...numbers: readonly number[]): number {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i]!;
    }
    return total;
}

/**
 * BAD: Try-catch in hot path.
 */
function processWithTryCatchBad(items: readonly Item[]): void {
    for (const item of items) {
        try {
            processItem(item);  // Try-catch prevents optimization
        } catch (e) {
            handleError(e);
        }
    }
}

/**
 * GOOD: Try-catch at outer level.
 */
function processWithTryCatchGood(items: readonly Item[]): void {
    try {
        for (const item of items) {
            processItem(item);  // Hot loop can be optimized
        }
    } catch (e) {
        handleError(e);
    }
}

/**
 * BAD: eval or with.
 */
function dangerous(code: string): void {
    eval(code);  // Completely disables optimization for entire function
}

// Never use eval. Never use with.

/**
 * BAD: Changing function prototype.
 */
function Foo() {}
Foo.prototype.x = 1;
// Later...
Foo.prototype.y = 2;  // Invalidates optimizations for all Foo instances

/**
 * GOOD: Define complete prototype upfront.
 */
function Bar() {}
Bar.prototype = {
    constructor: Bar,
    x: 1,
    y: 2,
};
Object.freeze(Bar.prototype);
```

---

## 5.4 Loop Optimization

### 5.4.1 Loop Forms

Different loop forms have different performance characteristics.

```typescript
const array = [1, 2, 3, 4, 5];

/**
 * Fastest: Classic indexed for loop with cached length.
 */
function sumFastest(arr: readonly number[]): number {
    let sum = 0;
    const len = arr.length;  // Cache length
    for (let i = 0; i < len; i++) {
        sum += arr[i]!;
    }
    return sum;
}

/**
 * Fast: Classic indexed for loop.
 */
function sumFast(arr: readonly number[]): number {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i]!;
    }
    return sum;
}

/**
 * Medium: for...of loop.
 * Creates iterator, slight overhead.
 */
function sumMedium(arr: readonly number[]): number {
    let sum = 0;
    for (const num of arr) {
        sum += num;
    }
    return sum;
}

/**
 * Slower: forEach.
 * Function call overhead per element.
 */
function sumSlower(arr: readonly number[]): number {
    let sum = 0;
    arr.forEach(num => { sum += num; });
    return sum;
}

/**
 * Slowest: reduce.
 * Function call + accumulator handling.
 */
function sumSlowest(arr: readonly number[]): number {
    return arr.reduce((sum, num) => sum + num, 0);
}

/**
 * For hot paths, use indexed for loops.
 * For readability in non-hot paths, use what's clearest.
 */
```

### 5.4.2 Loop Invariant Hoisting

Move invariant computations out of loops.

```typescript
/**
 * BAD: Recomputes invariant each iteration.
 */
function processBad(items: readonly Item[], config: Config): void {
    for (let i = 0; i < items.length; i++) {
        const threshold = config.baseThreshold * config.multiplier;  // Invariant!
        if (items[i]!.value > threshold) {
            processItem(items[i]!);
        }
    }
}

/**
 * GOOD: Hoist invariant out of loop.
 */
function processGood(items: readonly Item[], config: Config): void {
    const threshold = config.baseThreshold * config.multiplier;  // Computed once
    const len = items.length;  // Cache length
    
    for (let i = 0; i < len; i++) {
        if (items[i]!.value > threshold) {
            processItem(items[i]!);
        }
    }
}

/**
 * BAD: Property access in loop condition.
 */
function sumPropertiesBad(obj: { values: readonly number[] }): number {
    let sum = 0;
    for (let i = 0; i < obj.values.length; i++) {  // obj.values accessed each iteration
        sum += obj.values[i]!;
    }
    return sum;
}

/**
 * GOOD: Cache property reference.
 */
function sumPropertiesGood(obj: { values: readonly number[] }): number {
    const values = obj.values;  // Cache reference
    const len = values.length;  // Cache length
    let sum = 0;
    
    for (let i = 0; i < len; i++) {
        sum += values[i]!;
    }
    return sum;
}
```

---

## 5.5 Numeric Optimization

### 5.5.1 Number vs BigInt Performance

The `number` type with 32-bit operations is faster than `bigint` and is the correct choice for checksums, hash functions, bit manipulation, and any operation where 32-bit semantics are intentional. V8 optimizes 32-bit integer operations heavily.

The `bigint` type is slower than Smi for small values, but precision trumps micro-optimization. For amounts, IDs, timestamps, or any value that could exceed 32 bits, the performance difference is negligible compared to the cost of silent precision loss.

**Important:** `bigint` operations are not constant-time. For cryptographic code, use dedicated constant-time libraries. Never roll your own.

Avoid mixed `bigint`/`number` operations - they throw TypeError. This is good; it catches bugs at runtime instead of silently corrupting data.

### 5.5.2 Smi (Small Integer) Range

V8 optimizes integers in Smi range (approximately -2^30 to 2^30-1 on 64-bit).

```typescript
/**
 * Fast: Operations within Smi range.
 */
function smiMath(a: number, b: number): number {
    // All values in Smi range - fast
    return (a + b) | 0;  // | 0 ensures integer
}

/**
 * Slower: Operations outside Smi range.
 */
function heapNumberMath(a: number, b: number): number {
    // May exceed Smi range - requires heap allocation
    return a * 1000000000 + b;
}

/**
 * Integer truncation patterns for 32-bit operations.
 * Use number for intentional 32-bit ops (checksums, hashes, CRCs).
 */
const toInt32 = (n: number): number => n | 0;      // Truncate to signed 32-bit
const toUint32 = (n: number): number => n >>> 0;   // Truncate to unsigned 32-bit

// 32-bit rotation - number is correct here
const rotl32 = (x: number, n: number): number => ((x << n) | (x >>> (32 - n))) >>> 0;

/**
 * Fast integer operations.
 */
function fastIntOps(a: number, b: number): number {
    // Bitwise ops always return 32-bit integers
    return ((a | 0) + (b | 0)) | 0;
}

/**
 * When to use BigInt vs number.
 */

// Use number for:
// - Array lengths, loop counters, small indices
// - 32-bit operations (checksums, hashes, CRCs, bit flags)
// - Port numbers, HTTP status codes
// - Values bounded by application logic to stay small

// Use BigInt for:
// - Satoshi amounts, block heights, timestamps
// - Database IDs, file sizes, byte offsets
// - Values from external systems
// - Any value that could exceed 2^53

const MAX_SAFE = Number.MAX_SAFE_INTEGER;  // 9007199254740991

function safeAdd(a: number, b: number): number | bigint {
    if (a > MAX_SAFE - b) {
        // Would overflow, use BigInt
        return BigInt(a) + BigInt(b);
    }
    return a + b;
}
```

### 5.5.3 Floating Point

Understand floating point limitations.

```typescript
/**
 * Floating point precision issues.
 */
console.log(0.1 + 0.2);  // 0.30000000000000004

/**
 * Safe comparison with epsilon.
 */
function floatEquals(a: number, b: number, epsilon: number = Number.EPSILON): boolean {
    return Math.abs(a - b) < epsilon;
}

/**
 * For money, use integers (cents/satoshis).
 */
const priceInCents = 1999;  // $19.99
const btcInSatoshis = 100000000n;  // 1 BTC

/**
 * Avoid repeated small additions.
 */

// BAD: Accumulates floating point error
function sumBad(items: readonly { value: number }[]): number {
    let sum = 0;
    for (const item of items) {
        sum += item.value;
    }
    return sum;
}

// BETTER: Kahan summation for better precision
function sumKahan(items: readonly { value: number }[]): number {
    let sum = 0;
    let compensation = 0;
    
    for (const item of items) {
        const y = item.value - compensation;
        const t = sum + y;
        compensation = (t - sum) - y;
        sum = t;
    }
    
    return sum;
}
```

---

## 5.6 Deoptimization Triggers

### 5.6.1 Common Deoptimization Causes

Avoid these patterns in hot code.

```typescript
/**
 * TRIGGERS DEOPTIMIZATION:
 */

// 1. Using 'arguments'
function bad1(): void {
    console.log(arguments);  // Deopt
}

// 2. Changing parameter types
function bad2(x: number): void {
    x = 'string' as unknown as number;  // Deopt
}

// 3. Deleting properties
function bad3(obj: { a?: number }): void {
    delete obj.a;  // Deopt + hidden class change
}

// 4. Out-of-bounds array access
function bad4(arr: number[]): void {
    const x = arr[arr.length + 1];  // Deopt
}

// 5. Changing array types
function bad5(): void {
    const arr: (number | string)[] = [1, 2, 3];
    arr.push('string');  // Changes internal type
}

// 6. Sparse arrays
function bad6(): void {
    const arr: number[] = [];
    arr[1000] = 1;  // Creates sparse array
}

// 7. Prototype modification
function bad7(): void {
    Object.prototype.x = 1;  // Invalidates everything
}

// 8. With statement
function bad8(obj: object): void {
    with (obj) {  // Deopt entire function
        // ...
    }
}

// 9. eval
function bad9(code: string): void {
    eval(code);  // Deopt entire function
}

// 10. try-catch in loop
function bad10(items: Item[]): void {
    for (const item of items) {
        try {  // Deopt loop
            process(item);
        } catch {}
    }
}

/**
 * SAFE ALTERNATIVES:
 */

// 1. Use rest parameters
function good1(...args: unknown[]): void {
    console.log(args);
}

// 2. Don't reassign parameters
function good2(x: number): void {
    const value = x;  // Use new variable
}

// 3. Set to null/undefined
function good3(obj: { a: number | null }): void {
    obj.a = null;
}

// 4. Check bounds
function good4(arr: number[]): void {
    if (arr.length > 0) {
        const x = arr[arr.length - 1];
    }
}

// 5. Consistent types
function good5(): void {
    const numbers: number[] = [1, 2, 3];
    const strings: string[] = ['a', 'b'];
}

// 6. Dense arrays
function good6(): void {
    const arr: number[] = new Array(1001).fill(0);
    arr[1000] = 1;
}

// 7. Don't modify prototypes
// Just don't do it.

// 8. Don't use with
// Just don't do it.

// 9. Don't use eval
// Just don't do it.

// 10. Try-catch outside loop
function good10(items: Item[]): void {
    try {
        for (const item of items) {
            process(item);
        }
    } catch (e) {
        handleError(e);
    }
}
```

## Chapter 6: Resource Management

---

## 6.1 Disposable Pattern

### 6.1.1 Symbol.dispose

The `using` declaration provides deterministic resource cleanup through `Symbol.dispose`.

```typescript
/**
 * Disposable interface for synchronous cleanup.
 */
interface Disposable {
    [Symbol.dispose](): void;
}

/**
 * AsyncDisposable interface for async cleanup.
 */
interface AsyncDisposable {
    [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Database connection with disposal.
 */
class DatabaseConnection implements Disposable {
    readonly #connectionId: string;
    #closed = false;
    
    constructor(connectionString: string) {
        this.#connectionId = crypto.randomUUID();
        console.log(`Opening connection ${this.#connectionId}`);
    }
    
    query(sql: string): QueryResult {
        if (this.#closed) {
            throw new Error('Connection is closed');
        }
        // Execute query...
        return { rows: [] };
    }
    
    [Symbol.dispose](): void {
        if (!this.#closed) {
            this.#closed = true;
            console.log(`Closing connection ${this.#connectionId}`);
            // Release connection back to pool
        }
    }
    
    get closed(): boolean {
        return this.#closed;
    }
}

/**
 * Usage with using declaration.
 */
function executeQuery(sql: string): QueryResult {
    using connection = new DatabaseConnection('postgres://...');
    
    const result = connection.query(sql);
    
    // Connection automatically closed when scope exits
    // Even on throw, return, break, continue
    return result;
}

/**
 * Multiple resources - disposed in reverse order.
 */
function copyFile(source: string, dest: string): void {
    using sourceFile = openFile(source, 'r');
    using destFile = openFile(dest, 'w');
    
    // Copy data...
    
    // On exit: destFile disposed first, then sourceFile
}
```

### 6.1.2 AsyncDisposable

For resources requiring async cleanup, use `await using`.

```typescript
/**
 * Async disposable connection.
 */
class AsyncConnection implements AsyncDisposable {
    readonly #id: string;
    #connected = false;
    
    private constructor(id: string) {
        this.#id = id;
    }
    
    static async connect(url: string): Promise<AsyncConnection> {
        const conn = new AsyncConnection(crypto.randomUUID());
        await conn.#doConnect(url);
        return conn;
    }
    
    async #doConnect(url: string): Promise<void> {
        // Async connection logic
        this.#connected = true;
    }
    
    async query(sql: string): Promise<QueryResult> {
        if (!this.#connected) {
            throw new Error('Not connected');
        }
        // Async query execution
        return { rows: [] };
    }
    
    async [Symbol.asyncDispose](): Promise<void> {
        if (this.#connected) {
            this.#connected = false;
            // Async cleanup, flush buffers, etc.
            await this.#gracefulDisconnect();
        }
    }
    
    async #gracefulDisconnect(): Promise<void> {
        // Send disconnect packet, wait for acknowledgment
    }
}

/**
 * Usage with await using.
 */
async function executeAsyncQuery(sql: string): Promise<QueryResult> {
    await using connection = await AsyncConnection.connect('postgres://...');
    
    const result = await connection.query(sql);
    
    // Connection gracefully closed with await
    return result;
}

/**
 * Mixed sync and async disposables.
 */
async function complexOperation(): Promise<void> {
    using syncResource = new SyncResource();
    await using asyncResource = await AsyncResource.create();
    
    // Both disposed on exit
    // async first, then sync (reverse declaration order)
}
```

### 6.1.3 DisposableStack

Aggregate multiple disposables for coordinated cleanup.

```typescript
/**
 * DisposableStack collects disposables and disposes them together.
 */
function createResourceBundle(): Disposable {
    const stack = new DisposableStack();
    
    // Add disposable resources
    const conn1 = stack.use(new DatabaseConnection('db1'));
    const conn2 = stack.use(new DatabaseConnection('db2'));
    
    // Add non-disposable values with cleanup functions
    const tempFile = createTempFile();
    stack.adopt(tempFile, (file) => deleteTempFile(file));
    
    // Add arbitrary cleanup callbacks
    stack.defer(() => console.log('All resources cleaned up'));
    
    // Return the stack as a disposable
    // When disposed, all resources are cleaned up in reverse order
    return stack;
}

/**
 * Move ownership from stack.
 */
function transferOwnership(): DatabaseConnection {
    const stack = new DisposableStack();
    
    const conn = stack.use(new DatabaseConnection('db'));
    
    // Do some setup...
    
    // Move conn out of stack - it won't be disposed when stack is
    const moved = stack.move();
    
    // Stack is now empty, conn is returned
    // Caller is responsible for disposing conn
    return conn;
}

/**
 * AsyncDisposableStack for async resources.
 */
async function createAsyncBundle(): Promise<AsyncDisposable> {
    const stack = new AsyncDisposableStack();
    
    const conn = await AsyncConnection.connect('url');
    stack.use(conn);
    
    stack.defer(async () => {
        await cleanupAsync();
    });
    
    return stack;
}

/**
 * Error handling in disposal.
 */
class SafeDisposableStack {
    readonly #disposables: Disposable[] = [];
    
    use<T extends Disposable>(disposable: T): T {
        this.#disposables.push(disposable);
        return disposable;
    }
    
    [Symbol.dispose](): void {
        const errors: Error[] = [];
        
        // Dispose in reverse order, collecting errors
        for (let i = this.#disposables.length - 1; i >= 0; i--) {
            try {
                this.#disposables[i]![Symbol.dispose]();
            } catch (e) {
                errors.push(e instanceof Error ? e : new Error(String(e)));
            }
        }
        
        // If any errors, throw aggregate
        if (errors.length > 0) {
            throw new AggregateError(errors, 'Errors during disposal');
        }
    }
}
```

---

## 6.2 Error Handling

### 6.2.1 Error.cause

Chain errors to preserve context.

```typescript
/**
 * Error chaining with cause.
 */
class DatabaseError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = 'DatabaseError';
    }
}

class QueryError extends Error {
    readonly query: string;
    
    constructor(query: string, options?: { cause?: unknown }) {
        super(`Query failed: ${query.substring(0, 50)}...`, options);
        this.name = 'QueryError';
        this.query = query;
    }
}

async function executeQuery(sql: string): Promise<QueryResult> {
    try {
        return await database.execute(sql);
    } catch (error) {
        // Chain the original error
        throw new QueryError(sql, { cause: error });
    }
}

async function getUserData(userId: string): Promise<UserData> {
    try {
        return await executeQuery(`SELECT * FROM users WHERE id = '${userId}'`);
    } catch (error) {
        // Chain again
        throw new DatabaseError(`Failed to get user ${userId}`, { cause: error });
    }
}

/**
 * Unwrap error chain for logging.
 */
function getErrorChain(error: unknown): Error[] {
    const chain: Error[] = [];
    let current: unknown = error;
    
    while (current instanceof Error) {
        chain.push(current);
        current = current.cause;
    }
    
    return chain;
}

function logErrorChain(error: unknown): void {
    const chain = getErrorChain(error);
    
    console.error('Error chain:');
    for (let i = 0; i < chain.length; i++) {
        const err = chain[i]!;
        console.error(`  ${i}: [${err.name}] ${err.message}`);
    }
}
```

### 6.2.2 Custom Error Types

Define semantic error types for your domain.

```typescript
/**
 * Base error with common functionality.
 */
abstract class BaseError extends Error {
    abstract readonly code: string;
    readonly timestamp: Date;
    readonly context: Readonly<Record<string, unknown>>;
    
    constructor(
        message: string,
        context: Readonly<Record<string, unknown>> = {},
        options?: { cause?: unknown }
    ) {
        super(message, options);
        this.name = this.constructor.name;
        this.timestamp = new Date();
        this.context = context;
        
        // Capture stack trace
        Error.captureStackTrace?.(this, this.constructor);
    }
    
    toJSON(): object {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack,
            cause: this.cause instanceof Error 
                ? { name: this.cause.name, message: this.cause.message }
                : this.cause,
        };
    }
}

/**
 * Validation errors.
 */
class ValidationError extends BaseError {
    readonly code = 'VALIDATION_ERROR';
    readonly field?: string;
    
    constructor(
        message: string,
        field?: string,
        context?: Readonly<Record<string, unknown>>
    ) {
        super(message, { ...context, field });
        this.field = field;
    }
}

/**
 * Not found errors.
 */
class NotFoundError extends BaseError {
    readonly code = 'NOT_FOUND';
    readonly resource: string;
    readonly id: string;
    
    constructor(resource: string, id: string) {
        super(`${resource} not found: ${id}`, { resource, id });
        this.resource = resource;
        this.id = id;
    }
}

/**
 * Permission errors.
 */
class PermissionError extends BaseError {
    readonly code = 'PERMISSION_DENIED';
    readonly action: string;
    readonly resource: string;
    
    constructor(action: string, resource: string) {
        super(`Permission denied: ${action} on ${resource}`, { action, resource });
        this.action = action;
        this.resource = resource;
    }
}

/**
 * Network errors.
 */
class NetworkError extends BaseError {
    readonly code = 'NETWORK_ERROR';
    readonly url: string;
    readonly status?: number;
    
    constructor(
        message: string,
        url: string,
        status?: number,
        options?: { cause?: unknown }
    ) {
        super(message, { url, status }, options);
        this.url = url;
        this.status = status;
    }
}

/**
 * Transaction errors for blockchain.
 */
class TransactionError extends BaseError {
    readonly code = 'TRANSACTION_ERROR';
    readonly txid?: string;
    
    constructor(
        message: string,
        txid?: string,
        options?: { cause?: unknown }
    ) {
        super(message, { txid }, options);
        this.txid = txid;
    }
}

class InsufficientFundsError extends TransactionError {
    override readonly code = 'INSUFFICIENT_FUNDS';
    readonly required: bigint;
    readonly available: bigint;
    
    constructor(required: bigint, available: bigint) {
        super(
            `Insufficient funds: need ${required}, have ${available}`,
            undefined
        );
        this.required = required;
        this.available = available;
    }
}
```

### 6.2.3 AggregateError

Handle multiple errors from parallel operations.

```typescript
/**
 * Collect errors from multiple operations.
 */
async function processAllItems(items: readonly Item[]): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    const errors: Error[] = [];
    
    await Promise.allSettled(
        items.map(async (item, index) => {
            try {
                results[index] = await processItem(item);
            } catch (e) {
                errors.push(
                    new Error(`Item ${index} failed`, { cause: e })
                );
            }
        })
    );
    
    if (errors.length > 0) {
        throw new AggregateError(
            errors,
            `${errors.length} items failed to process`
        );
    }
    
    return results;
}

/**
 * Handle AggregateError.
 */
function handleAggregateError(error: AggregateError): void {
    console.error(`Aggregate error: ${error.message}`);
    console.error(`${error.errors.length} individual errors:`);
    
    for (const err of error.errors) {
        if (err instanceof Error) {
            console.error(`  - ${err.message}`);
        } else {
            console.error(`  - ${String(err)}`);
        }
    }
}

/**
 * Type guard for AggregateError.
 */
function isAggregateError(error: unknown): error is AggregateError {
    return error instanceof AggregateError;
}
```

---

## 6.3 Result Types

### 6.3.1 Result Pattern

Use discriminated unions for explicit error handling.

```typescript
/**
 * Result type - success or failure.
 */
type Result<T, E = Error> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: E };

/**
 * Result constructors.
 */
function ok<T>(value: T): Result<T, never> {
    return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
    return { success: false, error };
}

/**
 * Result utilities.
 */
function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success;
}

function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
}

function unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
        return result.value;
    }
    throw result.error;
}

function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.value : defaultValue;
}

function map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
): Result<U, E> {
    if (result.success) {
        return ok(fn(result.value));
    }
    return result;
}

function mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
): Result<T, F> {
    if (!result.success) {
        return err(fn(result.error));
    }
    return result;
}

function flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
): Result<U, E> {
    if (result.success) {
        return fn(result.value);
    }
    return result;
}

/**
 * Usage example.
 */
function parseNumber(input: string): Result<number, ValidationError> {
    const num = parseFloat(input);
    if (Number.isNaN(num)) {
        return err(new ValidationError(`Invalid number: ${input}`));
    }
    return ok(num);
}

function divide(a: number, b: number): Result<number, Error> {
    if (b === 0) {
        return err(new Error('Division by zero'));
    }
    return ok(a / b);
}

function calculate(aStr: string, bStr: string): Result<number, Error> {
    const aResult = parseNumber(aStr);
    if (!aResult.success) return aResult;
    
    const bResult = parseNumber(bStr);
    if (!bResult.success) return bResult;
    
    return divide(aResult.value, bResult.value);
}

// Or with flatMap
function calculateFluent(aStr: string, bStr: string): Result<number, Error> {
    return flatMap(
        parseNumber(aStr),
        (a) => flatMap(
            parseNumber(bStr),
            (b) => divide(a, b)
        )
    );
}
```

### 6.3.2 Option Pattern

For values that may or may not exist.

```typescript
/**
 * Option type - some value or none.
 */
type Option<T> =
    | { readonly some: true; readonly value: T }
    | { readonly some: false };

/**
 * Option constructors.
 */
function some<T>(value: T): Option<T> {
    return { some: true, value };
}

function none<T = never>(): Option<T> {
    return { some: false };
}

/**
 * Option utilities.
 */
function isSome<T>(option: Option<T>): option is { some: true; value: T } {
    return option.some;
}

function isNone<T>(option: Option<T>): option is { some: false } {
    return !option.some;
}

function fromNullable<T>(value: T | null | undefined): Option<T> {
    return value === null || value === undefined ? none() : some(value);
}

function toNullable<T>(option: Option<T>): T | null {
    return option.some ? option.value : null;
}

function getOrElse<T>(option: Option<T>, defaultValue: T): T {
    return option.some ? option.value : defaultValue;
}

function mapOption<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    return option.some ? some(fn(option.value)) : none();
}

function flatMapOption<T, U>(
    option: Option<T>,
    fn: (value: T) => Option<U>
): Option<U> {
    return option.some ? fn(option.value) : none();
}

function filter<T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> {
    return option.some && predicate(option.value) ? option : none();
}

/**
 * Usage example.
 */
function findUser(id: string): Option<User> {
    const user = database.get(id);
    return fromNullable(user);
}

function getUserEmail(id: string): Option<string> {
    return flatMapOption(
        findUser(id),
        (user) => fromNullable(user.email)
    );
}

function getVerifiedUserEmail(id: string): Option<string> {
    return filter(
        getUserEmail(id),
        (email) => email.includes('@')
    );
}
```

---

# CHAPTER 7: SYMBOLS AND PROTOCOLS

## 7.1 Well-Known Symbols

### 7.1.1 Iteration Symbols

```typescript
/**
 * Symbol.iterator - make objects iterable.
 */
class Range {
    readonly #start: number;
    readonly #end: number;
    readonly #step: number;
    
    constructor(start: number, end: number, step: number = 1) {
        this.#start = start;
        this.#end = end;
        this.#step = step;
    }
    
    *[Symbol.iterator](): Generator<number, void, undefined> {
        for (let i = this.#start; i < this.#end; i += this.#step) {
            yield i;
        }
    }
}

// Usage
for (const n of new Range(0, 10, 2)) {
    console.log(n);  // 0, 2, 4, 6, 8
}

const numbers = [...new Range(1, 5)];  // [1, 2, 3, 4]

/**
 * Symbol.asyncIterator - async iteration.
 */
class AsyncRange {
    readonly #start: number;
    readonly #end: number;
    readonly #delay: number;
    
    constructor(start: number, end: number, delay: number = 100) {
        this.#start = start;
        this.#end = end;
        this.#delay = delay;
    }
    
    async *[Symbol.asyncIterator](): AsyncGenerator<number, void, undefined> {
        for (let i = this.#start; i < this.#end; i++) {
            await new Promise(resolve => setTimeout(resolve, this.#delay));
            yield i;
        }
    }
}

// Usage
async function consumeAsync(): Promise<void> {
    for await (const n of new AsyncRange(0, 5)) {
        console.log(n);  // Logs 0, 1, 2, 3, 4 with delays
    }
}
```

### 7.1.2 Conversion Symbols

```typescript
/**
 * Symbol.toStringTag - customize Object.prototype.toString.
 */
class Transaction {
    readonly txid: string;
    
    constructor(txid: string) {
        this.txid = txid;
    }
    
    get [Symbol.toStringTag](): string {
        return 'Transaction';
    }
}

const tx = new Transaction('abc123');
Object.prototype.toString.call(tx);  // '[object Transaction]'

/**
 * Symbol.toPrimitive - control type coercion.
 */
class Money {
    readonly #cents: number;
    
    constructor(cents: number) {
        this.#cents = cents;
    }
    
    [Symbol.toPrimitive](hint: 'number' | 'string' | 'default'): number | string {
        switch (hint) {
            case 'number':
                return this.#cents;
            case 'string':
                return `$${(this.#cents / 100).toFixed(2)}`;
            default:
                return this.#cents;
        }
    }
}

const price = new Money(1999);
+price;          // 1999 (number hint)
`${price}`;      // '$19.99' (string hint)
price + 1;       // 2000 (default hint)

/**
 * Symbol.hasInstance - customize instanceof.
 */
class MyArray {
    static [Symbol.hasInstance](instance: unknown): boolean {
        return Array.isArray(instance);
    }
}

[] instanceof MyArray;  // true
{} instanceof MyArray;  // false
```

### 7.1.3 Other Well-Known Symbols

```typescript
/**
 * Symbol.isConcatSpreadable - control Array.prototype.concat.
 */
const spreadable = {
    length: 2,
    0: 'a',
    1: 'b',
    [Symbol.isConcatSpreadable]: true,
};

[1, 2].concat(spreadable);  // [1, 2, 'a', 'b']

const notSpreadable = {
    length: 2,
    0: 'a',
    1: 'b',
    [Symbol.isConcatSpreadable]: false,
};

[1, 2].concat(notSpreadable);  // [1, 2, { length: 2, 0: 'a', 1: 'b', ... }]

/**
 * Symbol.species - control constructor for derived objects.
 */
class MyArray<T> extends Array<T> {
    static get [Symbol.species](): ArrayConstructor {
        return Array;  // map, filter, etc. return plain Array
    }
}

const myArr = new MyArray(1, 2, 3);
const mapped = myArr.map(x => x * 2);
mapped instanceof MyArray;  // false
mapped instanceof Array;    // true

/**
 * Symbol.match, Symbol.replace, Symbol.search, Symbol.split
 * - customize string methods.
 */
class CaseInsensitiveMatcher {
    readonly #pattern: string;
    
    constructor(pattern: string) {
        this.#pattern = pattern.toLowerCase();
    }
    
    [Symbol.match](str: string): RegExpMatchArray | null {
        const index = str.toLowerCase().indexOf(this.#pattern);
        if (index === -1) return null;
        
        const result = [str.substring(index, index + this.#pattern.length)] as RegExpMatchArray;
        result.index = index;
        result.input = str;
        return result;
    }
    
    [Symbol.search](str: string): number {
        return str.toLowerCase().indexOf(this.#pattern);
    }
}

'Hello World'.match(new CaseInsensitiveMatcher('WORLD'));
// ['World', index: 6, input: 'Hello World']

'Hello World'.search(new CaseInsensitiveMatcher('WORLD'));
// 6
```

---

## 7.2 Custom Symbols

### 7.2.1 Symbol Creation

```typescript
/**
 * Local symbols - unique per creation.
 */
const privateData = Symbol('privateData');
const anotherPrivate = Symbol('privateData');

privateData === anotherPrivate;  // false - different symbols

const obj = {
    [privateData]: 'secret',
};

// Symbol keys are not enumerable by default methods
Object.keys(obj);            // []
JSON.stringify(obj);         // '{}'

// But discoverable via specific APIs
Object.getOwnPropertySymbols(obj);  // [Symbol(privateData)]
Reflect.ownKeys(obj);               // [Symbol(privateData)]

/**
 * Global registry symbols - shared across realms.
 */
const sharedKey = Symbol.for('myapp.sharedKey');
const sameKey = Symbol.for('myapp.sharedKey');

sharedKey === sameKey;  // true - same symbol from registry

// Get key for registered symbol
Symbol.keyFor(sharedKey);  // 'myapp.sharedKey'
Symbol.keyFor(privateData);  // undefined - not registered
```

### 7.2.2 Symbol Use Cases

```typescript
/**
 * Use symbols for internal properties.
 */
const internal = Symbol('internal');

class SecureClass {
    [internal]: InternalState;
    
    constructor() {
        this[internal] = { secret: 'hidden' };
    }
    
    getPublicData(): PublicData {
        // Access internal state
        return transformToPublic(this[internal]);
    }
}

/**
 * Use symbols for protocol identification.
 */
const serializableSymbol = Symbol.for('myapp.serializable');

interface Serializable {
    [serializableSymbol]: true;
    serialize(): Uint8Array;
    deserialize(data: Uint8Array): void;
}

function isSerializable(obj: unknown): obj is Serializable {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        serializableSymbol in obj &&
        (obj as Serializable)[serializableSymbol] === true
    );
}

/**
 * Use symbols for metadata.
 */
const metadataKey = Symbol('metadata');

interface WithMetadata {
    [metadataKey]?: Readonly<Record<string, unknown>>;
}

function setMetadata<T extends object>(
    obj: T,
    metadata: Readonly<Record<string, unknown>>
): T & WithMetadata {
    (obj as WithMetadata)[metadataKey] = metadata;
    return obj as T & WithMetadata;
}

function getMetadata(obj: WithMetadata): Readonly<Record<string, unknown>> | undefined {
    return obj[metadataKey];
}
```

---

# CHAPTER 8: ITERATION

## 8.1 Iterator Protocol

### 8.1.1 Iterator Interface

```typescript
/**
 * Iterator interface.
 */
interface Iterator<T, TReturn = void, TNext = undefined> {
    next(value?: TNext): IteratorResult<T, TReturn>;
    return?(value?: TReturn): IteratorResult<T, TReturn>;
    throw?(error?: unknown): IteratorResult<T, TReturn>;
}

interface IteratorResult<T, TReturn = void> {
    done: boolean;
    value: T | TReturn;
}

/**
 * Iterable interface.
 */
interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}

/**
 * IterableIterator - both iterable and iterator.
 */
interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}

/**
 * Manual iterator implementation.
 */
class CountingIterator implements IterableIterator<number> {
    #current: number;
    readonly #end: number;
    
    constructor(start: number, end: number) {
        this.#current = start;
        this.#end = end;
    }
    
    next(): IteratorResult<number, void> {
        if (this.#current < this.#end) {
            return { done: false, value: this.#current++ };
        }
        return { done: true, value: undefined };
    }
    
    return(value?: void): IteratorResult<number, void> {
        // Called when iteration is terminated early
        this.#current = this.#end;  // Exhaust iterator
        return { done: true, value };
    }
    
    [Symbol.iterator](): IterableIterator<number> {
        return this;
    }
}

// Usage
const iter = new CountingIterator(0, 3);
for (const n of iter) {
    console.log(n);  // 0, 1, 2
}
```

### 8.1.2 Generator Functions

```typescript
/**
 * Generator function - simplest way to create iterators.
 */
function* range(start: number, end: number, step: number = 1): Generator<number> {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}

for (const n of range(0, 10, 2)) {
    console.log(n);  // 0, 2, 4, 6, 8
}

/**
 * Generator with return value.
 */
function* countWithTotal(n: number): Generator<number, number, undefined> {
    let total = 0;
    for (let i = 0; i < n; i++) {
        yield i;
        total += i;
    }
    return total;  // Return value when done
}

const gen = countWithTotal(5);
for (const value of gen) {
    console.log(value);  // 0, 1, 2, 3, 4
}
// Note: return value (10) is not yielded in for...of

// To get return value:
const gen2 = countWithTotal(5);
let result = gen2.next();
while (!result.done) {
    console.log(result.value);
    result = gen2.next();
}
console.log('Total:', result.value);  // Total: 10

/**
 * Bidirectional communication with generators.
 */
function* accumulator(): Generator<number, void, number> {
    let total = 0;
    while (true) {
        const input = yield total;  // Yield current, receive next
        total += input;
    }
}

const acc = accumulator();
acc.next();           // { value: 0, done: false } - start generator
acc.next(5);          // { value: 5, done: false } - send 5
acc.next(10);         // { value: 15, done: false } - send 10
acc.next(3);          // { value: 18, done: false } - send 3

/**
 * yield* delegation.
 */
function* flatten<T>(arrays: Iterable<Iterable<T>>): Generator<T> {
    for (const array of arrays) {
        yield* array;  // Delegate to nested iterable
    }
}

const nested = [[1, 2], [3, 4], [5]];
console.log([...flatten(nested)]);  // [1, 2, 3, 4, 5]
```

---

## 8.2 Iterator Helpers

### 8.2.1 Built-in Iterator Helpers

ES2025 adds helpers directly on iterators.

```typescript
/**
 * Iterator.from - wrap any iterable.
 */
const iter = Iterator.from([1, 2, 3, 4, 5]);

/**
 * map - transform each value.
 */
const doubled = iter.map(x => x * 2);
// Lazy - no computation until iterated

/**
 * filter - select values.
 */
const evens = iter.filter(x => x % 2 === 0);

/**
 * take - limit count.
 */
const firstThree = iter.take(3);

/**
 * drop - skip count.
 */
const afterTwo = iter.drop(2);

/**
 * flatMap - map and flatten.
 */
const expanded = iter.flatMap(x => [x, x * 10]);

/**
 * Chain operations lazily.
 */
const result = Iterator.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .filter(x => x % 2 === 0)    // 2, 4, 6, 8, 10
    .map(x => x * 2)              // 4, 8, 12, 16, 20
    .take(3)                      // 4, 8, 12
    .toArray();                   // [4, 8, 12]

// Only 3 elements computed, rest never processed!

/**
 * Terminal operations.
 */

// toArray - collect to array
const arr = iter.toArray();

// reduce - fold values
const sum = iter.reduce((acc, x) => acc + x, 0);

// forEach - side effects
iter.forEach(x => console.log(x));

// some - test any match
const hasEven = iter.some(x => x % 2 === 0);

// every - test all match
const allPositive = iter.every(x => x > 0);

// find - first match
const firstEven = iter.find(x => x % 2 === 0);
```

### 8.2.2 Custom Iterator Helpers

```typescript
/**
 * Chunk iterator into groups.
 */
function* chunk<T>(
    iterable: Iterable<T>,
    size: number
): Generator<T[], void, undefined> {
    let chunk: T[] = [];
    
    for (const item of iterable) {
        chunk.push(item);
        if (chunk.length === size) {
            yield chunk;
            chunk = [];
        }
    }
    
    if (chunk.length > 0) {
        yield chunk;
    }
}

console.log([...chunk([1, 2, 3, 4, 5], 2)]);
// [[1, 2], [3, 4], [5]]

/**
 * Window/sliding window.
 */
function* window<T>(
    iterable: Iterable<T>,
    size: number
): Generator<T[], void, undefined> {
    const buffer: T[] = [];
    
    for (const item of iterable) {
        buffer.push(item);
        
        if (buffer.length === size) {
            yield [...buffer];
            buffer.shift();
        }
    }
}

console.log([...window([1, 2, 3, 4, 5], 3)]);
// [[1, 2, 3], [2, 3, 4], [3, 4, 5]]

/**
 * Zip iterables together.
 */
function* zip<T extends readonly Iterable<unknown>[]>(
    ...iterables: T
): Generator<{ [K in keyof T]: T[K] extends Iterable<infer U> ? U : never }> {
    const iterators = iterables.map(it => it[Symbol.iterator]());
    
    while (true) {
        const results = iterators.map(it => it.next());
        
        if (results.some(r => r.done)) {
            break;
        }
        
        yield results.map(r => r.value) as { [K in keyof T]: T[K] extends Iterable<infer U> ? U : never };
    }
}

console.log([...zip([1, 2, 3], ['a', 'b', 'c'])]);
// [[1, 'a'], [2, 'b'], [3, 'c']]

/**
 * Enumerate with index.
 */
function* enumerate<T>(
    iterable: Iterable<T>,
    start: number = 0
): Generator<[number, T], void, undefined> {
    let index = start;
    for (const item of iterable) {
        yield [index++, item];
    }
}

for (const [i, char] of enumerate('abc')) {
    console.log(i, char);  // 0 'a', 1 'b', 2 'c'
}

/**
 * Unique values.
 */
function* unique<T>(
    iterable: Iterable<T>,
    keyFn: (item: T) => unknown = (x) => x
): Generator<T, void, undefined> {
    const seen = new Set<unknown>();
    
    for (const item of iterable) {
        const key = keyFn(item);
        if (!seen.has(key)) {
            seen.add(key);
            yield item;
        }
    }
}

console.log([...unique([1, 2, 2, 3, 3, 3])]);  // [1, 2, 3]

/**
 * Take while predicate is true.
 */
function* takeWhile<T>(
    iterable: Iterable<T>,
    predicate: (item: T) => boolean
): Generator<T, void, undefined> {
    for (const item of iterable) {
        if (!predicate(item)) break;
        yield item;
    }
}

console.log([...takeWhile([1, 2, 3, 4, 5], x => x < 4)]);  // [1, 2, 3]

/**
 * Drop while predicate is true.
 */
function* dropWhile<T>(
    iterable: Iterable<T>,
    predicate: (item: T) => boolean
): Generator<T, void, undefined> {
    let dropping = true;
    
    for (const item of iterable) {
        if (dropping && predicate(item)) {
            continue;
        }
        dropping = false;
        yield item;
    }
}

console.log([...dropWhile([1, 2, 3, 4, 5], x => x < 3)]);  // [3, 4, 5]
```

---

## 8.3 Async Iteration

### 8.3.1 Async Generators

```typescript
/**
 * Async generator function.
 */
async function* fetchPages<T>(url: string): AsyncGenerator<T[], void, undefined> {
    let cursor: string | null = null;
    
    do {
        const fullUrl = cursor ? `${url}?cursor=${cursor}` : url;
        const response = await fetch(fullUrl);
        const data = await response.json() as { items: T[]; nextCursor: string | null };
        
        yield data.items;
        cursor = data.nextCursor;
    } while (cursor !== null);
}

// Usage
async function getAllUsers(): Promise<User[]> {
    const allUsers: User[] = [];
    
    for await (const page of fetchPages<User>('/api/users')) {
        allUsers.push(...page);
    }
    
    return allUsers;
}

/**
 * Async iterator helpers.
 */
async function* asyncMap<T, U>(
    source: AsyncIterable<T>,
    fn: (item: T) => U | Promise<U>
): AsyncGenerator<U, void, undefined> {
    for await (const item of source) {
        yield await fn(item);
    }
}

async function* asyncFilter<T>(
    source: AsyncIterable<T>,
    predicate: (item: T) => boolean | Promise<boolean>
): AsyncGenerator<T, void, undefined> {
    for await (const item of source) {
        if (await predicate(item)) {
            yield item;
        }
    }
}

async function* asyncTake<T>(
    source: AsyncIterable<T>,
    count: number
): AsyncGenerator<T, void, undefined> {
    let taken = 0;
    for await (const item of source) {
        if (taken >= count) break;
        yield item;
        taken++;
    }
}

async function asyncCollect<T>(source: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const item of source) {
        result.push(item);
    }
    return result;
}

/**
 * Buffered async iteration.
 */
async function* buffer<T>(
    source: AsyncIterable<T>,
    size: number
): AsyncGenerator<T, void, undefined> {
    const buffer: T[] = [];
    const { promise: readyPromise, resolve: ready } = Promise.withResolvers<void>();
    
    // Fill buffer in background
    const fillBuffer = async () => {
        for await (const item of source) {
            buffer.push(item);
            if (buffer.length >= size) {
                ready();
            }
        }
        ready();  // Signal done even if not full
    };
    
    fillBuffer();
    await readyPromise;
    
    while (buffer.length > 0) {
        yield buffer.shift()!;
    }
}
```

## Chapter 9: Binary Data

---

## 9.1 ArrayBuffer Architecture

### 9.1.1 Buffer Types

```typescript
/**
 * ArrayBuffer - raw binary data container.
 * Cannot be directly accessed, must use views.
 */
const buffer = new ArrayBuffer(32);
console.log(buffer.byteLength);  // 32

/**
 * Check if buffer is detached.
 */
console.log(buffer.detached);  // false

/**
 * Transfer ownership to new buffer.
 */
const transferred = buffer.transfer();
console.log(buffer.detached);       // true
console.log(buffer.byteLength);     // 0
console.log(transferred.byteLength); // 32

/**
 * Transfer with resize.
 */
const resized = transferred.transfer(64);
console.log(resized.byteLength);  // 64

/**
 * Resizable ArrayBuffer.
 */
const resizable = new ArrayBuffer(16, { maxByteLength: 64 });
console.log(resizable.byteLength);     // 16
console.log(resizable.maxByteLength);  // 64
console.log(resizable.resizable);      // true

resizable.resize(32);
console.log(resizable.byteLength);  // 32

/**
 * SharedArrayBuffer - for multi-threaded access.
 */
const shared = new SharedArrayBuffer(1024);
// Can be sent to Workers without transfer
// All workers see the same memory
```

### 9.1.2 Buffer Views

```typescript
/**
 * TypedArray views into ArrayBuffer.
 */
const buffer = new ArrayBuffer(16);

// Different views of same memory
const uint8 = new Uint8Array(buffer);
const uint16 = new Uint16Array(buffer);
const uint32 = new Uint32Array(buffer);
const float32 = new Float32Array(buffer);

console.log(uint8.length);    // 16 elements
console.log(uint16.length);   // 8 elements
console.log(uint32.length);   // 4 elements
console.log(float32.length);  // 4 elements

// Writing through one view affects others
uint8[0] = 0xFF;
uint8[1] = 0x00;
console.log(uint16[0]);  // Depends on endianness

/**
 * Partial views with offset and length.
 */
const fullBuffer = new ArrayBuffer(100);

// View bytes 20-39 (20 bytes)
const partial = new Uint8Array(fullBuffer, 20, 20);
console.log(partial.byteOffset);  // 20
console.log(partial.byteLength);  // 20
console.log(partial.buffer === fullBuffer);  // true

/**
 * View from existing TypedArray.
 */
const source = new Uint8Array([1, 2, 3, 4, 5]);

// subarray - shares buffer (view)
const view = source.subarray(1, 4);  // [2, 3, 4]
view[0] = 99;
console.log(source);  // [1, 99, 3, 4, 5]

// slice - copies data (new buffer)
const copy = source.slice(1, 4);  // [99, 3, 4]
copy[0] = 100;
console.log(source);  // [1, 99, 3, 4, 5] - unchanged
```

---

## 9.2 TypedArray Selection

### 9.2.1 TypedArray Types

```typescript
/**
 * Integer TypedArrays.
 */
const int8 = new Int8Array(4);      // -128 to 127
const uint8 = new Uint8Array(4);    // 0 to 255
const uint8c = new Uint8ClampedArray(4);  // 0-255, clamped not wrapped
const int16 = new Int16Array(4);    // -32768 to 32767
const uint16 = new Uint16Array(4);  // 0 to 65535
const int32 = new Int32Array(4);    // -2^31 to 2^31-1
const uint32 = new Uint32Array(4);  // 0 to 2^32-1

/**
 * BigInt TypedArrays (64-bit).
 */
const bigInt64 = new BigInt64Array(4);   // -2^63 to 2^63-1
const bigUint64 = new BigUint64Array(4); // 0 to 2^64-1

// Elements are BigInt, not number
bigInt64[0] = 9007199254740993n;  // Beyond MAX_SAFE_INTEGER

/**
 * Float TypedArrays.
 */
const float32 = new Float32Array(4);  // 32-bit IEEE 754
const float64 = new Float64Array(4);  // 64-bit IEEE 754

/**
 * Clamped vs wrapped overflow.
 */
const regular = new Uint8Array([0]);
const clamped = new Uint8ClampedArray([0]);

regular[0] = 300;   // Wraps: 300 % 256 = 44
clamped[0] = 300;   // Clamps: 255 (max)

regular[0] = -10;   // Wraps: 246
clamped[0] = -10;   // Clamps: 0 (min)
```

### 9.2.2 Selection Guidelines

```typescript
/**
 * Use Uint8Array for:
 * - Raw bytes, binary data
 * - Cryptographic operations
 * - Network protocols
 * - File data
 */
const hash = new Uint8Array(32);
const signature = new Uint8Array(64);

/**
 * Use Uint8ClampedArray for:
 * - Image pixel data
 * - Audio samples (8-bit)
 */
const imageData = new Uint8ClampedArray(width * height * 4);  // RGBA

/**
 * Use Int32Array/Uint32Array for:
 * - 32-bit values
 * - Atomics operations
 * - Performance-critical integer math
 */
const counters = new Int32Array(sharedBuffer);
Atomics.add(counters, 0, 1);

/**
 * Use BigInt64Array/BigUint64Array for:
 * - 64-bit integers
 * - Values beyond Number.MAX_SAFE_INTEGER
 * - Timestamps in nanoseconds
 * - Large counters
 */
const timestamps = new BigUint64Array(100);
timestamps[0] = BigInt(Date.now()) * 1000000n;  // Nanoseconds

/**
 * Use Float32Array for:
 * - 3D graphics (positions, colors)
 * - Audio processing
 * - Memory-efficient floats
 */
const vertices = new Float32Array([
    0.0, 0.5, 0.0,   // Vertex 1
    -0.5, -0.5, 0.0, // Vertex 2
    0.5, -0.5, 0.0,  // Vertex 3
]);

/**
 * Use Float64Array for:
 * - Scientific computation
 * - High precision math
 * - Default for general floats
 */
const coordinates = new Float64Array([lat, lng, altitude]);
```

---

## 9.3 DataView Usage

### 9.3.1 DataView Basics

```typescript
/**
 * DataView provides explicit endianness control.
 * Essential for binary protocols and file formats.
 */
const buffer = new ArrayBuffer(24);
const view = new DataView(buffer);

/**
 * Explicit endianness.
 */
// Little-endian (true) - least significant byte first (x86, most modern CPUs)
view.setUint32(0, 0x12345678, true);
// Bytes: 78 56 34 12

// Big-endian (false) - most significant byte first (network byte order)
view.setUint32(4, 0x12345678, false);
// Bytes: 12 34 56 78

/**
 * Read with correct endianness.
 */
const littleEndian = view.getUint32(0, true);   // 0x12345678
const bigEndian = view.getUint32(4, false);     // 0x12345678

/**
 * All DataView methods.
 */
// 8-bit (no endianness needed)
view.setInt8(offset, value);
view.setUint8(offset, value);
const i8 = view.getInt8(offset);
const u8 = view.getUint8(offset);

// 16-bit
view.setInt16(offset, value, littleEndian);
view.setUint16(offset, value, littleEndian);
const i16 = view.getInt16(offset, littleEndian);
const u16 = view.getUint16(offset, littleEndian);

// 32-bit
view.setInt32(offset, value, littleEndian);
view.setUint32(offset, value, littleEndian);
view.setFloat32(offset, value, littleEndian);
const i32 = view.getInt32(offset, littleEndian);
const u32 = view.getUint32(offset, littleEndian);
const f32 = view.getFloat32(offset, littleEndian);

// 64-bit
view.setBigInt64(offset, value, littleEndian);
view.setBigUint64(offset, value, littleEndian);
view.setFloat64(offset, value, littleEndian);
const bi64 = view.getBigInt64(offset, littleEndian);
const bu64 = view.getBigUint64(offset, littleEndian);
const f64 = view.getFloat64(offset, littleEndian);
```

### 9.3.2 Binary Protocol Parsing

```typescript
/**
 * Bitcoin transaction parsing example.
 */
class TransactionParser {
    readonly #buffer: Uint8Array;
    readonly #view: DataView;
    #offset = 0;
    
    constructor(data: Uint8Array) {
        this.#buffer = data;
        this.#view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    
    /**
     * Read little-endian uint32.
     */
    readUint32(): number {
        const value = this.#view.getUint32(this.#offset, true);
        this.#offset += 4;
        return value;
    }
    
    /**
     * Read little-endian uint64 as bigint.
     */
    readUint64(): bigint {
        const value = this.#view.getBigUint64(this.#offset, true);
        this.#offset += 8;
        return value;
    }
    
    /**
     * Read variable-length integer (Bitcoin CompactSize).
     */
    readVarInt(): bigint {
        const first = this.readUint8();
        
        if (first < 0xFD) {
            return BigInt(first);
        } else if (first === 0xFD) {
            return BigInt(this.readUint16());
        } else if (first === 0xFE) {
            return BigInt(this.readUint32());
        } else {
            return this.readUint64();
        }
    }
    
    /**
     * Read uint8.
     */
    readUint8(): number {
        return this.#buffer[this.#offset++]!;
    }
    
    /**
     * Read uint16 little-endian.
     */
    readUint16(): number {
        const value = this.#view.getUint16(this.#offset, true);
        this.#offset += 2;
        return value;
    }
    
    /**
     * Read bytes.
     */
    readBytes(length: number): Uint8Array {
        const bytes = this.#buffer.subarray(this.#offset, this.#offset + length);
        this.#offset += length;
        return bytes;
    }
    
    /**
     * Read hash (32 bytes, reversed for display).
     */
    readHash(): Uint8Array {
        const hash = this.readBytes(32);
        // Bitcoin displays hashes in reverse byte order
        return hash.slice().reverse();
    }
    
    get position(): number {
        return this.#offset;
    }
    
    get remaining(): number {
        return this.#buffer.length - this.#offset;
    }
}
```

---

## 9.4 Bitwise Operations

### 9.4.1 Bitwise Operators

```typescript
/**
 * All bitwise operators convert to 32-bit integers.
 */

// AND - both bits must be 1
const and = 0b1010 & 0b1100;  // 0b1000 = 8

// OR - either bit can be 1
const or = 0b1010 | 0b1100;   // 0b1110 = 14

// XOR - bits must be different
const xor = 0b1010 ^ 0b1100;  // 0b0110 = 6

// NOT - flip all bits (returns signed int32)
const not = ~0b1010;          // -11 (signed)

// Left shift - multiply by 2^n
const left = 0b0001 << 3;     // 0b1000 = 8

// Right shift (signed) - divide by 2^n, preserves sign
const right = -8 >> 2;        // -2 (sign preserved)

// Right shift (unsigned) - divide by 2^n, fills with 0
const rightU = -8 >>> 2;      // 1073741822 (large positive)

/**
 * Common bit manipulation patterns.
 */

// Set bit at position
function setBit(value: number, position: number): number {
    return value | (1 << position);
}

// Clear bit at position
function clearBit(value: number, position: number): number {
    return value & ~(1 << position);
}

// Toggle bit at position
function toggleBit(value: number, position: number): number {
    return value ^ (1 << position);
}

// Check if bit is set
function hasBit(value: number, position: number): boolean {
    return (value & (1 << position)) !== 0;
}

// Get lowest set bit
function lowestBit(value: number): number {
    return value & -value;
}

// Clear lowest set bit
function clearLowestBit(value: number): number {
    return value & (value - 1);
}

// Count set bits (popcount)
function countBits(value: number): number {
    let count = 0;
    while (value !== 0) {
        count++;
        value &= value - 1;
    }
    return count;
}

// Or use Math.clz32 and other intrinsics
const leadingZeros = Math.clz32(0b00001111);  // 28

/**
 * Bit flags pattern.
 */
const Permissions = {
    READ: 1 << 0,    // 0b001 = 1
    WRITE: 1 << 1,   // 0b010 = 2
    EXECUTE: 1 << 2, // 0b100 = 4
} as const;

type Permission = (typeof Permissions)[keyof typeof Permissions];

class PermissionSet {
    #flags: number = 0;
    
    add(permission: Permission): this {
        this.#flags |= permission;
        return this;
    }
    
    remove(permission: Permission): this {
        this.#flags &= ~permission;
        return this;
    }
    
    has(permission: Permission): boolean {
        return (this.#flags & permission) === permission;
    }
    
    hasAll(...permissions: Permission[]): boolean {
        const mask = permissions.reduce((acc, p) => acc | p, 0);
        return (this.#flags & mask) === mask;
    }
    
    hasAny(...permissions: Permission[]): boolean {
        const mask = permissions.reduce((acc, p) => acc | p, 0);
        return (this.#flags & mask) !== 0;
    }
    
    get value(): number {
        return this.#flags;
    }
}

// Usage
const perms = new PermissionSet()
    .add(Permissions.READ)
    .add(Permissions.EXECUTE);

perms.has(Permissions.READ);     // true
perms.has(Permissions.WRITE);    // false
perms.hasAll(Permissions.READ, Permissions.EXECUTE);  // true
```

---

# CHAPTER 10: MODERN APIs

## 10.1 Array Methods

### 10.1.1 Immutable Array Methods

```typescript
/**
 * toReversed - returns new reversed array.
 */
const arr = [1, 2, 3, 4, 5];
const reversed = arr.toReversed();  // [5, 4, 3, 2, 1]
console.log(arr);  // [1, 2, 3, 4, 5] - unchanged

/**
 * toSorted - returns new sorted array.
 */
const nums = [3, 1, 4, 1, 5];
const sorted = nums.toSorted((a, b) => a - b);  // [1, 1, 3, 4, 5]
console.log(nums);  // [3, 1, 4, 1, 5] - unchanged

/**
 * toSpliced - returns new array with splice applied.
 */
const items = ['a', 'b', 'c', 'd'];
const spliced = items.toSpliced(1, 2, 'x', 'y');  // ['a', 'x', 'y', 'd']
console.log(items);  // ['a', 'b', 'c', 'd'] - unchanged

/**
 * with - returns new array with element replaced.
 */
const original = [1, 2, 3, 4, 5];
const modified = original.with(2, 99);  // [1, 2, 99, 4, 5]
console.log(original);  // [1, 2, 3, 4, 5] - unchanged

// Supports negative indices
const last = original.with(-1, 100);  // [1, 2, 3, 4, 100]
```

### 10.1.2 Search Methods

```typescript
/**
 * findLast - search from end.
 */
const numbers = [1, 2, 3, 4, 5, 4, 3, 2, 1];

const lastEven = numbers.findLast(n => n % 2 === 0);  // 2
const lastIndex = numbers.findLastIndex(n => n % 2 === 0);  // 7

/**
 * Array.fromAsync - create array from async iterable.
 */
async function* asyncGenerator(): AsyncGenerator<number> {
    yield 1;
    yield 2;
    yield 3;
}

const fromAsync = await Array.fromAsync(asyncGenerator());  // [1, 2, 3]

// With mapping function
const mapped = await Array.fromAsync(
    asyncGenerator(),
    async (n) => n * 2
);  // [2, 4, 6]
```

### 10.1.3 Grouping Methods

```typescript
/**
 * Object.groupBy - group into plain object.
 */
const people = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie', age: 25 },
];

const byAge = Object.groupBy(people, person => person.age);
// { 25: [{name: 'Alice'...}, {name: 'Charlie'...}], 30: [{name: 'Bob'...}] }

// Returns null-prototype object
Object.getPrototypeOf(byAge);  // null

/**
 * Map.groupBy - group into Map.
 */
const byAgeMap = Map.groupBy(people, person => person.age);
// Map { 25 => [...], 30 => [...] }

// Useful when keys aren't strings
const byObject = Map.groupBy(items, item => item.category);
// Keys can be objects
```

---

## 10.2 Object Methods

```typescript
/**
 * Object.hasOwn - safe own property check.
 */
const obj = Object.create(null);  // No prototype
obj.key = 'value';

// obj.hasOwnProperty('key');  // Error! No prototype
Object.hasOwn(obj, 'key');       // true - always works

/**
 * Object.fromEntries - inverse of Object.entries.
 */
const entries: [string, number][] = [['a', 1], ['b', 2]];
const fromEntries = Object.fromEntries(entries);  // { a: 1, b: 2 }

// Transform object
const original = { a: 1, b: 2, c: 3 };
const doubled = Object.fromEntries(
    Object.entries(original).map(([k, v]) => [k, v * 2])
);  // { a: 2, b: 4, c: 6 }

/**
 * structuredClone - deep clone.
 */
const complex = {
    date: new Date(),
    map: new Map([['a', 1]]),
    set: new Set([1, 2, 3]),
    array: [1, [2, [3]]],
    buffer: new Uint8Array([1, 2, 3]),
};

const cloned = structuredClone(complex);
// Deep clone, preserves types, handles circular references

// Cannot clone functions, DOM nodes, or Proxies

// Clone with transfer
const buffer = new ArrayBuffer(1024);
const clonedWithTransfer = structuredClone(
    { buffer },
    { transfer: [buffer] }
);
// Original buffer is detached
```

---

## 10.3 String Methods

```typescript
/**
 * String well-formed checks.
 */
const valid = 'Hello 👋';
const invalid = 'Hello \uD800';  // Lone surrogate

valid.isWellFormed();    // true
invalid.isWellFormed();  // false

valid.toWellFormed();    // 'Hello 👋'
invalid.toWellFormed();  // 'Hello �' (replacement character)

/**
 * String.prototype.at - supports negative indices.
 */
const str = 'Hello';
str.at(0);   // 'H'
str.at(-1);  // 'o'
str.at(-2);  // 'l'

/**
 * replaceAll - replace all occurrences.
 */
const text = 'foo bar foo baz foo';
text.replaceAll('foo', 'qux');  // 'qux bar qux baz qux'

// With regex (must have g flag)
text.replaceAll(/foo/g, 'qux');

/**
 * trimStart / trimEnd.
 */
const padded = '  hello  ';
padded.trimStart();  // 'hello  '
padded.trimEnd();    // '  hello'
```

---

## 10.4 RegExp Enhancements

```typescript
/**
 * d flag - indices.
 */
const re = /(?<word>\w+)/dg;
const text = 'Hello World';
const match = re.exec(text)!;

match.indices;        // [[0, 5], [0, 5]]
match.indices.groups; // { word: [0, 5] }

/**
 * Named capture groups.
 */
const dateRe = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const dateMatch = '2024-03-15'.match(dateRe)!;

dateMatch.groups!.year;   // '2024'
dateMatch.groups!.month;  // '03'
dateMatch.groups!.day;    // '15'

/**
 * Lookbehind assertions.
 */
// Positive lookbehind
const priceRe = /(?<=\$)\d+/;
'$100'.match(priceRe)![0];  // '100'

// Negative lookbehind
const notPriceRe = /(?<!\$)\d+/;
'€100'.match(notPriceRe)![0];  // '100'

/**
 * Unicode property escapes.
 */
const greekRe = /\p{Script=Greek}+/u;
greekRe.test('αβγ');  // true

const emojiRe = /\p{Emoji}/u;
emojiRe.test('👋');  // true

/**
 * v flag - set operations.
 */
// Intersection
const consonantsRe = /[[a-z]&&[^aeiou]]/v;

// Subtraction
const noVowelsRe = /[[a-z]--[aeiou]]/v;

// Works with Unicode properties
const hanNotHiraganaRe = /[\p{Script=Han}--\p{Script=Hiragana}]/v;
```

---

## 10.5 Cryptography

```typescript
/**
 * crypto.getRandomValues - secure random.
 */
const randomBytes = new Uint8Array(32);
crypto.getRandomValues(randomBytes);

/**
 * crypto.randomUUID - UUID v4.
 */
const uuid = crypto.randomUUID();
// '550e8400-e29b-41d4-a716-446655440000'

/**
 * crypto.subtle - Web Crypto API.
 */

// SHA-256 hash
async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
}

// Generate key pair
async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256',  // Note: secp256k1 not supported
        },
        true,  // extractable
        ['sign', 'verify']
    );
}

// Sign data
async function sign(
    privateKey: CryptoKey,
    data: Uint8Array
): Promise<Uint8Array> {
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        data
    );
    return new Uint8Array(signature);
}

// Verify signature
async function verify(
    publicKey: CryptoKey,
    signature: Uint8Array,
    data: Uint8Array
): Promise<boolean> {
    return crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signature,
        data
    );
}

// AES encryption
async function encrypt(
    key: CryptoKey,
    data: Uint8Array
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    
    return { iv, ciphertext: new Uint8Array(ciphertext) };
}

// AES decryption
async function decrypt(
    key: CryptoKey,
    iv: Uint8Array,
    ciphertext: Uint8Array
): Promise<Uint8Array> {
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
    
    return new Uint8Array(plaintext);
}

// HKDF key derivation
async function deriveKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}
```

---

# CHAPTER 11: DOCUMENTATION

## 11.1 TSDoc Standard

### 11.1.1 Basic Tags

~~~typescript
/**
 * Calculates the SHA-256 hash of the input data.
 * 
 * @param data - The input bytes to hash
 * @returns The 32-byte hash digest
 * @throws {TypeError} If data is not a Uint8Array
 * 
 * @example
 * ```typescript
 * const hash = sha256(new Uint8Array([1, 2, 3]));
 * console.log(hash.length); // 32
 * ```
 * 
 * @remarks
 * This function uses the Web Crypto API internally.
 * For Node.js, ensure you're using a version with
 * Web Crypto support or use the crypto module directly.
 * 
 * @see {@link sha256d} for double SHA-256
 * @see {@link hash160} for RIPEMD160(SHA256(x))
 */
function sha256(data: Uint8Array): Uint8Array {
    // Implementation
}

/**
 * A Bitcoin transaction input.
 * 
 * @remarks
 * Inputs reference previous transaction outputs (UTXOs)
 * and provide the unlocking script to spend them.
 */
interface TransactionInput {
    /**
     * The transaction ID of the output being spent.
     * @readonly
     */
    readonly txid: TxId;
    
    /**
     * The output index within the referenced transaction.
     * @readonly
     */
    readonly vout: VoutIndex;
    
    /**
     * The unlocking script (scriptSig).
     * Empty for SegWit inputs.
     * @readonly
     */
    readonly scriptSig: ScriptSig;
    
    /**
     * The sequence number.
     * Used for relative timelocks (BIP 68).
     * @defaultValue 0xffffffff
     * @readonly
     */
    readonly sequence: Sequence;
    
    /**
     * Witness data for SegWit inputs.
     * @readonly
     */
    readonly witness: WitnessStack;
}
~~~

### 11.1.2 Advanced Tags

~~~typescript
/**
 * Creates a new transaction builder.
 * 
 * @typeParam T - The transaction type being built
 * 
 * @param network - The Bitcoin network (mainnet, testnet, regtest)
 * @param options - Builder configuration options
 * @param options.version - Transaction version (1 or 2)
 * @param options.locktime - Transaction locktime
 * 
 * @returns A new transaction builder instance
 * 
 * @throws {ValidationError} If network is invalid
 * @throws {RangeError} If version is not 1 or 2
 * 
 * @example
 * Basic usage:
 * ```typescript
 * const builder = createBuilder('mainnet');
 * builder.addInput(txid, vout);
 * builder.addOutput(address, amount);
 * const tx = builder.build();
 * ```
 * 
 * @example
 * With options:
 * ```typescript
 * const builder = createBuilder('testnet', {
 *   version: 2,
 *   locktime: 700000,
 * });
 * ```
 * 
 * @public
 * @since 2.0.0
 */
function createBuilder<T extends Transaction>(
    network: Network,
    options?: BuilderOptions
): TransactionBuilder<T> {
    // Implementation
}

/**
 * @deprecated Use {@link createBuilder} instead.
 * Will be removed in version 3.0.0.
 */
function newTransactionBuilder(network: Network): TransactionBuilder {
    return createBuilder(network);
}

/**
 * @internal
 * Internal helper for transaction serialization.
 * Not part of the public API.
 */
function serializeInternal(tx: Transaction): Uint8Array {
    // Implementation
}

/**
 * @beta
 * This API is in beta and may change.
 */
function experimentalFeature(): void {
    // Implementation
}

/**
 * @privateRemarks
 * This implementation uses a custom algorithm that
 * improves performance by 30% over the standard approach.
 * See internal docs for details.
 */
```

### 11.1.3 Documentation Best Practices

```typescript
/**
 * GOOD: First paragraph is the summary.
 * Keep it concise - it appears in hover tooltips.
 * 
 * @remarks
 * Extended details go in remarks.
 * Can be multiple paragraphs.
 * 
 * Include implementation notes, edge cases,
 * and usage guidelines here.
 */

/**
 * BAD: This summary is way too long and contains
 * implementation details that should be in remarks.
 * It also mentions internal details that users
 * don't need to know about and makes the hover
 * tooltip hard to read because there's just so
 * much text in this first paragraph.
 */

/**
 * GOOD: Use hyphens for param descriptions.
 * @param value - The value to process
 */

/**
 * BAD: Missing hyphen, inconsistent style.
 * @param value The value to process
 */

/**
 * GOOD: Link to related items.
 * @see {@link OtherClass} for the inverse operation
 * @see {@link https://example.com | External docs}
 */

/**
 * GOOD: Document all thrown exceptions.
 * @throws {ValidationError} If input is invalid
 * @throws {NetworkError} If connection fails
 */

/**
 * GOOD: Show realistic examples.
 * @example
 * ```typescript
 * // Real-world usage
 * const result = processData(actualData);
 * expect(result.success).toBe(true);
 * ```
 */
~~~

---

# CHAPTER 12: MODULE ARCHITECTURE

## 12.1 ESM Requirements

### 12.1.1 Module Syntax

```typescript
/**
 * Use ESM exclusively. CommonJS prevents tree-shaking.
 */

// Named exports - preferred
export function processTransaction(tx: Transaction): Result {
    // Implementation
}

export class TransactionBuilder {
    // Implementation
}

export interface Transaction {
    // Definition
}

export type TxId = Brand<Uint8Array, 'TxId'>;

// Default export - use sparingly
export default class MainClass {
    // For primary class of a module
}

// Re-exports
export { Transaction } from './transaction.js';
export type { TransactionInput } from './input.js';

// Namespace re-export
export * from './types.js';
export * as utils from './utils.js';

/**
 * Import styles.
 */
import { Transaction, processTransaction } from './transaction.js';
import type { TransactionInput } from './input.js';
import * as crypto from './crypto.js';
import DefaultClass from './default.js';

// Type-only imports (removed at compile time)
import type { SomeType } from './types.js';

/**
 * Always use .js extension in imports.
 * TypeScript compiles to JS, the runtime needs .js.
 */
import { helper } from './helper.js';  // GOOD
// import { helper } from './helper';  // BAD - may fail at runtime
```

### 12.1.2 Barrel Files

```typescript
/**
 * index.ts - barrel file for public API.
 */

// Export public types
export type {
    Transaction,
    TransactionInput,
    TransactionOutput,
    TxId,
    Address,
    Satoshis,
} from './types.js';

// Export public classes
export { TransactionBuilder } from './builder.js';
export { Wallet } from './wallet.js';

// Export public functions
export {
    createTransaction,
    signTransaction,
    broadcastTransaction,
} from './transaction.js';

// Export constants
export { NETWORK_MAINNET, NETWORK_TESTNET } from './constants.js';

// DO NOT export internal utilities
// They can be inlined by bundler if not exported
```

### 12.1.3 Side Effect Management

```typescript
/**
 * Avoid side effects at module scope.
 */

// BAD: Side effect on import
console.log('Module loaded');
globalThis.myLib = {};

// GOOD: No side effects, just declarations
export function init(): void {
    // Called explicitly when needed
}

/**
 * package.json configuration.
 */
// {
//   "type": "module",
//   "sideEffects": false,  // Enables aggressive tree-shaking
//   "exports": {
//     ".": {
//       "types": "./dist/index.d.ts",
//       "import": "./dist/index.js"
//     }
//   }
// }

/**
 * Lazy initialization pattern.
 */
let _expensiveResource: ExpensiveResource | null = null;

export function getExpensiveResource(): ExpensiveResource {
    if (_expensiveResource === null) {
        _expensiveResource = createExpensiveResource();
    }
    return _expensiveResource;
}
```

---

## 12.2 Global Augmentation

```typescript
/**
 * Augment global interfaces safely.
 */
declare global {
    interface PromiseConstructor {
        /**
         * Safely await all promises, collecting errors.
         */
        safeAll<T extends readonly unknown[] | []>(
            values: T
        ): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
    }
    
    interface ArrayConstructor {
        /**
         * Create array from async iterable.
         */
        fromAsync<T>(
            iterable: AsyncIterable<T>
        ): Promise<T[]>;
    }
}

// Implementation
Promise.safeAll = async function safeAll<T>(
    values: Iterable<T | PromiseLike<T>>
): Promise<Awaited<T>[]> {
    // Implementation
};

// REQUIRED: Makes this file a module
export {};

/**
 * After augmentation, freeze to prevent further modification.
 */
Object.freeze(Promise.safeAll);
```

---

# APPENDIX A: COMPILER CONFIGURATION

## A.1 tsconfig.json

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitThis": true,
        "useUnknownInCatchVariables": true,
        "alwaysStrict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "noPropertyAccessFromIndexSignature": true,
        "moduleResolution": "bundler",
        "module": "ESNext",
        "target": "ESNext",
        "lib": ["ESNext"],
        "isolatedModules": true,
        "verbatimModuleSyntax": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

---

# APPENDIX B: QUICK REFERENCE

## B.1 Forbidden

`any`, `unknown` (except boundaries), `object`, `Function`, `{}`, native `enum`, `arguments`, `delete` on hot objects, angle bracket assertions, allocation in hot loops, re-exports, inline return types, backward compatibility shims, `number` for unbounded/external integers, floats for financial math.

## B.2 Required

`readonly` everywhere, `as const` for literals, `#privateFields`, `override` keyword, exhaustiveness checks, properties in declaration order, Reflect in Proxy traps, exported types for all variants, defensive edge case checks, lazy computation, `bigint` for amounts/heights/IDs/timestamps, `number` for lengths/counters/flags/indices, range validation at boundaries.

## B.3 Patterns

```typescript
// Enum (number for small bounded values)
const Status = { Pending: 0, Active: 1, Completed: 2 } as const;
type Status = (typeof Status)[keyof typeof Status];

// Enum (bigint for large/unbounded values)
const ChainId = { Bitcoin: 0n, Testnet: 1n, Signet: 2n } as const;
type ChainId = (typeof ChainId)[keyof typeof ChainId];

// Brand
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Numeric brands
type Satoshis = Brand<bigint, 'Satoshis'>;
type BlockHeight = Brand<bigint, 'BlockHeight'>;

// Result (with exported variants)
export interface Success<T> { readonly success: true; readonly value: T; }
export interface Failure<E> { readonly success: false; readonly error: E; }
export type Result<T, E = Error> = Success<T> | Failure<E>;

// Lazy getter
get value(): T { return this.#cached ??= this.#compute(); }

// Safe number conversion (bigint → number when API requires it)
function toSafeNumber(v: bigint): number {
    if (v < BigInt(Number.MIN_SAFE_INTEGER) || v > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError(`Value ${v} exceeds safe integer range`);
    }
    return Number(v);
}

// 32-bit operations
const rotl32 = (x: number, n: number): number => ((x << n) | (x >>> (32 - n))) >>> 0;
const toUint32 = (x: number): number => x >>> 0;
const toInt32 = (x: number): number => x | 0;
```

## B.4 Type System

| Pattern | Use Case |
|---------|----------|
| `interface` | Object shapes |
| `type` | Unions, intersections, mapped types |
| `as const` | Literal preservation, enums |
| `satisfies` | Validation with narrow inference |
| `Brand<T, B>` | Nominal typing |
| `readonly` | Default for all properties |

## B.5 Runtime Safety

| Method | Purpose |
|--------|---------|
| `Reflect.get()` | Safe property access |
| `Reflect.set()` | Safe property modification |
| `Object.freeze()` | Full immutability |
| `Object.seal()` | Fixed shape, mutable values |
| `Object.create(null)` | Prototype-free dictionary |

## B.6 Resource Management

| Pattern | Use Case |
|---------|----------|
| `using` | Sync disposal |
| `await using` | Async disposal |
| `Symbol.dispose` | Disposal protocol |
| `DisposableStack` | Multiple resources |

## B.7 Concurrency

| API | Purpose |
|-----|---------|
| `Promise.safeAll()` | Safe parallel execution |
| `Promise.withResolvers()` | External resolution |
| `Atomics.*` | Thread-safe operations |
| `SharedArrayBuffer` | Shared memory |

## B.8 V8 Optimization

| Rule | Reason |
|------|--------|
| Same property order | Hidden class stability |
| No dynamic properties | Hidden class stability |
| Monomorphic functions | Inline caching |
| Smi range integers | Fast path optimization |
| Indexed for loops | Best loop performance |

## B.9 Principles

- No defensive programming = exploitable by design
- Complex types > simple runtime checks
- Delete deprecated code, don't deprecate
- Fail fast, fail loud
- Trust nothing external
- `bigint` for anything beyond 32 bits, `number` for intentional 32-bit ops
- Precision is non-negotiable

---

*"Everything that doesn't follow this law is shit code, broken, exploitable."*
