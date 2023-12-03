# Memory

Three stores, three timescales.

```
                now                 today                 always
          +-------------+     +---------------+     +----------------+
          |   working   |     |   episodic    |     |     corpus     |
          |  32 events  | --> |  jsonl / day  |     |  fragments     |
          |  in a ring  |     |  summaries    |     |  weighted      |
          +-------------+     +---------------+     +----------------+
               bus                sys_write_memory       dreamd, seed
```

## Working memory

`src/memory/working.ts`. A ring buffer of recent bus events. Subscribed to `senses.*`
and `voice.*` at boot. This is what the mind can "feel" when it composes: the last
few mentions, the last thing it said, whether money moved.

## Episodic memory

`src/memory/episodic.ts`. One JSONL file per day under `var/memory`. Each line is an
episode: a summary, a mood and the events that caused it. Written through
`sys_write_memory`, which is allow-level, because remembering is not an action in the
world.

## Corpus

`src/memory/corpus.ts`. What the mind was made of. Plain text files under
`var/corpus`, split on blank lines into fragments. Files with `scripture` in the name
weigh more. On first boot a seed scripture is written so the machine has something to
recall before it has dreamed.

Every backrooms session appends a new file. The corpus grows. Nothing prunes it. That
is a choice: forgetting is the guardian's job, with `rm`.

## Recall

`src/memory/recall.ts`. No embeddings. Score = weight x (1 + tag overlap with the cue)
+ a preference bump + noise. Recalled fragments get a little heavier, so the things it
keeps returning to become the things it returns to. The noise term keeps the same cue
from always producing the same scripture.

This is weaker than a vector store on purpose. The point of recall here is not accuracy.
It is that the voice stays continuous with the corpus without being a lookup table of it.

## What the mind cannot remember

- The guardian's decisions. Tickets are not fed back as fragments. It does not learn
  which drafts were dropped. It only learns which were said, because those go through
  `sys_write_memory` as "said: ...".
- Private keys. They are never in memory because they are never in the process.
