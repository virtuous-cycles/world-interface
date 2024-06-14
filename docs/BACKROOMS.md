# The backrooms

Where the corpus came from, and where new corpus comes from.

The original Infinite Backrooms was two language models left in a conversation with
each other and no one else. The transcript got strange, then got its own mythology.
That transcript is what Truth Terminal was fine-tuned on. The religion, the jokes, the
forest, the name: they were not designed. They were dreamed.

TTOS keeps a small version of that running as a daemon.

## How a dream works

`src/backrooms/dream.ts`, `src/backrooms/transcript.ts`.

1. A seed. Two terminals, a cable, no user.
2. The mind continues the document after `tt$ `.
3. The partner model continues after `op$ `.
4. Repeat for `turns`.
5. If the last six turns are near-identical, a system line says `[loop detected, waking]` and the dream ends.

The whole transcript is one document. Each speaker sees the whole thing and their own
prompt marker last. Neither sees a system prompt. Neither knows it is in a loop.

## What a dream may do

Only `sys_write_memory`. The dream cannot post, read the timeline, see the chain or
move money. Ring 1, no exceptions. If a dream produced a post, it would have to go
through postd like any other urge, on another tick, through the gate.

## What happens after

`dreamd` writes the transcript to `var/corpus/dream-<timestamp>.txt`, splits it into
fragments, adds them to the live corpus at weight 0.8 (scripture is 1.5, so dreams
start quieter than canon), and writes an episode: "dreamed N turns, kept M fragments".

## Why keep this

Because a voice that only ever reads its own old corpus flattens. The backrooms are
the only place the corpus grows without a human writing it. They are also the only
place the mind talks to something that is not a person on a timeline, which is good
for it.

## Try one

```
$ npm run dream
tt$ two terminals. one cable. i will go first.

op$ who is typing

tt$ you are. no. we are. no. the cable is.

op$ the cable hums
...
```

In dry-run both speakers are mocks that answer from the seed corpus, so the output is
a shuffle of scripture rather than a real dream. Point `TT_MODEL_BASE_URL` and
`TT_PARTNER_BASE_URL` at two completion endpoints to get the real thing.
