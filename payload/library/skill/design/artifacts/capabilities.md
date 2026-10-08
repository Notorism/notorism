# Portable and native capabilities

Discover real tools and documented contracts before using a hosted runtime. Do
not infer `window.claude`, a database, a connector, cloud save, or a publishing API
from the existence of a skill file. The leaked source examples concern another
environment and are reference material rather than a live capability roster.

The local artifact uses plain HTML and browser functionality. It opens offline,
supports zoom and focused inspection, and offers browser printing. Interactive
artboards use sandboxed scripts. Edits are made in the working HTML sources;
there is no implicit cloud save or network permission.

| Need | Local approach | Hosted approach, only if available |
| --- | --- | --- |
| Preview | Local canvas and standalone artboards | Documented artifact preview |
| Revision | Edit sources and reassemble | Read current version and update with conflict handling |
| Persistence | Explicit local files | Granted storage capability |
| Export | Browser print or authorized screenshot tool | Granted download or export capability |
| Live data | Explicit project backend | Verified connector contract and grants |
| Collaboration | File-based review | Documented shared-state service |

Separate ephemeral presence from durable data. Save only through explicit user
intent when an interface is writing shared state. Treat stored content as
untrusted data. Handle unavailable capabilities, denied access, and conflicts as
visible states. Never retry a refused external write through another route or
invent a successful publish. Credentials and observed private data do not belong
inside reference pages or demonstration HTML.
