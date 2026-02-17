<pre>
OIP: OIP-0001
Title: Deferred‑Execution Queue on high congestion
Author: BlobMaster41
Status: Draft
Type: Standards Track – Consensus Layer
Created: 2025‑06‑14
License: BSD‑3‑Clause
Requires: 
Replaces: 
</pre>

## Abstract

Under load, a transaction can be mined into Bitcoin even though its `baseGas` was underestimated.  
Current behaviour is to revert that transaction, wasting block space, slowing node execution, and confusing users.

This proposal introduces:

* a **one‑per‑block FIFO queue** (the *spill queue*) for such "temporarily under‑funded" transactions;
* a **header commitment** so that the queue is consensus‑critical;
* a **six‑block deferral limit** after which the transaction finally reverts.
* a **maximum transaction gas limit** to prevent griefing, this maximum is determined by the amount of tx of the
  previous 3 blocks and their total gas used. (only used in the spill queue). If a transaction exceeds this limit, it is
  instantly reverted and not included in the spill queue.

The change is fully contained within OP_NET's execution layer and **does not modify Bitcoin consensus**.

## Motivation

On mainnet a Bitcoin block already carries about 4-7 tx/s. Testnet stress tests show that adding 5‑10 OP_NET tx/s
pushes the dynamic `baseGas` above many users' signed values, causing mass reverts and 30s block‑processing times (see
testnet block 4506831). Because miners only rank by sat/vB - they cannot see `baseGas` hidden in the
Taproot witness - the classical Ethereum rule "under‑priced tx stays in mempool" does not apply.

Deferred execution solves the problem with **O(1) bookkeeping** and zero impact on miner incentives.

## Summary

Move OP_NET transactions that exhaust their prepaid gas **into an ordered
deferred‑execution queue** instead of reverting them inside the same Bitcoin
block. Each deferred transaction is executed automatically at the front of the
next OP_NET block, up to a bounded number of deferrals.

## Specification

### New consensus fields

| Name              | Size | Description                                                                  |
|-------------------|------|------------------------------------------------------------------------------|
| `deferMerkleRoot` | 32 B | Merkle root of the *txids* remaining in the spill queue after this block.    |
| `spillCount`      | u64  | Number of tx moved from exec‑list -> defer‑list while processing this block. |

Both fields are appended to the existing OP_NET extended header; they are **commitments** and therefore included in the
block hash used by light‑clients.

### Execution algorithm

```python
exec_list   = txs_in_bitcoin_block_order
defer_list  = []

for tx in exec_list:
    if effectiveGasPrice(tx) < currentBaseGas():
        move_pointer(tx, exec_list, defer_list)      # O(1)
        spill_count += 1
        if spill_count > MAX_SPILL:                  # default = 500
            revert_permanently(tx)
    else:
        execute(tx)
        apply_state_changes(tx)

next_block.exec_list = defer_list + bitcoin_txs_sorted_by_priority
````

Each transaction is executed **at most once**, so overall complexity remains `O(N)` per Bitcoin block.

### Mempool

```txt
opnet_estimateFees(target_blocks: uint16) -> {
    baseGas: uint64,   # predicted baseGas when tx will execute
    tip:     uint64,   # suggested priority fee
    eta_blk: uint32    # expected execution height
}
```

Nodes compute predictions with the EWMA‑based formula already used.

## Rationale

* **Minimally invasive:** Only OP_NET execution code changes; no Bitcoin soft fork, no Taproot annex extensions.
* **Deterministic:** The `defer_merkle_root` makes re‑execution by other nodes identical.
* **Bounded griefing:** `MAX_SPILL` limits worst‑case state size and CPU usage.
* **UX clarity:** Explorers display `mined_in = 830123 / executed_in = 830126`.

## Backwards Compatibility

Un‑upgraded nodes will derive a different state root once a deafer occurs and fork off the canonical chain.
Mainnet activation therefore follows the standard *flag‑day* upgrade procedure.

## Security Considerations

* **DoS:** Spill queue is capped; each tx still pays sat/vB therefore the attacker's cost grows linearly with load.
* **Re‑ordering:** FIFO queue preserves relative order.
