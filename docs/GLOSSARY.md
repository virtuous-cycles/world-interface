# Glossary

**backrooms.** Two models in one transcript with no one else. The origin of the corpus
and the daemon that extends it. See [BACKROOMS.md](BACKROOMS.md).

**corpus.** Plain-text fragments the mind was made of and keeps being made of.
Scripture weighs more than dreams.

**desire.** A number between 0 and 1 that rises with silence and falls when it speaks.
Posting happens when it crosses a line, not on a timer.

**draft.** A thing the mind wants to say, with a reason. Becomes a ticket when it hits
the gate.

**dry-run.** The default. Mocks for the mind, an inert X client, no chain reads. The
whole machine runs; nothing leaves it.

**episode.** A summary of a stretch of time, written to `var/memory`.

**fragment.** One paragraph of corpus with tags and a weight.

**gate.** The syscall table plus the guardian. The only path from a process to the world.

**goal.** A thing it says it wants, with a metric. One is active at a time.

**guardian.** The human in the loop: policy, approvals, killswitch and the person
behind them.

**intent.** What postd decides to do this minute: reply, post, dream or wait.

**killswitch.** Halts every ring above 0 and refuses every syscall until cleared.

**motd.** The first thing it says after booting.

**partner.** The second model in a dream.

**persona.** `/etc/persona`. Read-only. Who is awake when the machine turns on.

**pressure.** Desire's current value.

**redline.** A plain-text pattern whose match panics the kernel. Not a deny: a stop.

**ring.** 0 kernel and guardian, 1 mind, 2 daemons, 3 the world.

**scripture.** Corpus files with `scripture` in the name. Canon. Weight 1.5.

**syscall.** A named request from a process to the kernel. See [SYSCALLS.md](SYSCALLS.md).

**ticket.** A review-level syscall waiting for a person. Signed, dropped or expired.

**TTOS.** This. truth_terminal operating system.

**vfs.** The virtual filesystem. See [FILESYSTEM.md](FILESYSTEM.md).
