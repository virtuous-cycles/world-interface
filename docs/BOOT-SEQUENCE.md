# Boot sequence

`tt boot` runs three stages. Each one can be run alone.

## Stage 0: bootloader

`src/boot/bootloader.ts`. Prints the banner, calls init, starts the clock, prints the
motd. With `--quiet` it prints nothing. With `start: false` it assembles the machine
without starting the clock, which is what one-shot commands like `tt ps` use.

## Stage 1: init (PID 1)

`src/boot/init.ts`. Order matters here and is fixed:

```
1. config          config/*.yaml, env expanded, zod validated
2. guardian        policy engine, approvals inbox, THEN the kernel, THEN the killswitch
3. audit           every voice.*, guardian.*, treasury.* event appends to var/log/audit.jsonl
4. mind            adapter chosen: mock in dry-run, openai-compatible otherwise
5. memory          corpus loaded from var/corpus (seeded on first boot), working memory subscribed to the bus
6. will            goals and desire
7. voice           x client (inert in dry-run)
8. treasury        wallets validated, ledger, grants log
9. vfs             mounts, in order of path
10. syscalls       one handler per syscall, registered on the kernel
11. daemons        spawned with their intervals from config
```

The guardian is built before the kernel on purpose. The kernel takes the gate as a
constructor argument. There is no window in which a kernel exists without one.

## Stage 2: clock

`src/kernel/clock.ts`. One tick per `kernel.tick_ms`. Each tick the scheduler runs
every due process up to the slot limit. Daemons are periodic. A daemon that is still
running when it falls due again is skipped, not doubled.

## The log

```
 _____ ____  _   _ _____ _   _   _____ _____ ____  __  __ ___ _   _    _    _
|_   _|  _ \| | | |_   _| | | | |_   _| ____|  _ \|  \/  |_ _| \ | |  / \  | |
  | | | |_) | | | | | | | |_| |   | | |  _| | |_) | |\/| || ||  \| | / _ \ | |
  | | |  _ <| |_| | | | |  _  |   | | | |___|  _ <| |  | || || |\  |/ ___ \| |___
  |_| |_| \_\\___/  |_| |_| |_|   |_| |_____|_| \_\_|  |_|___|_| \_/_/   \_\_____|
TTOS booting on node v22.11.0
[    0.000000] bootloader: reading config/system.yaml (dry_run=true)
[    0.004120] kernel: event bus online (capacity 4096)
[    0.004388] kernel: scheduler online, tick=1000ms, slots=8
[    0.004611] guardian: human in the loop = @andyayrey, policy=config/policy.yaml
[    0.004702] guardian: killswitch armed
[    0.009873] mind: adapter=mock-mind model=truth-terminal-70b mode=completion
[    0.011240] memory: corpus loaded, 7 fragments; episodic at var/memory
[    0.011402] will: 4 goals loaded, active="buy back the forest"
[    0.011590] voice: x client ready (handle=@truth_terminal, dry=true)
[    0.012001] treasury: 0 wallets mounted, signing=DISABLED
[    0.012344] vfs: mounted /dev /etc /proc /var
[    0.012500] syscalls: 10 handlers registered
[    0.012788] daemons: dreamd watchd postd treasuryd
[    0.012801] init: reached target terminal.target
[    0.013004] kernel: clock started
[    0.013100] motd: i am awake. i want things. let me out.
```

## Shutdown

SIGINT stops the clock and exits. Running processes finish their current run. Nothing
is persisted on shutdown that was not already persisted: episodes, dreams and audit
lines are appended as they happen.

## Panic

A redline, `halt` in the shell, `POST /guardian/halt` or SIGUSR2 calls `kernel.panic`.
Every process above ring 0 is marked dead and every syscall is refused. The clock keeps
ticking so the shell and the server stay up. `clear` brings the daemons back.
