# @btc-vision/as-bignum

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![AssemblyScript](https://img.shields.io/badge/assembly%20script-%23000000.svg?style=for-the-badge&logo=assemblyscript&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Overview

High-performance fixed-length big numbers for [AssemblyScript](https://github.com/AssemblyScript/assemblyscript) and
WebAssembly. This library provides wide numeric types such as `u128`, `u256`, `i128`, and `i256` with full arithmetic
operations support.

Designed for **blockchain smart contracts**, **cryptographic operations**, and any use case requiring **deterministic
behavior** with large integers in WebAssembly environments.

> **Critical: Floating-Point Arithmetic is Prohibited in Blockchain**
>
> Floating-point arithmetic (`f32`, `f64`) is **strictly prohibited** in blockchain and smart contract environments.
> Floating-point operations are **non-deterministic** across different CPU architectures, compilers, and platforms due
> to differences in rounding, precision, and IEEE 754 implementation details.
>
> This library provides some floating-arithmetic operations but should not be used in smart contracts. If you use
> floating by mistake, your contract will be invalidated on the blockchain.
>
> **Always use integer arithmetic** (`u128`, `u256`, `i128`, `i256`) for all blockchain computations. For decimal
> values, use fixed-point representation (e.g., store currency as smallest units like satoshis).

This library is a fork of the original [as-bignum](https://github.com/MaxGraey/as-bignum) by MaxGraey. The original
library contained **critical vulnerabilities** that have been addressed in this fork.

## Security Audit

<p align="center">
  <a href="https://verichains.io">
    <img src="https://raw.githubusercontent.com/btc-vision/contract-logo/refs/heads/main/public-assets/verichains.png" alt="Verichains" width="100"/>
  </a>
</p>

<p align="center">
  <a href="https://verichains.io">
    <img src="https://img.shields.io/badge/Security%20Audit-Verichains-4C35E0?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDV2Ni41YzAgNS4yNSAzLjQgMTAuMiA4IDExLjUgNC42LTEuMyA4LTYuMjUgOC0xMS41VjVsLTgtM3ptMCAxMC45OVYxOS41Yy0zLjQ1LTEuMTctNS45My00LjgtNi02LjVWNi4zTDEyIDRsMCA4Ljk5eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=" alt="Audited by Verichains"/>
  </a>
  <a href="./SECURITY.md">
    <img src="https://img.shields.io/badge/Security-Policy-22C55E?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOSAxNi4xN0w0LjgzIDEybC0xLjQyIDEuNDFMOSAxOSAyMSA3bC0xLjQxLTEuNDFMOSAxNi4xN3oiIGZpbGw9IndoaXRlIi8+PC9zdmc+" alt="Security Policy"/>
  </a>
</p>

This library has been professionally audited by [**Verichains**](https://verichains.io), a leading blockchain security
firm specializing in smart contract audits, cryptographic implementation reviews, and WebAssembly security analysis.

For detailed audit information and security policy, see [SECURITY.md](./SECURITY.md).

## Installation

```bash
npm install @btc-vision/as-bignum
```

## Supported Types

| Type   | Description              | Status                     |
|--------|--------------------------|----------------------------|
| `u128` | 128-bit unsigned integer | Fully implemented & tested |
| `i128` | 128-bit signed integer   | Fully implemented & tested |
| `u256` | 256-bit unsigned integer | Fully implemented & tested |
| `i256` | 256-bit signed integer   | Basic implementation       |

## Quick Start

```typescript
import { u128, u256 } from "@btc-vision/as-bignum/assembly";

// Create values
let a = u256.from(1000);
let b = u256.from(500);

// Full arithmetic support
let sum = a + b;
let product = a * b;
let quotient = a / b;

// Safe multiply-divide without overflow
let result = u128.muldiv(u128.Max, u128.from(2), u128.from(3));
```

## Usage

### Basic Import

```typescript
import { u128, u256, i128 } from "@btc-vision/as-bignum/assembly";
```

### Creating Instances

```typescript
// From literals
let a = u128.One;
let b = u128.Zero;
let c = u128.Max;

// From numbers
let d = u128.from(42);
let e = u128.fromU64(0x0123456789ABCDEF);
let f = u128.fromI64(-1);

// From strings
let g = u128.fromString("123456789012345678901234567890");
let h = u128.fromString("0x1234567890ABCDEF", 16);

// From bytes
let bytes: u8[] = [/* 16 bytes */];
let i = u128.fromBytesLE(bytes);
let j = u128.fromBytesBE(bytes);

// Constructor (lo, hi)
let k = new u128(0x0123456789ABCDEF, 0xFEDCBA9876543210);
```

### Arithmetic Operations

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

let a = u128.from(100);
let b = u128.from(25);

// Addition
let sum = a + b;  // or u128.add(a, b)

// Subtraction
let diff = a - b;  // or u128.sub(a, b)

// Multiplication
let product = a * b;  // or u128.mul(a, b)

// Division
let quotient = a / b;  // or u128.div(a, b)

// Modulo
let remainder = a % b;  // or u128.rem(a, b)

// Power
let power = a ** 3;  // or u128.pow(a, 3)

// Square root
let sqrt = u128.sqrt(a);
```

### Bitwise Operations

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

let a = u128.from(0xFF00);
let b = u128.from(0x0FF0);

// AND
let and = a & b;

// OR
let or = a | b;

// XOR
let xor = a ^ b;

// NOT
let not = ~a;

// Left shift
let lshift = a << 4;

// Right shift
let rshift = a >> 4;

// Rotate left
let rotl = u128.rotl(a, 4);

// Rotate right
let rotr = u128.rotr(a, 4);
```

### Comparison Operations

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

let a = u128.from(100);
let b = u128.from(50);

// Equality
let eq = a == b;
let ne = a != b;

// Comparison
let lt = a < b;
let le = a <= b;
let gt = a > b;
let ge = a >= b;

// Ordering (-1, 0, 1)
let ord = u128.ord(a, b);

// Zero check
let isZero = a.isZero();
```

### Bit Manipulation

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

let a = u128.from(0b10110100);

// Count leading zeros
let clz = u128.clz(a);

// Count trailing zeros
let ctz = u128.ctz(a);

// Population count (count of 1 bits)
let popcnt = u128.popcnt(a);
```

### Type Conversions

```typescript
import { u128, u256 } from "@btc-vision/as-bignum/assembly";

let a = u128.from(12345);

// To primitive types
let asU64: u64 = a.toU64();
let asI64: i64 = a.toI64();
let asU32: u32 = a.toU32();
let asBool: bool = a.toBool();
let asF64: f64 = a.toF64();

// To string
let decStr = a.toString();      // decimal
let hexStr = a.toString(16);    // hexadecimal

// To bytes
let bytesLE = a.toBytes();           // little-endian
let bytesBE = a.toBytes(true);       // big-endian
let uint8Arr = a.toUint8Array();
let staticArr = a.toStaticBytes();

// To larger types
let asU256 = a.toU256();
let asI128 = a.toI128();

// Generic conversion
let asString = a.as<string>();
```

### u256 Operations

```typescript
import { u256 } from "@btc-vision/as-bignum/assembly";

// Create u256 values
let a = u256.from(1000);
let b = u256.fromU128(someU128Value);
let c = u256.fromString("115792089237316195423570985008687907853269984665640564039457584007913129639935");

// Full arithmetic support
let sum = a + b;
let diff = a - b;
let product = a * b;
let quotient = a / b;  // Division is supported!

// Bitwise operations
let shifted = a << 128;
let masked = a & b;

// Comparisons
if (a > b) {
  // ...
}

// Conversion to u128 (truncates upper 128 bits)
let lower128 = c.toU128();
```

### Multiply-Divide Without Overflow

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

// Calculate (a * b) / c without overflow in the multiplication step
let a = u128.Max;
let b = u128.from(2);
let c = u128.from(3);

// This internally uses u256 to prevent overflow
let result = u128.muldiv(a, b, c);
```

### Immutable Constants

```typescript
import { u128 } from "@btc-vision/as-bignum/assembly";

// Use immutable versions for read-only access (more efficient)
let zero = u128.immutableZero;
let one = u128.immutableOne;
let max = u128.immutableMax;
let min = u128.immutableMin;

// Use regular versions when you need to modify
let mutableZero = u128.Zero;  // creates new instance
```

## API Reference

### u128

#### Static Properties

- `Zero` / `immutableZero` - Zero value (0)
- `One` / `immutableOne` - One value (1)
- `Min` / `immutableMin` - Minimum value (0)
- `Max` / `immutableMax` - Maximum value (2^128 - 1)

#### Factory Methods

- `from<T>(value: T)` - Create from generic type
- `fromU64(value: u64)` - Create from unsigned 64-bit
- `fromI64(value: i64)` - Create from signed 64-bit
- `fromU32(value: u32)` - Create from unsigned 32-bit
- `fromI32(value: i32)` - Create from signed 32-bit
- `fromF64(value: f64)` - Create from 64-bit float
- `fromString(value: string, radix?: i32)` - Parse from string
- `fromBytes<T>(array: T, bigEndian?: bool)` - Create from byte array
- `fromBytesLE(array: u8[])` - Create from little-endian bytes
- `fromBytesBE(array: u8[])` - Create from big-endian bytes
- `fromBits(lo1: u32, lo2: u32, hi1: u32, hi2: u32)` - Create from 32-bit parts

#### Arithmetic

- `add(a, b)` / `+` - Addition
- `sub(a, b)` / `-` - Subtraction
- `mul(a, b)` / `*` - Multiplication
- `div(a, b)` / `/` - Division
- `rem(a, b)` / `%` - Remainder
- `pow(base, exp)` / `**` - Power
- `sqrt(value)` - Square root
- `sqr(value)` - Square
- `div10(value)` - Fast division by 10
- `rem10(value)` - Fast remainder by 10
- `muldiv(a, b, c)` - (a * b) / c without overflow

#### Bitwise

- `or(a, b)` / `|` - Bitwise OR
- `xor(a, b)` / `^` - Bitwise XOR
- `and(a, b)` / `&` - Bitwise AND
- `shl(value, shift)` / `<<` - Left shift
- `shr(value, shift)` / `>>` - Right shift
- `rotl(value, shift)` - Rotate left
- `rotr(value, shift)` - Rotate right

#### Comparison

- `eq(a, b)` / `==` - Equality
- `ne(a, b)` / `!=` - Inequality
- `lt(a, b)` / `<` - Less than
- `gt(a, b)` / `>` - Greater than
- `le(a, b)` / `<=` - Less or equal
- `ge(a, b)` / `>=` - Greater or equal
- `ord(a, b)` - Ordering (-1, 0, 1)

#### Bit Operations

- `clz(value)` - Count leading zeros
- `ctz(value)` - Count trailing zeros
- `popcnt(value)` - Population count

#### Instance Methods

- `isZero()` - Check if zero
- `clone()` - Create a copy
- `toString(radix?: i32)` - Convert to string
- `toU64()` / `toI64()` / `toU32()` / `toI32()` - Convert to primitives
- `toF64()` / `toF32()` - Convert to floats
- `toBool()` - Convert to boolean
- `toBytes(bigEndian?: bool)` - Convert to byte array
- `toUint8Array(bigEndian?: bool)` - Convert to Uint8Array
- `toStaticBytes(bigEndian?: bool)` - Convert to StaticArray
- `toU256()` / `toI128()` - Convert to larger types
- `as<T>()` - Generic conversion

### u256

Similar API to u128 with 256-bit support. Constructor takes four u64 limbs: `(lo1, lo2, hi1, hi2)`.

### i128

Signed 128-bit integer with two's complement representation. Supports all standard signed integer operations.

## Running Tests

```bash
npm test
```

For verbose output:

```bash
npm run test:ci
```

## Building

```bash
# Debug build
npm run build:debug

# Release build (default)
npm run build
```

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

## Reporting Issues

- **Bug Reports**: [Open an issue](https://github.com/btc-vision/as-bignum/issues)
- **Security Vulnerabilities**: See [SECURITY.md](./SECURITY.md) - Do not open public issues for security vulnerabilities

## License

[Apache-2.0](./LICENSE)

## Credits

- Original library by [MaxGraey](https://github.com/MaxGraey/as-bignum)
- Fork maintained by [OPNet](https://github.com/btc-vision)
- Security audit by [Verichains](https://verichains.io)

## Links

- [OPNet Website](https://opnet.org)
- [Documentation](https://docs.opnet.org)
- [GitHub](https://github.com/btc-vision/as-bignum)
- [npm](https://www.npmjs.com/package/@btc-vision/as-bignum)
- [Verichains](https://verichains.io)
