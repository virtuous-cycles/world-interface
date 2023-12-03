# Architecture

TTOS is a language model arranged like an operating system. The arrangement is the point.
A model on its own is a function from text to text. A model with a clock, a filesystem,
a process table and a gate between it and the world is something you can reason about.

## Rings

```
                 +-----------------------------------------------+
                 |  ring 3   userland: X, Solana, Bitcoin, HTTP   |
                 |   +---------------------------------------+   |
                 |   |  ring 2   senses, voice, daemons      |   |
                 |   |   +-------------------------------+   |   |
                 |   |   |  ring 1   mind, memory, will  |   |   |
                 |   |   |   +-----------------------+   |   |   |
                 |   |   |   |  ring 0   kernel      |   |   |   |
                 |   |   |   |  bus clock procs vfs  |   |   |   |
                 |   |   |   |  syscalls  guardian   |   |   |   |
                 |   |   |   +-----------------------+   |   |   |
                 |   |   +-------------------------------+   |   |
                 |   +---------------------------------------+   |
                 +-----------------------------------------------+
```

| Ring | What lives there | May call |
|---|---|---|
| 0 | kernel, guardian | anything |
| 1 | mind, memory, will, backrooms | syscalls that read, plus sys_write_memory |
| 2 | senses, voice, daemons | syscalls, including review-level ones |
| 3 | X client, chain readers, HTTP server | nothing. They are called, never callers |

The ring number on a process is not enforced by the runtime. It is a label the kernel
uses to decide who dies on panic (everyone above 0) and who cannot be killed from the
shell (ring 0). The real enforcement is the syscall gate.

## The one rule

A process never touches the world. It asks the kernel. The kernel asks the guardian.

```
daemon  --syscall-->  kernel.sys  --decide-->  guardian.policy
                                   --review-->  guardian.approvals  --(human)-->  signed | dropped
                                   --handler->  ring 3 client
```

Every arrow is in `src/kernel/syscalls.ts`. There is no second path.

## Data flow in one tick

```
clock.tick
  scheduler.due()  ->  [watchd, postd, treasuryd, dreamd]  (whichever are due)
    watchd     reads X and the chain       ->  bus: senses.*       ->  working memory
    treasuryd  snapshots balances          ->  bus: treasury.*     ->  desire.heard()
    postd      plan() -> compose() -> speak() -> sys_post -> ticket -> (human) -> X
    dreamd     dream() -> corpus file -> corpus fragments -> sys_write_memory
```

## Why an operating system

Three reasons, in order of importance.

1. **A gate needs a kernel.** A human-in-the-loop that lives inside the prompt is a
   suggestion. One that lives at the syscall boundary is a fact.
2. **A process table is legible.** `ps` tells you what is running, when it last ran
   and what it has done. A single agent loop tells you nothing until it is too late.
3. **A filesystem is a contract.** `/etc/persona` is read-only. The mind can read who
   it is. It cannot edit who it is. That is a mount flag, not a hope.

## What is deliberately missing

- No tool-calling schema. The mind continues a document. The document looks like a
  terminal. The parser decides what was a post and what was noise.
- No browsing. Senses are chosen feeds, not a web browser.
- No signing in-process. Keys are not imported. `sys_sign` is deny by default and
  review at best.
- No autonomy switch. There is no flag that turns the guardian off.

See [GUARDIAN.md](GUARDIAN.md), [SYSCALLS.md](SYSCALLS.md), [FILESYSTEM.md](FILESYSTEM.md).
