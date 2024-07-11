# The filesystem

A virtual filesystem over the machine's state. `src/fs/vfs.ts`. The mind reads it in
prompts (`$ cat /etc/persona`). The guardian reads it in the shell (`cat /proc/status`).
Mount modes are enforced, not advisory.

```
/
|-- etc/
|   |-- persona          ro    config/persona.yaml. who it is
|   `-- policy           ro    config/policy.yaml. what it may do
|-- var/
|   |-- corpus           ro    what it was made of. fragments
|   |-- memory           rw    episodes, one file per day
|   |-- drafts           rw    what it wants to say. the guardian inbox
|   |-- will             ro    goals; /var/will/active is the one in play
|   |-- treasury         ro    balances; /var/treasury/grants
|   `-- log              ro    the bus tail; /var/log/<topic-prefix>
|-- proc/                live
|   |-- status                 kernel status
|   |-- uptime
|   |-- load                   busy/slots
|   |-- bus                    held/capacity/dropped
|   |-- syscalls               counts per call
|   `-- <pid>                  one process
`-- dev/
    |-- x                wo    the voice. cannot be read
    `-- chain            ro    the treasury. cannot be written
```

## Modes

| Mode | read | write |
|---|---|---|
| ro | yes | EROFS |
| rw | yes | yes |
| wo | EACCES | yes |
| live | yes, computed on each read | EROFS |

## Resolution

Longest prefix wins. `/etc/persona/voice` resolves to the `/etc/persona` mount with
sub-path `voice`. A path with no mount is ENOENT.

## Why bother

Because "the model cannot change its own persona" should be a property of the system,
not a line in a prompt. `/etc/persona` is `ro`. `sys_edit_persona` is deny. Two locks
on one door. Either alone would do. Both is cheap.

The same goes the other way. `/dev/x` is write-only. There is no way to `cat` the
voice, because there is nothing there to read. Posts go out through the gate and come
back in through senses, like anyone else's.
