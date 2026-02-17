# AssemblyScript Smart Contract Transform

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![AssemblyScript](https://img.shields.io/badge/assembly%20script-%23000000.svg?style=for-the-badge&logo=assemblyscript&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

This package is an **AssemblyScript transform** that automatically scans your smart-contract source code for:

- Methods decorated with `@method`, `@returns`, and `@emit`
- Event classes (declared via `@event` **or** classes extending `NetEvent`)
- Constructor parameters for event classes
- ABI definitions and type definitions for each contract class

It then:

1. **Generates ABI** files (`.abi.json`) in an `abis/` folder for each contract class.
2. **Generates `.d.ts`** definitions for each ABI.
3. **Injects** an `execute(...)` method that dispatches calls based on a 4-byte selector.

This is useful for writing contracts in AssemblyScript while automatically producing typed ABIs and
event definitions.

---

## Table of Contents

- [Configuration](#configuration)
- [How It Works](#how-it-works)
    - [Decorators](#decorators)
    - [Event Classes](#event-classes)
    - [Methods & Returns](#methods--returns)
    - [Emit Decorator](#emit-decorator)
- [Example Contract](#example-contract)
- [Generated ABI Artifacts](#generated-abi-artifacts)
- [Typical Usage with asc](#typical-usage-with-asc)
- [FAQ / Tips](#faq--tips)
- [License](#license)

---

## Configuration

To use this transform, you should configure your AssemblyScript project with the following files:

**`tsconfig.json`**:

```jsonc
{
  "extends": "@btc-vision/opnet-transform/std/assembly.json",
  "include": [
    "./**/*.ts",
    "../contracts/**/*.ts"
  ]
}
```

- Extends a basic AssemblyScript/TypeScript config from `@btc-vision/opnet-transform`.
- In `include`, list all the `.ts` paths to be compiled.

**`asconfig.json`**:

```jsonc
{
  "targets": {
    "release": {
      "outFile": "build/MyToken.wasm",
      "textFile": "build/MyToken.wat",
      "sourceMap": false,
      "optimizeLevel": 3,
      "shrinkLevel": 2,
      "converge": true,
      "noAssert": true,
      "disable": [
        "mutable-globals",
        "sign-extension",
        "nontrapping-f2i",
        "bulk-memory"
      ],
      "runtime": "stub",
      "memoryBase": 0,
      "initialMemory": 1,
      "maximumMemory": 512,
      "bindings": "esm",
      "exportStart": "start",
      "use": [
        "abort=src/index/abort"
      ]
    }
  },
  "options": {
    "transform": "@btc-vision/opnet-transform"
  }
}
```

In particular:

- **`"transform": "@btc-vision/opnet-transform"`** instructs AssemblyScript to run this transform on your code.
- The `"targets.release"` block is where you specify how to compile your `.wasm`, how aggressively to optimize, memory
  limits, etc.

With both `tsconfig.json` and `asconfig.json` in place, simply run your build script (e.g. `asc --config asconfig.json`)
to compile your AssemblyScript code through the transform.

---

## How It Works

### Decorators

- `@method(...)`: Marks a method as callable; this is added to the contract’s ABI.
- `@returns(...)`: Defines return values for a method, which the transform adds to the ABI.
- `@emit(...)`: Declares that the method will emit certain event names.

### Event Classes

Event classes can be declared in **two** ways:

1. **Extending `NetEvent`**:
   ```ts
   export class Deposit extends NetEvent {
     constructor(user: Address, poolId: u64, amount: u256, to: Address) {
       const eventData = new BytesWriter(...);
       eventData.writeAddress(user);
       ...
       super("Deposit", eventData);
     }
   }
   ```
    - Automatically recognized as an event, even without `@event`.

2. **Using the `@event` Decorator**:
   ```ts
   @event("Deposit")
   export class Deposit {
     user: Address;
     amount: u256;
     ...
   }
   ```

### Methods & Returns

Each callable method can have a `@method(...)` decorator to:

- Override the method name for ABI purposes.
- Provide parameter definitions (either as strings or `{ name, type }` objects).

A `@returns(...)` decorator can define the output parameters. For example:

```ts
@method("mint", { name: "to", type: ABIDataTypes.ADDRESS }, { name: "amount", type: ABIDataTypes.UINT256 })
@returns({ name: "success", type: ABIDataTypes.BOOL })
```

### Emit Decorator

Annotate a method with `@emit("EventNameA", "EventNameB")` if it triggers events. The transform will:

1. Assign those events to the contract’s ABI.
2. Generate typed event definitions (like `EventNameAEvent` in the `.d.ts`).
3. Warn if you reference an event that isn’t declared.

---

## Example Contract

```ts
import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    AddressMap,
    Blockchain,
    BytesWriter,
    Calldata,
    DeployableOP_20,
    OP20InitParameters,
    BOOLEAN_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

@final
export class MyToken extends DeployableOP_20 {
    public constructor() {
        super();
        // ...
    }

    public override onDeployment(_calldata: Calldata): void {
        const maxSupply: u256 = u256.fromString('100000000000000000000000000000000000');
        const decimals: u8 = 18;
        const name: string = 'BobTheNoob';
        const symbol: string = 'BOB';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));
    }

    @method(
        { name: 'address', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const response = new BytesWriter(BOOLEAN_BYTE_LENGTH);
        const resp = this._mint(calldata.readAddress(), calldata.readU256());
        response.writeBoolean(resp);

        return response;
    }

    // ...
}
```

### Missing @emit?

If you define a method that emits an event class, you can mark it:

```ts
@method()
@emit("TransferEvent")
public
transfer(calldata
:
Calldata
):
BytesWriter
{
    // ...
    // triggers event 'TransferEvent'
    return new BytesWriter(0);
}
```

This ensures the event gets added to the contract’s ABI.

---

## Generated ABI Artifacts

After compiling, you’ll find a directory named `abis/` containing:

1. **`<ClassName>.abi.json`**  
   Describes the methods (and their input/output types) plus any events the class uses.
2. **`<ClassName>.d.ts`**  
   A TypeScript declaration file for typed usage in client code, e.g.:
   ```ts
   import { IMyToken } from "./abis/MyToken";
   ```

Each `.d.ts` includes:

- **Event interfaces**: `<EventName>Event`.
- **CallResult** types: describing the method outputs and the events it emits.

---

## Typical Usage with asc

Use the AssemblyScript compiler, referencing `asconfig.json`:

```bash
npx asc -c asconfig.json
```

- The transform scans your code for `@method`, `@returns`, `@emit`, and event classes.
- It automatically creates an `abis/` folder next to your compiler output.

---

## FAQ / Tips

1. **Can I rename a method for ABI without changing its actual function name?**  
   Yes, you can do `@method("someOtherName", "uint256")`.

2. **How do I define multiple returns?**  
   Use `@returns("uint256", "bool")` or multiple named objects:
   `@returns({ name: "foo", type: "uint256" }, { name: "bar", type: "bool" })`.

3. **Where do events go if I never reference them with @emit?**  
   The transform logs a warning that an event was declared but never used. Unused events won’t appear in any contract’s
   final ABI.

4. **How do I reference events across multiple files?**  
   As long as the event class (extending `NetEvent`) is imported into the same compilation scope, the transform sees it.
   `@emit("EventName")` just has to match the event’s class name or override name (if you used `@event("SomeName")`).

---

## License

[MIT](./LICENSE)