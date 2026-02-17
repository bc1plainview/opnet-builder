# TYPESCRIPT LAW 2026

**The Complete Specification - Concise Edition**

*by BlobMaster*

*"Everything that doesn't follow this law is shit code, broken, exploitable."*

---

# CHAPTER 1: TYPE SYSTEM

## 1.1 Forbidden Types

**§1.1.1** `any` is absolutely forbidden. No exceptions. If the type is complex, model it properly with generics and constraints. If you're reaching for `any`, your type design is broken. Every `any` is a runtime bug waiting to happen.

**§1.1.2** `unknown` is required at boundaries, forbidden elsewhere. Acceptable only at system boundaries (JSON parsing, external APIs, user input) where it must be immediately validated and narrowed to a proper type. Application code must never expose `unknown` in its interfaces.

**§1.1.3** `object` (lowercase) is forbidden. It represents any non-primitive but provides no shape information. You cannot access properties without assertions. Use specific interfaces or `Record<string, T>`.

**§1.1.4** `Function` (uppercase) is forbidden. It's the function equivalent of `any` - no parameter or return type information. Use specific signatures: `(param: Type) => ReturnType`.

**§1.1.5** `{}` is forbidden. Contrary to intuition, `{}` means "any non-nullish value" (includes strings, numbers, booleans), not "empty object". Use `Record<string, never>` for empty objects.

**§1.1.6** `number` for unbounded or external integers is dangerous. JavaScript's `number` has only 53-bit integer precision. Values above `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) silently lose precision. Use `bigint` for: satoshi amounts, block heights, timestamps, database IDs, file sizes, cumulative totals, or any value from external systems. Use `number` for: array lengths, loop counters, small flags, port numbers, pixel coordinates, or any value you control that will stay small.

**§1.1.7** Floating-point math for financial values is forbidden. Floats have representation errors (`0.1 + 0.2 !== 0.3`), rounding issues, and non-associative arithmetic. Use fixed-point `bigint` with explicit scale factors for any precision-critical calculations.

**§1.1.8** Forbidden non-null assertion.

**§1.1.9** Always type your variables, function returns.

**§1.1.10** Prefer: public constructor(public readonly myValue: string = 'something') { over: public constructor(myValue: string) { this.myValue = myValue || 'something'; }

**§1.1.11** Perfer classes, static classes, singleton, normal classes over functional component for readability.

**§1.1.12** Always include public/protected/private. Private should be only using # or when # is impossible to use.

**§1.1.13** ALWAYS type your interfaces and export when required. Never do something like:
```typeScript
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
```

Always do:

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

interface MyConfig {
	readonly url?: string;
	readonly method: HttpMethod;
	readonly headers: Readonly<Record<string, string>>;
	readonly body: string | null;
	readonly requestsPerWorker: number;
	readonly concurrencyPerWorker: number;
	readonly timeoutMs: number;
	readonly workerCount: number;
}

    const config: MyConfig = {
        method: 'GET',
        headers: {},
        body: null,
        requestsPerWorker: 1000,
        concurrencyPerWorker: 10,
        timeoutMs: 30000,
        workerCount: 4,
    };
```

Full typing always required.

**§1.1.14** If your code contain deadcode, duplicated code, unused methods, eslint bypass, its broken. Your design is trash. Recode it.

**§1.1.15** A single class shoudnt be 3000 lines long. Each file should have clean code separation. If your class is huge, your design is broken. You need to separate your implementation in chunks with other classes.

**§1.1.16** Use top level await/async if you wish. Better then .catch(() => {}) or .then.

```typeScript
// BAD

TestApplication.main().catch((caughtError: unknown): void => {
    console.error('Fatal error:', caughtError);
    process.exit(1);
});

// GOOD
try {
	await TestApplication.main();
} catch(caughtError: unknown) {
	console.error('Fatal error:', caughtError);
    process.exit(1);
}
```

**§1.1.17** Shoudnt be only runnable in NodeJs. Should always be compatible for browsers. If you use libraries like Workers or something else, separate the logic with auto detection of environement.

**§1.1.18** Intermediate assignments for the sole purpose of shortening property access are forbidden. Writing `const c = this.#cache` or `const cache = this.#cache` just to avoid typing `this.#cache` multiple times is lazy, obscures mutation targets, and breaks traceability. Access properties directly. If you're mutating `this.#cache.transaction.version`, the reader needs to see `this.#cache` in the mutation statement, not hunt backwards to figure out what `c` or `cache` references. The only valid reason for intermediate assignment is when you need the reference for a specific operation like passing to a function or when the property access itself is computationally expensive and you've profiled it.

```typescript
// FORBIDDEN - pointless intermediate assignment
const c = this.#cache;
c.tx.version = version;
c.extractedTx = undefined;

// ALSO FORBIDDEN - longer name doesn't fix it
const cache = this.#cache;
cache.transaction.version = version;
cache.extractedTransaction = undefined;

// CORRECT - direct access, clear mutation target
this.#cache.transaction.version = version;
this.#cache.extractedTransaction = undefined;

// VALID - intermediate needed for function call
const transaction = this.#cache.transaction;
this.#broadcaster.submit(transaction);

// VALID - destructuring for multiple reads (not writes)
const { version, inputs, outputs } = this.#cache.transaction;
return this.#computeHash(version, inputs, outputs);
```

**§1.1.19** String literal parameters used to select behavior are forbidden. If a function behaves differently based on a string like `'feeRate'` or `'fee'`, split it into separate functions. Stringly-typed dispatch is untyped dispatch with extra steps.

**§1.1.20** Using truthy checks for cached numeric values is forbidden. `if (cache.value)` fails when `value` is `0`. Use explicit `!== undefined` checks for cache hits.

**§1.1.21** Functions that communicate results by mutating a parameter object are forbidden. Return values explicitly. If a function needs to return multiple values, return an object. Side-effect mutation of parameters destroys traceability and creates invisible data flow.

```typescript
// FORBIDDEN - stringly-typed dispatch
function calculate(key: 'feeRate' | 'fee'): number {
    if (key === 'feeRate' && c.feeRate) return c.feeRate;
    if (key === 'fee' && c.fee) return c.fee;
    // ...
    const value = key === 'feeRate' ? c.feeRate : c.fee;
    return value;
}

// CORRECT - separate functions
function calculateFeeRate(): number {
    if (this.#cache.feeRate !== undefined) return this.#cache.feeRate;
    // ...
}

function calculateFee(): number {
    if (this.#cache.fee !== undefined) return this.#cache.fee;
    // ...
}

// FORBIDDEN - mutation through parameter
inputFinalizeGetAmts(inputs, tx, cache, mustFinalize);
const fee = cache.fee; // WTF, where did this get set?

// CORRECT - explicit return
const { fee, feeRate } = computeFinalizedAmounts(inputs, tx, mustFinalize);
```

**§1.1.22** Dunder/magic property names are forbidden. `__CACHE`, `__TX`, `__FEE_RATE`, `__EXTRACTED_TX`, `__NON_WITNESS_UTXO_TX_CACHE` are Python conventions that have no place in TypeScript. Use proper `#private` fields or descriptive names. Underscores do not provide encapsulation, they just make code ugly and harder to search.

```typescript
// FORBIDDEN
private readonly __CACHE: PsbtCache;
c.__TX.version = version;
c.__EXTRACTED_TX = undefined;
cache.__FEE_RATE = Math.floor(Number(fee) / bytes);

// CORRECT
readonly #cache: PsbtCache;
this.#cache.transaction.version = version;
this.#cache.extractedTransaction = undefined;
this.#cache.feeRate = Math.floor(Number(fee) / bytes);
```

**§1.1.23** `Object.defineProperty` for fake privacy is forbidden. If you need private state, use `#private` fields. Dynamically hiding properties with `enumerable: false` is security theater that breaks tooling, debugging, and type safety.

```typescript
// FORBIDDEN - fake privacy theater
const dpew = <T>(obj: T, attr: string, enumerable: boolean, writable: boolean): void => {
    Object.defineProperty(obj, attr, { enumerable, writable });
};
dpew(this, '__CACHE', false, true);

// CORRECT - actual privacy
readonly #cache: PsbtCache;
```

**§1.1.24** Inline arrow function factories in constructors are forbidden. `dpew` is a one-off function defined inside a constructor that wraps `Object.defineProperty`. Either use `Object.defineProperty` directly if you must, or better yet, don't use this pattern at all.

**§1.1.25** Catching errors and returning boolean success indicators is forbidden when the caller needs to know what failed. `results.push(true)` / `results.push(false)` in a loop destroys error context. Either let errors propagate or use Result types with error details.

```typescript
// FORBIDDEN - swallowing errors into booleans
const results: boolean[] = [];
for (const i of range(this.data.inputs.length)) {
    try {
        this.signInputHD(i, hdKeyPair, sighashTypes);
        results.push(true);
    } catch (err) {
        results.push(false);
    }
}
if (results.every((v) => !v)) {
    throw new Error('No inputs were signed');
}

// CORRECT - preserve error context
interface SigningResult {
    readonly inputIndex: number;
    readonly success: boolean;
    readonly error?: Error;
}

const results: SigningResult[] = [];
for (let i = 0; i < this.data.inputs.length; i++) {
    try {
        this.signInputHD(i, hdKeyPair, sighashTypes);
        results.push({ inputIndex: i, success: true });
    } catch (error) {
        results.push({ inputIndex: i, success: false, error: error instanceof Error ? error : new Error(String(error)) });
    }
}
const failures = results.filter((r) => !r.success);
if (failures.length === results.length) {
    throw new AggregateError(failures.map((f) => f.error), 'No inputs were signed');
}
```

**§1.1.26** `new Promise` constructor with manual resolve/reject is forbidden when `async/await` suffices. The Promise constructor anti-pattern creates unnecessary nesting and error handling complexity.

```typescript
// FORBIDDEN - Promise constructor anti-pattern
signAllInputsHDAsync(hdKeyPair: HDSigner | HDSignerAsync): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!hdKeyPair) return reject(new Error('Need HDSigner'));
        const promises: Array<Promise<void>> = [];
        // ...
        return Promise.all(promises).then(() => {
            resolve();
        });
    });
}

// CORRECT - async/await
async signAllInputsHDAsync(hdKeyPair: HDSigner | HDSignerAsync): Promise<void> {
    if (!hdKeyPair?.publicKey || !hdKeyPair?.fingerprint) {
        throw new Error('Need HDSigner to sign input');
    }
    // ...
    await Promise.all(promises);
}
```

**§1.1.27** Empty catch blocks and `catch (_)` are forbidden. Either handle the error, log it, or let it propagate. Silently swallowing errors hides bugs.

```typescript
// FORBIDDEN
try {
    address = fromOutputScript(output.script, this.opts.network);
} catch (_) {}

// CORRECT - explicit handling
let address: string | undefined;
try {
    address = fromOutputScript(output.script, this.opts.network);
} catch {
    address = undefined; // Explicit: address decode failed, leave undefined
}
```

**§1.1.28** `JSON.parse(JSON.stringify(obj))` for cloning is forbidden. It's slow, loses non-JSON types (undefined, functions, symbols, bigint, Date, Map, Set, typed arrays), and throws on circular references. Use `structuredClone()` or implement proper clone methods.

```typescript
// FORBIDDEN
const clonedOpts = JSON.parse(JSON.stringify(this.opts)) as PsbtOptsOptional;

// CORRECT
const clonedOpts = structuredClone(this.opts);
```

**§1.1.29** `console.warn` in library code is forbidden. Libraries must not write to console. Use a logger interface, throw errors, or return warnings in the result type. Let the application decide how to handle warnings.

```typescript
// FORBIDDEN
console.warn('Warning: Signing non-segwit inputs without the full parent transaction...');

// CORRECT - return warning in result
interface SigningResult {
    readonly signature: Uint8Array;
    readonly warnings: readonly string[];
}
```

**§1.1.30** Multiple cache invalidation sites are forbidden. When `addInput` requires setting `c.__FEE = undefined; c.__FEE_RATE = undefined; c.__EXTRACTED_TX = undefined; c.__PREV_OUTS = undefined; c.__SIGNING_SCRIPTS = undefined; c.__VALUES = undefined; c.__TAPROOT_HASH_CACHE = undefined;` in multiple methods, you have a cache coherence nightmare. Encapsulate cache invalidation in a single method.

```typescript
// FORBIDDEN - scattered invalidation
addInput(...): this {
    // ...
    c.__FEE = undefined;
    c.__FEE_RATE = undefined;
    c.__EXTRACTED_TX = undefined;
    c.__PREV_OUTS = undefined;
    c.__SIGNING_SCRIPTS = undefined;
    c.__VALUES = undefined;
    c.__TAPROOT_HASH_CACHE = undefined;
    return this;
}

addOutput(...): this {
    // ...
    c.__FEE = undefined;
    c.__FEE_RATE = undefined;
    c.__EXTRACTED_TX = undefined;
    c.__TAPROOT_HASH_CACHE = undefined;
    return this;
}

// CORRECT - single invalidation method
#invalidateCache(scope: 'full' | 'outputs'): void {
    this.#cache.fee = undefined;
    this.#cache.feeRate = undefined;
    this.#cache.extractedTransaction = undefined;
    this.#cache.taprootHashCache = undefined;
    if (scope === 'full') {
        this.#cache.previousOutputs = undefined;
        this.#cache.signingScripts = undefined;
        this.#cache.values = undefined;
    }
}
```

**§1.1.31** Functions that take `unknown` parameters and access properties without narrowing are forbidden. `toBuffer(data: Uint8Array | Buffer)` should use a type guard or union handling, not `Buffer.isBuffer()` followed by unchecked cast.

**§1.1.32** Magic default buffers are forbidden. `Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])` means nothing to readers. Use named constants with documentation explaining the format.

```typescript
// FORBIDDEN
constructor(buffer: Buffer = Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])) {

// CORRECT
private static readonly EMPTY_TX_V2: Uint8Array = new Uint8Array([
    0x02, 0x00, 0x00, 0x00, // version 2
    0x00,                   // input count (varint)
    0x00,                   // output count (varint)
    0x00, 0x00, 0x00, 0x00, // locktime
]);

constructor(buffer: Uint8Array = PsbtTransaction.EMPTY_TX_V2) {
```

**§1.1.33** Mutating function parameters is forbidden. `inputFinalizeGetAmts` mutates `tx.ins[idx].script`, `tx.ins[idx].witness`, and `cache.__FEE`. Functions should return new values or explicitly document mutation contracts through naming (`mutateTransaction`) and parameter types (`cache: Mutable<PsbtCache>`).

**§1.1.34** Type assertions to satisfy return types are forbidden. `as unknown as TapKeySig` is a type system escape hatch that hides bugs. Fix the types or use proper type guards.

```typescript
// FORBIDDEN
const tapKeySig = hashesForSig
    .filter((h) => !h.leafHash)
    .map((h) => serializeTaprootSignature(signSchnorr(h.hash), input.sighashType))[0] as unknown as TapKeySig;

// CORRECT - proper typing
const tapKeySig: TapKeySig | undefined = hashesForSig
    .filter((h): h is HashForSig & { leafHash: undefined } => !h.leafHash)
    .map((h) => serializeTaprootSignature(signSchnorr(h.hash), input.sighashType))[0];
```

**§1.1.35** `indexOf() >= 0` is forbidden. Use `includes()` for membership checks. For arrays of objects where reference equality matters, use `some()` with a predicate.

```typescript
// FORBIDDEN
if (['p2sh-p2wsh', 'p2wsh'].indexOf(type) >= 0) {

// CORRECT
if (['p2sh-p2wsh', 'p2wsh'].includes(type)) {
```

**§1.1.36** `reduce` with boolean accumulator for `every`/`some` semantics is forbidden. Use the actual array methods.

```typescript
// FORBIDDEN
return results.reduce((final, res) => res && final, true);

// CORRECT
return results.every((result) => result);
```

**§1.1.37** Optional chaining into method calls that throw is forbidden. `(input || {}).partialSig` creates an empty object that will cause undefined behavior downstream. Either throw early with a clear error or use proper null checks.

```typescript
// FORBIDDEN - creates phantom empty object
const partialSig = (input || {}).partialSig;

// CORRECT - explicit null check
if (!input) throw new Error(`Input at index ${inputIndex} does not exist`);
const partialSig = input.partialSig;
```

**§1.1.38** Re-exports from entry points are forbidden per §13.2.1, but the violation here is worse: selective re-export with different visibility. Either the type is public API or it isn't. Don't have two export statements for the same types.

```typescript
// FORBIDDEN - confusing dual exports
export type { ValidateSigFunction, ... } from './psbt/types.js';
import type { ValidateSigFunction, ... } from './psbt/types.js';
```

**§1.1.39** Functions returning `null` for "script not found" alongside throwing for other errors is forbidden. Pick one error handling strategy per function. Either return `Result<T, E>` or throw, never mix.

```typescript
// FORBIDDEN - mixed error handling
const res: GetScriptReturn = {
    script: null,  // null means not found?
    isSegwit: false,
    isP2SH: false,
    isP2WSH: false,
};
// ... later throws on other conditions

// CORRECT - consistent error handling
interface GetScriptSuccess {
    readonly success: true;
    readonly script: Uint8Array;
    readonly isSegwit: boolean;
    readonly isP2SH: boolean;
    readonly isP2WSH: boolean;
}
interface GetScriptFailure {
    readonly success: false;
    readonly reason: 'no_utxo' | 'invalid_script';
}
type GetScriptResult = GetScriptSuccess | GetScriptFailure;
```

**§1.1.40** `delete` on objects followed by `defineProperty` to create getters is forbidden. This is prototype pollution waiting to happen and breaks V8 hidden classes. Use a proper class with getters from the start.

```typescript
// FORBIDDEN - delete + defineProperty hack
delete input.nonWitnessUtxo;
Reflect.defineProperty(input, 'nonWitnessUtxo', {
    enumerable: true,
    get(): Uint8Array { ... },
    set(data: Uint8Array): void { ... },
});

// CORRECT - proper encapsulation from the start
class PsbtInputWrapper {
    #nonWitnessUtxoBuffer: Uint8Array | undefined;
    #nonWitnessUtxoTransaction: Transaction | undefined;
    
    get nonWitnessUtxo(): Uint8Array | undefined {
        if (this.#nonWitnessUtxoBuffer) return this.#nonWitnessUtxoBuffer;
        if (this.#nonWitnessUtxoTransaction) {
            this.#nonWitnessUtxoBuffer = this.#nonWitnessUtxoTransaction.toBuffer();
            return this.#nonWitnessUtxoBuffer;
        }
        return undefined;
    }
}
```

## 1.2 Numeric Types

**§1.2.1** `number` is fine for values guaranteed to stay small: array lengths, loop counters, bit flags, enum values, pixel coordinates, retry counts, port numbers, HTTP status codes, small indices, or anything bounded by application logic to stay well under `Number.MAX_SAFE_INTEGER`. These values will never overflow in practice.

```typescript
// CORRECT - number for bounded small values
const length: number = array.length;
const retryCount: number = 3;
const port: number = 8080;
const flags: number = FLAG_A | FLAG_B | FLAG_C;
for (let i = 0; i < length; i++) { /* ... */ }
```

**§1.2.2** `bigint` is required for values that could grow large or where precision is critical: satoshi amounts, block heights, timestamps in milliseconds, database IDs, transaction counts, cumulative totals, file sizes, byte offsets in large files, or any value from external systems where you don't control the range.

```typescript
// CORRECT - bigint for potentially large or critical values
const satoshis: bigint = 2_100_000_000_000_000n;
const blockHeight: bigint = 850_000n;
const timestampMs: bigint = BigInt(Date.now());
const totalSupply: bigint = userBalances.reduce((sum, b) => sum + b, 0n);
const fileOffset: bigint = 0x1_0000_0000n; // >4GB
```

**§1.2.3** The question to ask: "Can this value ever exceed 2^53 in any edge case?" If yes, or if you're unsure, use `bigint`. If no and you control all inputs, `number` is fine.

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

**§1.2.4** Use `bigint` literals with the `n` suffix: `0n`, `100n`, `2_100_000_000_000_000n`. Never use `BigInt(largeNumberLiteral)` - the number literal loses precision before conversion.

**§1.2.5** When external APIs return `number` for values that should be `bigint`, convert immediately:

```typescript
const externalId: number = api.getUserId();
const safeId: bigint = BigInt(Math.trunc(externalId));
```

**§1.2.6** When APIs require `number` but you have `bigint`, convert at the boundary with validation:

```typescript
function toSafeNumber(value: bigint): number {
    if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError(`Value ${value} exceeds safe integer range`);
    }
    return Number(value);
}
```

**§1.2.7** Division with `bigint` truncates toward zero. For different rounding:

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

**§1.2.8** For fixed-point decimal representation, use `bigint` with explicit scale:

```typescript
const DECIMALS = 8n;
const SCALE = 10n ** DECIMALS; // 100_000_000n

type FixedPoint = Brand<bigint, 'FixedPoint'>;

function multiply(a: FixedPoint, b: FixedPoint): FixedPoint {
    return ((a * b) / SCALE) as FixedPoint;
}
```

**§1.2.9** JSON does not support `bigint`. Serialize as strings:

```typescript
function serializeBigInt(value: bigint): string {
    return value.toString();
}

function deserializeBigInt(data: string): bigint {
    if (!/^-?\d+$/.test(data)) throw new TypeError('Invalid bigint string');
    return BigInt(data);
}
```

**§1.2.10** Never use `==` for comparisons (type coercion). Use `===`. Mixed `bigint`/`number` in arithmetic throws TypeError - this is good, it catches bugs.

**§1.2.11** Bitwise on `number` truncates to 32 bits. Bitwise on `bigint` preserves all bits:

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

## 1.3 Immutability by Default

**§1.3.1** Everything is `readonly` by default. Mutable state should be explicit and intentional. Readonly hints help V8 optimize and prevent entire categories of bugs. If something needs to change, make that explicit rather than assuming mutability.

**§1.3.2** All interface properties must be `readonly`.

**§1.3.3** All function parameters accepting arrays must be `readonly T[]`.

**§1.3.4** All class fields must be `readonly` unless mutation is required and justified.

**§1.3.5** Use `as const` for all literal objects and arrays that should be immutable. This preserves literal types and makes arrays into readonly tuples.

**§1.3.6** Combine `as const` with `Object.freeze()` for compile-time and runtime immutability.

**§1.3.7** Readonly types must be introduced top-down, not bottom-up. When adding `readonly` to a foundational type, all consumers must be audited and fixed simultaneously. Piecemeal readonly adoption creates type incompatibilities where functions reject valid readonly inputs or return mutable types that break readonly callers. Either commit to full readonly propagation across the dependency chain, or use explicit mutable type aliases (`MutableStack`, `WritableBuffer`) for the transition period. Functions that only read should accept `readonly`. Functions that build internally use mutable locals and return `readonly`. Never accept mutable and return readonly without the function signature making the contract clear.

```typescript
// CORRECT - accept readonly, build with mutable local, return readonly
function processStack(input: readonly StackElement[]): readonly Uint8Array[] {
    const result: Uint8Array[] = []; // mutable local for building
    for (const element of input) {
        result.push(/* ... */);
    }
    return result; // mutable assignable to readonly return
}

// FORBIDDEN - accept mutable when you only read
function processStack(input: StackElement[]): Uint8Array[] {
    // Rejects readonly inputs for no reason
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

**§1.3.8** `Object.freeze()` on typed arrays is forbidden. It does not prevent element mutation, only property addition. The underlying `ArrayBuffer` remains writable. For typed array constants:

- Internal module constants that are not exported require only `const` binding and documentation (`/** @internal Do not mutate */`). The threat model is self-mutation within the same file, which code review catches.
- Exported typed array constants must use factory functions returning fresh copies from a frozen `number[]` source, accepting the allocation overhead. If the overhead is unacceptable, do not export the constant; export a function that uses it internally.
- Never rely on `Object.freeze()`, `.slice()` defensive copies, or getter patterns for typed array immutability. All are bypassable through `ArrayBuffer` access, `DataView`, or prototype manipulation.

```typescript
// INTERNAL CONSTANT - documentation sufficient
/** @internal Do not mutate */
const EC_P: Uint8Array = fromHex('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');

// EXPORTED CONSTANT - factory required
const EC_P_SOURCE: readonly number[] = Object.freeze([0xff, 0xff, /* ... */]);
export function getEcP(): Uint8Array {
    return new Uint8Array(EC_P_SOURCE);
}

// FORBIDDEN - false sense of security
export const EC_P = Object.freeze(fromHex('...')); // Elements still mutable
export const getEcP = (): Uint8Array => _source.slice(); // Bypassable via .buffer
```

## 1.4 Enum Pattern

**§1.4.1** Native `enum` is forbidden. Generates runtime objects, prevents tree-shaking, numeric enums allow arbitrary number assignment, and reverse mappings bloat bundles.

**§1.4.2** Use const objects with derived types and `bigint` values. They provide superior IDE support: autocomplete, rename refactoring, go-to-definition, and find-all-references:

```typescript
const Status = { Pending: 0n, Active: 1n, Completed: 2n } as const;
type Status = (typeof Status)[keyof typeof Status];
```

**§1.4.3** Use `Symbol()` for unique non-serializable values that must never be compared to non-enum values. Use `Symbol.for()` for cross-realm sharing when debugging keys are needed.

## 1.5 Interface vs Type

**§1.5.1** Use `interface` for object shapes. Better compiler performance, error messages, declaration merging.

**§1.5.2** Use `type` for unions, intersections, mapped types, conditional types, primitives, tuples.

## 1.6 Discriminated Unions

**§1.6.1** Use discriminated unions for variant types. A literal `type`, `kind`, or `status` field lets TypeScript prove exhaustiveness in switch statements and lets V8 inline the dispatch. This pattern is safer than class hierarchies and faster at runtime.

**§1.6.2** Always implement exhaustiveness checking:

```typescript
default: const _exhaustive: never = value; throw new Error(`Unhandled: ${_exhaustive}`);
```

**§1.6.3** ALWAYS export each variant separately. Inline union members are shit code - impossible to reuse, impossible to import individually, impossible to extend:

```typescript
// CORRECT - reusable, importable, extendable
export interface Success<T> { readonly success: true; readonly value: T; }
export interface Failure<E> { readonly success: false; readonly error: E; }
export type Result<T, E = Error> = Success<T> | Failure<E>;

// FORBIDDEN - inline variants, no reuse possible
type Result<T, E> = { success: true; value: T } | { success: false; error: E };
```

**§1.6.4** Always define named types/interfaces for return types. Never return inline objects. Named types are documentable, importable, and refactorable.

## 1.7 Branded Types

**§1.7.1** Branded types provide compile-time distinction between semantically different values of the same underlying type with zero runtime cost. Use them for IDs, hashes, keys, amounts, and any domain values that shouldn't be interchangeable. A `TxId` should never be assignable to a `BlockHash` even though both are `Uint8Array`:

```typescript
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };
type TxId = Brand<Uint8Array, 'TxId'>;
type BlockHash = Brand<Uint8Array, 'BlockHash'>;
type Satoshis = Brand<bigint, 'Satoshis'>;
type BlockHeight = Brand<bigint, 'BlockHeight'>;
type Address = Brand<string, 'Address'>;
```

**§1.7.2** Apply brands through validated factory functions, never direct casts. The factory validates constraints and returns the branded type:

```typescript
function createSatoshis(value: bigint): Satoshis {
    if (value < 0n) throw new RangeError('Satoshis cannot be negative');
    if (value > 2_100_000_000_000_000n) throw new RangeError('Exceeds max supply');
    return value as Satoshis;
}

function createBlockHeight(value: bigint): BlockHeight {
    if (value < 0n) throw new RangeError('Block height cannot be negative');
    return value as BlockHeight;
}
```

## 1.8 Generics

**§1.8.1** Use constraints (`extends`) to ensure type safety.

**§1.8.2** Provide default type parameters for optional generics.

**§1.8.3** Use `NoInfer<T>` to control inference location.

**§1.8.4** Use variance annotations (`in`, `out`, `in out`) for clarity.

**§1.8.5** Use `infer` to extract types in conditionals:

```typescript
type ReturnType<T> = T extends (...args: readonly unknown[]) => infer R ? R : never;
type ElementType<T> = T extends readonly (infer E)[] ? E : never;
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
```

## 1.9 Utility Types

### Built-in Types Nobody Knows Exist

**`Awaited<T>`** - Recursively unwraps Promise types, handles nested promises:

```typescript
type A = Awaited<Promise<Promise<string>>>;     // string
type B = Awaited<Promise<number> | string>;     // number | string
type C = Awaited<Promise<Promise<Promise<bigint>>>>; // bigint
```

**`NoInfer<T>`** - Prevents inference from a specific position, forces TypeScript to infer the type parameter elsewhere:

```typescript
function createState<T>(initial: T, defaultValue: NoInfer<T>): T {
    return initial ?? defaultValue;
}
// T inferred only from 'initial', not 'defaultValue'
// Without NoInfer, passing different types would widen T unexpectedly

declare function doSomething<T extends string>(x: T, y: NoInfer<T>): void;
doSomething('hello', 'world'); // T is 'hello', y must be 'hello'
```

**`Uppercase<T>` / `Lowercase<T>` / `Capitalize<T>` / `Uncapitalize<T>`** - Intrinsic string manipulation at type level:

```typescript
type Shouting = Uppercase<'hello'>;       // 'HELLO'
type Whisper = Lowercase<'HELLO'>;        // 'hello'
type Title = Capitalize<'hello'>;         // 'Hello'
type Lower = Uncapitalize<'Hello'>;       // 'hello'

// Use in mapped types
type EventHandlers<T> = {
    [K in keyof T as `on${Capitalize<string & K>}`]: (value: T[K]) => void
};
```

**`ThisParameterType<T>` / `OmitThisParameter<T>`** - Extract or remove `this` parameter from function types:

```typescript
function greet(this: { name: string }, greeting: string): string {
    return `${greeting}, ${this.name}`;
}

type ThisType = ThisParameterType<typeof greet>;  // { name: string }
type NoThis = OmitThisParameter<typeof greet>;    // (greeting: string) => string
```

**`InstanceType<T>` / `ConstructorParameters<T>`** - Extract instance type and constructor params from class:

```typescript
class Transaction {
    constructor(
        public readonly txId: string,
        public readonly amount: bigint,
        public readonly timestamp: bigint
    ) {}
}

type TxInstance = InstanceType<typeof Transaction>;  // Transaction
type TxParams = ConstructorParameters<typeof Transaction>;  // [string, bigint, bigint]

// Useful for factories
function create<T extends new (...args: readonly unknown[]) => unknown>(
    ctor: T,
    ...args: ConstructorParameters<T>
): InstanceType<T> {
    return new ctor(...args) as InstanceType<T>;
}
```

**`Parameters<T>` / `ReturnType<T>`** - Extract function parameter tuple and return type:

```typescript
function process(input: string, count: bigint): boolean { return true; }

type Params = Parameters<typeof process>;    // [input: string, count: bigint]
type Return = ReturnType<typeof process>;    // boolean

// Extract specific parameter
type FirstParam = Parameters<typeof process>[0];  // string
type SecondParam = Parameters<typeof process>[1]; // bigint
```

**`Extract<T, U>` / `Exclude<T, U>`** - Filter union members:

```typescript
type Mixed = 'a' | 'b' | 'c' | 1 | 2 | true;

type OnlyStrings = Extract<Mixed, string>;   // 'a' | 'b' | 'c'
type OnlyNumbers = Extract<Mixed, number>;   // 1 | 2
type NoStrings = Exclude<Mixed, string>;     // 1 | 2 | true
type NoNumbers = Exclude<Mixed, number>;     // 'a' | 'b' | 'c' | true

// Extract specific literal
type JustA = Extract<Mixed, 'a'>;            // 'a'
```

**`NonNullable<T>`** - Remove `null` and `undefined` from union:

```typescript
type Maybe = string | null | undefined;
type Definitely = NonNullable<Maybe>;        // string

type Complex = string | number | null | undefined;
type Clean = NonNullable<Complex>;           // string | number
```

**`PropertyKey`** - Union of all valid object key types (often forgotten):

```typescript
type PropertyKey = string | number | symbol;

// Useful for generic key constraints
function getProperty<T, K extends PropertyKey>(obj: T, key: K): unknown {
    return (obj as Record<PropertyKey, unknown>)[key];
}
```

**`infer` keyword** - Extract types from within conditional types:

```typescript
// Extract return type
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;

// Extract array element type
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

// Extract Promise inner type
type Unpromise<T> = T extends Promise<infer U> ? U : T;

// Extract second parameter
type SecondArg<T> = T extends (a: unknown, b: infer B, ...rest: unknown[]) => unknown ? B : never;

// Extract property type by key
type PropType<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never;

// Multiple infers
type FunctionParts<T> = T extends (...args: infer A) => infer R 
    ? { args: A; return: R } 
    : never;
```

### Custom Utility Types - The Essentials

**`Brand<T, B>`** - Compile-time distinction between identical underlying types. Zero runtime cost. Prevents mixing semantically different values:

```typescript
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Now these are incompatible even though both are bigint
type Satoshis = Brand<bigint, 'Satoshis'>;
type BlockHeight = Brand<bigint, 'BlockHeight'>;
type Timestamp = Brand<bigint, 'Timestamp'>;

// And these are incompatible even though both are string
type TxId = Brand<string, 'TxId'>;
type Address = Brand<string, 'Address'>;
type PublicKey = Brand<string, 'PublicKey'>;

// Create via validated factories
function satoshis(value: bigint): Satoshis {
    if (value < 0n) throw new RangeError('Satoshis cannot be negative');
    if (value > 2_100_000_000_000_000n) throw new RangeError('Exceeds max supply');
    return value as Satoshis;
}

function blockHeight(value: bigint): BlockHeight {
    if (value < 0n) throw new RangeError('Block height cannot be negative');
    return value as BlockHeight;
}

// Compiler catches misuse
function sendPayment(to: Address, amount: Satoshis): TxId { /* ... */ }

const addr = 'bc1q...' as Address;
const txid = 'abc123' as TxId;
const sats = satoshis(100_000n);

sendPayment(addr, sats);    // works
sendPayment(txid, sats);    // ERROR: TxId is not Address
sendPayment(addr, 100_000n);// ERROR: bigint is not Satoshis
```

**`DeepReadonly<T>` / `DeepPartial<T>` / `DeepRequired<T>`** - Recursive type transformations:

```typescript
type DeepReadonly<T> = T extends object 
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> } 
    : T;

type DeepPartial<T> = T extends object 
    ? { [P in keyof T]?: DeepPartial<T[P]> } 
    : T;

type DeepRequired<T> = T extends object 
    ? { [P in keyof T]-?: DeepRequired<T[P]> } 
    : T;

// Usage
interface Config {
    server: { host: string; port: number };
    db: { connection: { url: string; pool: number } };
}

type FrozenConfig = DeepReadonly<Config>;
// All nested properties are readonly

type PartialConfig = DeepPartial<Config>;
// { server?: { host?: string; port?: number }; db?: { connection?: { url?: string; pool?: number } } }
```

**`Prettify<T>`** - Expands intersection types for readable IDE tooltips:

```typescript
type Prettify<T> = { [K in keyof T]: T[K] } & {};

// Without Prettify, IDE shows: Pick<User, 'name'> & { age: number }
// With Prettify, IDE shows: { name: string; age: number }

type Ugly = Pick<{ name: string; email: string }, 'name'> & { age: number };
type Pretty = Prettify<Ugly>;  // { name: string; age: number }
```

**`StrictOmit<T, K>`** - Like `Omit` but errors on non-existent keys:

```typescript
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface User { name: string; email: string; age: number; }

type NoEmail = StrictOmit<User, 'email'>;      // works
type NoFoo = StrictOmit<User, 'foo'>;          // ERROR: 'foo' not in keyof User

// Built-in Omit silently accepts any string
type BuiltIn = Omit<User, 'foo'>;              // no error, dangerous
```

**`Nullable<T>` / `Maybe<T>`** - Explicit nullability:

```typescript
type Nullable<T> = T | null;
type Maybe<T> = T | null | undefined;

function find(id: string): Nullable<User> { /* returns User or null */ }
function parse(input: unknown): Maybe<Config> { /* returns Config, null, or undefined */ }
```

**`ValuesOf<T>`** - Extract value types from object:

```typescript
type ValuesOf<T> = T[keyof T];

const Status = { Pending: 0, Active: 1, Completed: 2 } as const;
type StatusValue = ValuesOf<typeof Status>;  // 0 | 1 | 2

const ErrorCodes = { NotFound: 404, BadRequest: 400, Internal: 500 } as const;
type ErrorCode = ValuesOf<typeof ErrorCodes>;  // 404 | 400 | 500
```

**`KeysMatching<T, V>`** - Filter object keys by value type:

```typescript
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
```

**`Mutable<T>`** - Remove `readonly` modifiers:

```typescript
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

type DeepMutable<T> = T extends object 
    ? { -readonly [P in keyof T]: DeepMutable<T[P]> } 
    : T;

interface Frozen { readonly id: string; readonly data: readonly number[]; }
type Thawed = Mutable<Frozen>;  // { id: string; data: readonly number[] }
type FullyThawed = DeepMutable<Frozen>;  // { id: string; data: number[] }
```

**`XOR<T, U>`** - Exactly one of two types, not both, not neither:

```typescript
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = (T | U) extends object 
    ? (Without<T, U> & U) | (Without<U, T> & T) 
    : T | U;

// Either has 'error' or 'data', never both, never neither
type ApiResponse<T> = XOR<
    { success: true; data: T },
    { success: false; error: string }
>;

const good: ApiResponse<number> = { success: true, data: 42 };
const bad: ApiResponse<number> = { success: false, error: 'fail' };
const invalid1: ApiResponse<number> = { success: true, data: 42, error: 'x' }; // ERROR
const invalid2: ApiResponse<number> = { success: true }; // ERROR: missing data
```

**`Expand<T>`** - Force evaluation of complex types for debugging:

```typescript
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type ExpandRecursive<T> = T extends object
    ? T extends infer O ? { [K in keyof O]: ExpandRecursive<O[K]> } : never
    : T;
```

**`RequireAtLeastOne<T>` / `RequireExactlyOne<T>`** - Constrain which properties must exist:

```typescript
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

type RequireExactlyOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>> }[Keys];

interface SearchParams {
    id?: string;
    email?: string;
    username?: string;
}

// At least one of id, email, or username required
type ValidSearch = RequireAtLeastOne<SearchParams, 'id' | 'email' | 'username'>;
```

### Template Literal Types

**§1.9.1** Use template literals for constrained string patterns:

```typescript
type HexString = `0x${string}`;
type Bech32Address = `bc1q${string}` | `bc1p${string}`;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type Endpoint = `/${string}`;
type Route = `${HttpMethod} ${Endpoint}`;

const valid: Route = 'GET /api/users';
const invalid: Route = 'FETCH /api/users'; // ERROR
```

**§1.9.2** Template literals with unions expand combinatorially:

```typescript
type Color = 'red' | 'green' | 'blue';
type Size = 'sm' | 'md' | 'lg';
type Variant = `${Color}-${Size}`;
// 'red-sm' | 'red-md' | 'red-lg' | 'green-sm' | 'green-md' | 'green-lg' | 'blue-sm' | 'blue-md' | 'blue-lg'
```

**§1.9.3** Use template literals for key remapping in mapped types:

```typescript
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type Setters<T> = { [K in keyof T as `set${Capitalize<string & K>}`]: (v: T[K]) => void };

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;  // { getName: () => string; getAge: () => number }
type PersonSetters = Setters<Person>;  // { setName: (v: string) => void; setAge: (v: number) => void }
```

### Type System Philosophy

**§1.9.4** Complex typing is always good. If the type system catches it at compile time, runtime doesn't have to.

**§1.9.5** Prefer complex compile-time types over simple runtime checks. Type complexity has zero runtime cost.

**§1.9.6** Use types aggressively. Every type constraint is a bug that can't happen.

## 1.10 Strict Compiler Options

**§1.11.1** Required tsconfig options:

```json
{
  "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true, "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true, "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true, "noPropertyAccessFromIndexSignature": true,
  "verbatimModuleSyntax": true, "isolatedModules": true
}
```

## 1.11 Assertions

**§1.12.1** Minimize type assertions. Prefer type guards.

**§1.12.2** Never use angle bracket syntax (`<Type>value`).

**§1.12.3** Minimize `!` non-null assertions. Prefer optional chaining or explicit checks.

**§1.12.4** Use `satisfies` to validate types while preserving narrow inference.

---

# CHAPTER 2: CLASS STRUCTURE

## 2.1 When to Use Classes

**§2.1.1** Use classes when methods logically belong to data. A class with methods is more discoverable and maintainable than scattered functions. IDE autocomplete shows all available operations on the type.

**§2.1.2** Prefer classes over plain objects + functions when: state and behavior are tightly coupled, you need encapsulation via private fields, or the API benefits from method chaining.

## 2.2 Declaration Order

**§2.2.1** Strict order: static private → static public → static blocks → `#private` instance → protected → public readonly → public mutable → constructor → static methods → public methods → protected methods → private methods.

## 2.3 Property Initialization

**§2.3.1** Initialize ALL properties in constructor in declaration order. V8 creates hidden classes based on initialization order. Inconsistent order creates multiple hidden classes, destroying performance.

**§2.3.2** Never add properties after construction. Never conditionally initialize. This breaks V8's hidden class optimization.

**§2.3.3** Use `null` for "no value" to maintain consistent object shape. Optional properties with `undefined` create different shapes.

## 2.4 Private Fields

**§2.4.1** Use `#privateFields` for true encapsulation. TypeScript's `private` keyword is compile-time only - accessible via `(obj as any).field`. Native `#` fields are enforced at runtime by the engine, invisible to reflection.

**§2.4.2** Use `#field in obj` for brand checking - the only secure way to verify genuine instances.

## 2.5 Static Initialization

**§2.5.1** Use `static { }` blocks for complex static initialization that requires logic.

**§2.5.2** Freeze class and prototype in static block to prevent modification: `Object.freeze(this); Object.freeze(this.prototype);`

## 2.6 Inheritance

**§2.6.1** Call `super()` before accessing `this`.

**§2.6.2** Always use `override` keyword for overrides - compiler catches typos and signature changes.

**§2.6.3** Prefer composition over inheritance. Inheritance couples tightly; composition couples loosely.

## 2.7 Decorators

**§2.7.1** Decorators receive element and context, return optional replacement.

**§2.7.2** Use `context.addInitializer()` for setup code that runs on instantiation.

**§2.7.3** Access decorator metadata via `Class[Symbol.metadata]`.

**§2.7.4** Use for cross-cutting concerns: memoization, logging, validation, dependency injection, timing.

---

# CHAPTER 3: RUNTIME SAFETY

## 3.1 Reflect API

**§3.1.1** Use `Reflect` methods over direct operations. They return booleans instead of throwing.

**§3.1.2** Key methods: `Reflect.get`, `Reflect.set`, `Reflect.has`, `Reflect.deleteProperty`, `Reflect.ownKeys`, `Reflect.defineProperty`.

**§3.1.3** Always use Reflect in Proxy traps for correct default behavior.

## 3.2 Object Security

**§3.2.1** `Object.freeze()` - complete immutability. Use recursive deepFreeze for nested objects.

**§3.2.2** `Object.seal()` - prevent add/remove, allow modification.

**§3.2.3** `Object.preventExtensions()` - prevent adding only.

**§3.2.4** Freeze critical prototypes at startup: `Object.freeze(Object.prototype)`, etc.

**§3.2.5** Use `Object.create(null)` for dictionaries to prevent prototype pollution.

**§3.2.6** Use `Object.hasOwn(obj, prop)` instead of `obj.hasOwnProperty()`.

## 3.3 Proxy Pattern

**§3.3.1** Always use corresponding Reflect method in every trap.

**§3.3.2** Use `Proxy.revocable()` for temporary access grants.

**§3.3.3** Proxies cannot violate invariants (non-configurable properties, non-extensible objects).

**§3.3.4** Use Proxy for type-safe dynamic dispatch (ABI methods, lazy properties, validation layers).

## 3.4 Defensive Programming

**§3.4.1** No defensive programming = exploitable by design. Someone will always find what you didn't think of.

**§3.4.2** Use Result types instead of throwing in hot paths:

```typescript
export interface Success<T> { readonly success: true; readonly value: T; }
export interface Failure<E> { readonly success: false; readonly error: E; }
export type Result<T, E = Error> = Success<T> | Failure<E>;
```

**§3.4.3** Use type guards for narrowing: `function isX(v: unknown): v is X`.

**§3.4.4** Use assertion functions for invariants: `function assertX(v: unknown): asserts v is X`.

**§3.4.5** Validate at boundaries, trust internally.

**§3.4.6** Always check edge cases: empty arrays, zero values, max values, null, undefined, negative numbers, overflow.

**§3.4.7** Fail fast. Throw early on invalid state. Silent failures are vulnerabilities.

**§3.4.8** Never trust external input. Validate everything from: users, APIs, files, environment variables, CLI args.

**§3.4.9** Validate `bigint` ranges explicitly. Unlike `number`, `bigint` has no overflow - it grows indefinitely, which can exhaust memory or break assumptions:

```typescript
function assertInRange(value: bigint, min: bigint, max: bigint, name: string): void {
    if (value < min || value > max) {
        throw new RangeError(`${name} must be in range [${min}, ${max}], got ${value}`);
    }
}
```

---

# CHAPTER 4: MEMORY MANAGEMENT

## 4.1 Allocation

**§4.1.1** Never allocate in hot loops. Pre-allocate buffers at startup.

**§4.1.2** Use object pools for frequently created/destroyed objects.

**§4.1.3** Create one `DataView` per buffer and reuse it.

## 4.2 Views vs Copies

**§4.2.1** `subarray()` returns a VIEW (shared memory). `slice()` returns a COPY.

**§4.2.2** Use subarray for temporary access, slice only when independent copy needed.

**§4.2.3** `ArrayBuffer.transfer()` moves ownership without copying.

## 4.3 Weak References

**§4.3.1** `WeakMap`/`WeakSet` - associate data without preventing GC.

**§4.3.2** `WeakRef.deref()` - returns object or undefined if collected.

**§4.3.3** `FinalizationRegistry` - non-deterministic cleanup. Never for critical resources.

## 4.4 GC Optimization

**§4.4.1** Design for generational GC: short-lived objects in function scope, long-lived objects stable.

**§4.4.2** Avoid objects surviving to old generation then dying - most expensive pattern.

---

# CHAPTER 5: V8 OPTIMIZATION

## 5.1 Hidden Classes

**§5.1.1** Every object has a hidden class. Changing shape deoptimizes code.

**§5.1.2** Initialize all properties in constructor, same order, same types.

**§5.1.3** Never add properties after construction.

**§5.1.4** Never delete properties. Assign `undefined` instead.

**§5.1.5** Never change property types.

## 5.2 Inline Caching

**§5.2.1** Monomorphic (1 shape) = optimized.

**§5.2.2** Polymorphic (2-4 shapes) = slower.

**§5.2.3** Megamorphic (4+ shapes) = no optimization, permanently slow.

**§5.2.4** Keep function arguments consistent types.

## 5.3 Function Optimization

**§5.3.1** Keep hot functions small for inlining.

**§5.3.2** Never use `arguments` object.

**§5.3.3** Avoid rest parameters in hot paths.

**§5.3.4** Avoid closures capturing mutable variables.

## 5.4 Loop Optimization

**§5.4.1** Cache array length: `const len = arr.length; for (let i = 0; i < len; i++)`.

**§5.4.2** Use indexed `for` loops in hot paths. Avoid `for...of`, `forEach`.

**§5.4.3** Use iterator helpers for lazy operations outside hot paths.

## 5.5 Numeric Performance

**§5.5.1** `number` with 32-bit operations is faster than `bigint` and is the correct choice for checksums, hash functions, bit manipulation, and any operation where 32-bit semantics are intentional. V8 optimizes 32-bit integer operations heavily.

**§5.5.2** `bigint` is slower than Smi for small values, but precision trumps micro-optimization. For amounts, IDs, timestamps, or any value that could exceed 32 bits, the performance difference is negligible compared to the cost of silent precision loss.

**§5.5.3** `bigint` operations are not constant-time. For cryptographic code, use dedicated constant-time libraries. Never roll your own.

**§5.5.4** Avoid mixed `bigint`/`number` operations - they throw TypeError. This is good; it catches bugs at runtime instead of silently corrupting data.

## 5.6 Deoptimization Triggers

**§5.6.1** Avoid: mixing shapes in arrays, `arguments`, sparse arrays, `with`, `eval` in hot paths, try-catch spanning hot code.

## 5.7 Lazy Computation

**§5.7.1** Never compute what isn't needed. Lazy evaluation preferred.

**§5.7.2** Use getters for computed properties that may not be accessed:

```typescript
class Transaction {
    #cachedHash: Uint8Array | null = null;
    get hash(): Uint8Array {
        return this.#cachedHash ??= this.#computeHash();
    }
}
```

**§5.7.3** Use `@memoize` decorator for expensive pure functions.

**§5.7.4** Lazy initialization: don't create objects until first use.

---

# CHAPTER 6: CONCURRENCY

## 6.1 Promise Patterns

**§6.1.1** Use `Promise.withResolvers()` for external resolution.

**§6.1.2** Use custom `Promise.safeAll` instead of `Promise.all` - waits for all to settle before throwing first rejection. Implementation: use `allSettled`, then throw first rejected.

**§6.1.3** `Promise.race` - first settled. `Promise.any` - first fulfilled (throws AggregateError if all reject). `Promise.allSettled` - all results with status.

## 6.2 Async Best Practices

**§6.2.1** Don't make functions async unless they await.

**§6.2.2** Don't wrap sync code in async.

**§6.2.3** Use parallel awaits for independent operations.

**§6.2.4** Don't use async for CPU-bound work. Use Workers.

## 6.3 SharedArrayBuffer & Atomics

**§6.3.1** SharedArrayBuffer requires COOP/COEP headers in browsers.

**§6.3.2** Always use Atomics for shared memory access. Without sync, concurrent writes are undefined.

**§6.3.3** Key: `Atomics.load`, `Atomics.store`, `Atomics.add`, `Atomics.sub`, `Atomics.and`, `Atomics.or`, `Atomics.xor`, `Atomics.exchange`, `Atomics.compareExchange`.

**§6.3.4** Blocking: `Atomics.wait` (not main thread), `Atomics.waitAsync` (returns promise), `Atomics.notify`.

**§6.3.5** Use `Int32Array` or `BigInt64Array` for wait/notify. Prefer `BigInt64Array` for counters and values that may exceed 32 bits.

**§6.3.6** Use `Atomics.compareExchange` for lock-free algorithms and mutex implementation.

## 6.4 Workers

**§6.4.1** Worker creation expensive. Pool and reuse.

**§6.4.2** Use transferables: `postMessage(data, [buffer])`.

**§6.4.3** Use `structuredClone()` for deep clone with transfer.

---

# CHAPTER 7: RESOURCE MANAGEMENT

## 7.1 Disposable Pattern

**§7.1.1** Implement `Symbol.dispose` for sync, `Symbol.asyncDispose` for async cleanup.

**§7.1.2** Use `using` and `await using` for automatic cleanup.

**§7.1.3** Use `DisposableStack` to aggregate disposables.

## 7.2 Error Handling

**§7.2.1** Use `Error.cause` to chain errors.

**§7.2.2** Use `AggregateError` for multiple errors.

**§7.2.3** Keep try-catch out of hot paths.

---

# CHAPTER 8: BINARY DATA

## 8.1 TypedArrays & DataView

**§8.1.1** Use `Uint8Array` for raw bytes.

**§8.1.2** Use `DataView` for multi-byte integers with explicit endianness.

**§8.1.3** Bitcoin uses little-endian: `view.getUint32(offset, true)`.

**§8.1.4** Use `getBigUint64` and `getBigInt64` for 64-bit values. Never use `getFloat64` for integer data:

```typescript
// CORRECT - read as bigint
const value: bigint = view.getBigUint64(offset, true);

// FORBIDDEN - reading integer as float
const broken: number = view.getFloat64(offset, true);
```

**§8.1.5** Resizable buffers: `new ArrayBuffer(size, { maxByteLength })` then `buffer.resize(newSize)`.

**§8.1.6** Growable shared: `new SharedArrayBuffer(size, { maxByteLength })` then `buffer.grow(newSize)`.

## 8.2 Text Encoding

**§8.2.1** Use `TextEncoder` for string to UTF-8. Create once, reuse.

**§8.2.2** Use `encoder.encodeInto(string, uint8Array)` to write into existing buffer (avoids allocation).

**§8.2.3** Use `TextDecoder` for UTF-8 to string. Use `{ stream: true }` for streaming decode.

## 8.3 Bitwise Operations

**§8.3.1** JavaScript bitwise operators on `number` truncate to 32 bits. This is why `number` is forbidden for bit manipulation.

**§8.3.2** Use `bigint` for all bitwise operations. `bigint` preserves arbitrary precision:

```typescript
// CORRECT - bigint preserves all bits
const high64: bigint = value >> 64n;
const masked: bigint = value & ((1n << 256n) - 1n);

// FORBIDDEN - number truncates to 32 bits
const broken = value >> 64; // Always 0 or -1
```

**§8.3.3** Use `BigInt.asIntN(bits, value)` for signed truncation and `BigInt.asUintN(bits, value)` for unsigned truncation:

```typescript
const u256: bigint = BigInt.asUintN(256, value);
const i64: bigint = BigInt.asIntN(64, value);
```

## 8.4 BigInt Serialization

**§8.4.1** Write `bigint` to buffers using `DataView.setBigUint64` or manual byte extraction for larger values:

```typescript
function writeBigUint256(view: DataView, offset: number, value: bigint): void {
    for (let i = 0; i < 4; i++) {
        view.setBigUint64(offset + i * 8, BigInt.asUintN(64, value >> BigInt(i * 64)), true);
    }
}

function readBigUint256(view: DataView, offset: number): bigint {
    let result = 0n;
    for (let i = 0; i < 4; i++) {
        result |= view.getBigUint64(offset + i * 8, true) << BigInt(i * 64);
    }
    return result;
}
```

---

# CHAPTER 9: SYMBOLS

## 9.1 Well-Known Symbols

`Symbol.iterator` - iterable. `Symbol.asyncIterator` - async iterable. `Symbol.toStringTag` - toString. `Symbol.toPrimitive` - coercion. `Symbol.dispose`/`Symbol.asyncDispose` - using. `Symbol.hasInstance` - instanceof.

## 9.2 Custom Symbols

**§9.2.1** `Symbol()` - unique, discoverable via `Reflect.ownKeys`.

**§9.2.2** `Symbol.for(key)` - global registry, cross-realm.

---

# CHAPTER 10: ITERATION

## 10.1 Iterator Helpers

**§10.1.1** `.map()`, `.filter()`, `.take()`, `.drop()`, `.flatMap()`, `.reduce()`, `.toArray()` on iterators.

**§10.1.2** Lazy - no intermediate arrays.

**§10.1.3** `Iterator.from(iterable)` wraps any iterable.

---

# CHAPTER 11: MODERN APIs

## 11.1 Arrays

Immutable: `toSorted()`, `toReversed()`, `toSpliced()`, `with()`. Search: `findLast()`, `findLastIndex()`, `.at(-1)`. Group: `Object.groupBy()`, `Map.groupBy()`.

## 11.2 Strings

`isWellFormed()` - lone surrogates check. `toWellFormed()` - replace with U+FFFD.

## 11.3 RegExp

**§11.3.1** Named groups: `(?<name>pattern)` accessed via `match.groups.name`.

**§11.3.2** Lookbehind: `(?<=pattern)` positive, `(?<!pattern)` negative.

**§11.3.3** Unicode properties: `\p{Script=Greek}`, `\p{Emoji}` with `u` flag.

**§11.3.4** Set notation with `v` flag: `[a-z&&[^aeiou]]` intersection, `[[a-z]--[aeiou]]` subtraction.

## 11.4 Crypto

`crypto.subtle` - async hardware crypto. `crypto.getRandomValues()` - sync, max 65536 bytes. `crypto.randomUUID()` - UUID v4. Note: secp256k1 not in WebCrypto.

---

# CHAPTER 12: DOCUMENTATION

## 12.1 TSDoc

Required: `@param name - desc`, `@returns`, `@throws {Type}`, `@example`. Use `@remarks` for details, `@see {@link}` for refs. First paragraph = summary.

---

# CHAPTER 13: MODULES

## 13.1 ESM

**§13.1.1** ESM only. No CommonJS.

**§13.1.2** Export only public API.

**§13.1.3** `"sideEffects": false` in package.json.

## 13.2 Export Architecture

**§13.2.1** Re-exports are PROHIBITED. Never `export * from` or `export { x } from`.

**§13.2.2** Use a single central `index.ts` with explicit imports and exports:

```typescript
// CORRECT - central index.ts
import { Transaction } from './transaction.js';
import { Block } from './block.js';
import { Wallet } from './wallet.js';
export { Transaction, Block, Wallet };

// FORBIDDEN - re-export
export * from './transaction.js';
export { Block } from './block.js';
```

**§13.2.3** Subpath exports allowed for namespacing: `my-package/crypto`, `my-package/network`, `my-package/utils`. Configure in package.json `exports` field.

**§13.2.4** Main export must include all public API. Subpaths are convenience, not fragmentation.

## 13.3 Global Augmentation

Use `declare global { }` with `export {}`. Freeze prototypes after augmentation.

## 13.4 No Backward Compatibility

**§13.4.1** Breaking changes are breaking changes. No backward compatibility layers.

**§13.4.2** Delete deprecated code immediately. Dead code is attack surface.

**§13.4.3** Semver major version bumps are free. Use them.

**§13.4.4** Migration guides over compatibility shims.

---

# APPENDIX: QUICK REFERENCE

## Forbidden
`any`, `unknown` (except boundaries), `object`, `Function`, `{}`, native `enum`, `arguments`, `delete` on hot objects, angle bracket assertions, allocation in hot loops, re-exports, inline return types, backward compatibility shims, `number` for unbounded/external integers, floats for financial math.

## Required
`readonly` everywhere, `as const` for literals, `#privateFields`, `override` keyword, exhaustiveness checks, properties in declaration order, Reflect in Proxy traps, exported types for all variants, defensive edge case checks, lazy computation, `bigint` for amounts/heights/IDs/timestamps, `number` for lengths/counters/flags/indices, range validation at boundaries.

## Patterns
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

## V8
Same shape, same order, same types. Monomorphic = fast. Cache length, indexed loops, small functions. Pre-allocate, pool, reuse. Lazy compute.

## Principles
- No defensive programming = exploitable by design
- Complex types > simple runtime checks
- Delete deprecated code, don't deprecate
- Fail fast, fail loud
- Trust nothing external
- `bigint` for anything beyond 32 bits, `number` for intentional 32-bit ops
- Precision is non-negotiable

---

# CHAPTER 14: CODE QUALITY

## 14.1 Optimization Path

**§14.1.1** Always take the optimized path that leads to the correct solution.

**§14.1.2** Profile before optimizing. Measure, don't guess.

**§14.1.3** Optimize hot paths first. 90% of time is spent in 10% of code.

## 14.2 Code Hygiene

**§14.2.1** Dead code is attack surface. Delete it.

**§14.2.2** Commented-out code is dead code. Delete it.

**§14.2.3** TODO comments older than one sprint are lies. Delete or do.

**§14.2.4** Unused imports, variables, parameters - delete immediately.

## 14.3 Naming

**§14.3.1** Names should be precise. `data`, `info`, `item`, `result` are banned without qualification.

**§14.3.2** Boolean names must read as questions: `isValid`, `hasPermission`, `canExecute`.

**§14.3.3** Function names must be verbs: `compute`, `validate`, `serialize`, `parse`.

**§14.3.4** Type names must be nouns: `Transaction`, `ValidationError`, `BlockHeader`.

## 14.4 Function Design

**§14.4.1** Single responsibility. One function, one job.

**§14.4.2** Max 3 parameters. Use options object for more.

**§14.4.3** No boolean parameters. Use discriminated options or separate functions.

**§14.4.4** Pure functions preferred. Side effects must be explicit and documented.

## 14.5 Error Messages

**§14.5.1** Error messages must include: what failed, why it failed, what value was received.

**§14.5.2** Include context: `Expected TxId (32 bytes), got ${value.length} bytes`.

**§14.5.3** Never: "Invalid input", "Error occurred", "Something went wrong".

---

*TypeScript Law 2026 - The specification that separates professional code from garbage.*

---

# CHAPTER 15: SECURITY

## 15.1 Input Validation

**§15.1.1** All external input is hostile until validated.

**§15.1.2** Validate type, range, length, format, encoding.

**§15.1.3** Reject invalid input, don't sanitize. Sanitization hides bugs.

**§15.1.4** Whitelist valid values, don't blacklist invalid ones.

## 15.2 Cryptographic Safety

**§15.2.1** Never implement crypto. Use audited libraries.

**§15.2.2** Never reuse nonces. Ever.

**§15.2.3** Use constant-time comparison for secrets.

**§15.2.4** Zero sensitive data after use. Don't rely on GC.

**§15.2.5** Validate all curve points, signatures, proofs before use.

## 15.3 Resource Limits

**§15.3.1** Set explicit limits on: array sizes, string lengths, recursion depth, iteration counts, `bigint` magnitude.

**§15.3.2** Timeout all external operations.

**§15.3.3** Rate limit all public endpoints.

**§15.3.4** Bound memory usage. Unbounded growth = DoS vector. Note that `bigint` can grow arbitrarily large - always validate maximum expected magnitude.

## 15.4 State Integrity

**§15.4.1** Validate state transitions. Invalid state = exploit.

**§15.4.2** Use checksums/hashes for data integrity verification.

**§15.4.3** Atomic operations for state changes. No partial updates.

**§15.4.4** Log security-relevant events. Silent failures hide attacks.
