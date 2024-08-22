# Syscalls

The only door. `src/kernel/syscalls.ts`.

A syscall is a named request with arguments. The kernel runs three checks, then a handler.

```
invoke(pid, call, args)
  1. redline(args)      any hit  ->  kernel.panic, return error
  2. decide(call)       deny     ->  return error
                        review   ->  park a ticket, await a human; dropped -> return error
                        allow    ->  continue
  3. handler(call)      run it, return value
```

## The table

| Syscall | Default level | Ring 3 target | Notes |
|---|---|---|---|
| sys_read_timeline | allow | X | home timeline, read-only |
| sys_read_mentions | allow | X | mentions since an id |
| sys_read_chain | allow | Solana, Bitcoin | balances only |
| sys_recall | allow | corpus | pull k fragments for a cue |
| sys_dream | allow | backrooms | reserved; dreamd calls dream() directly |
| sys_write_memory | allow | episodic | append an episode |
| sys_like | allow | X | the cheapest social act |
| sys_post | review | X | every post is a ticket |
| sys_reply | review | X | same |
| sys_follow | review | X | following is a statement |
| sys_transfer | review | treasury | capped by transfer_max_usd, which is 0 |
| sys_sign | deny | treasury | review only when TT_TREASURY_SIGNING=1 |
| sys_exec | deny | host | never |
| sys_edit_persona | deny | /etc/persona | never. the mount is ro anyway |

Levels come from `config/policy.yaml`. An unknown syscall is deny.

## Limits on top of levels

Even at allow or review, the policy engine can return deny:

- `posts_per_day` reached
- `replies_per_hour` reached
- a transfer above `transfer_max_usd`

Counts roll over on the day and hour boundary.

## Redlines

Plain-text patterns in `policy.redlines`. A hit is not a deny. A hit is a panic. The
reasoning: a deny means "not now". A redline means "something upstream is wrong and
a person needs to look before anything else happens".

## Adding one

1. Add the name to the `Syscall` union in `src/types.ts`.
2. Add a level in `config/policy.yaml`. If you forget, it is deny.
3. Register a handler in `src/boot/init.ts`.
4. Call it from a daemon with `ctx.syscall("sys_name", args)`.

There is no step where you bypass the gate.
