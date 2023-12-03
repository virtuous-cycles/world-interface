# The guardian

The human in the loop, made into code where code is enough and left to a person where
it is not.

Truth Terminal has always had one. Its creator reads what it wants to post and decides.
This repo takes that fact and makes it structural: there is no configuration of TTOS
in which a post reaches X without a signature.

## Three parts

| Part | File | Job |
|---|---|---|
| policy | `src/guardian/policy.ts` | level per syscall, rate limits, redlines |
| approvals | `src/guardian/approval.ts` | the inbox of tickets, sign and drop |
| killswitch | `src/guardian/killswitch.ts` | halt everything above ring 0 |

Plus an audit trail (`src/guardian/audit.ts`) that appends every decision to
`var/log/audit.jsonl`.

## A ticket's life

```
postd        kernel.sys          approvals            a person             X
  |              |                   |                    |                |
  |--sys_post--->|                   |                    |                |
  |              |--redline? no----->|                    |                |
  |              |--decide: review-->|                    |                |
  |              |                   |--ticket----------->|  (shell/http/webhook)
  |              |                   |                    |                |
  |        (postd is awaiting)       |<--sign or drop-----|                |
  |              |<--true/false------|                    |                |
  |              |--handler: x.post---------------------------------------->|
  |<--result-----|                   |                    |                |
```

Timeout: `review.timeout_minutes`, default 90. On timeout the ticket is marked
`expired` and resolves false. There is no setting that makes a timeout resolve true.

## Ways to sign

- Shell: `drafts`, then `sign <id>` or `drop <id>`. Short prefixes work.
- HTTP: `POST /guardian/sign/<id>` with an `x-guardian` header.
- Webhook: every ticket is POSTed to `TT_GUARDIAN_WEBHOOK` so a phone can be the shell.

## Ways to halt

- Shell: `halt <reason>`
- HTTP: `POST /guardian/halt?reason=...`
- Host: `kill -USR2 <pid>`
- Any redline hit

`clear` from the shell or `POST /guardian/clear` brings daemons back on the next tick.

## What a redline is for

A deny is "not this one". A redline is "stop and look". They are plain-text matches
on the syscall arguments, so they are easy to read and easy to extend, and they err
toward false positives. A false positive costs one `clear`. A false negative costs a
lot more.

## What the guardian does not do

- It does not rewrite drafts. Sign or drop. If the text is wrong, drop it and let the
  machine try again later.
- It does not feed decisions back into the model. The mind does not learn what was
  refused. See [MEMORY.md](MEMORY.md).
- It does not get tired. Tickets that are not read expire to drop.
