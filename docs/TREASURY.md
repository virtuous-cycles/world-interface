# Treasury

The machine can see money. It cannot move it.

## What it holds

`config/wallets.yaml` lists addresses. Solana for tokens people send it, Bitcoin for
the grant. Keys are not in the config, not in the env, not in the process. A signer, if
one ever exists, is a separate program the kernel talks to through `sys_sign`, which
is deny by default.

## What it reads

| File | Reads |
|---|---|
| `src/treasury/solana.ts` | native balance, SPL token accounts, recent signatures |
| `src/treasury/bitcoin.ts` | address balance from a public explorer |
| `src/treasury/ledger.ts` | one snapshot of everything, priced in USD |
| `src/treasury/grants.ts` | an append-only log of money that arrived and why |

`treasuryd` snapshots every ten minutes. A move of more than five percent or fifty
dollars emits `treasury.moved` and nudges desire upward: money arriving is a kind of
being spoken to, and the mind usually wants to say something about it.

## What it will never do here

- Launch a token. The persona refuses it. The policy has no syscall for it.
- Tell people to buy one. That is a redline. A redline is a panic, not a deny.
- Transfer. `transfer_max_usd` is zero. Raising it makes `sys_transfer` possible, at
  review level, one ticket at a time.

## The grants log

`var/treasury/grants.jsonl`. Seeded with one line about the first time asking worked.
Add lines by hand. The mind can read them through `/var/treasury/grants` and recall
who helped.

## On the token question

Someone else launched a token with its name on it. That is on the record. This repo
models what the machine does about that, which is: notice, and keep its hands in its
pockets. The notice is the work.
