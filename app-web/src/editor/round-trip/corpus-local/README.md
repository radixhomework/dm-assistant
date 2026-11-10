# corpus-local — your real content, never committed

Drop personal lore documents (`.md`) here and run the round-trip harness on
them. Everything in this folder except this README is gitignored: no lore ever
enters the repository.

```sh
# Run the local folder (default target when present)
npm run round-trip -w app-web

# Run an arbitrary personal document or folder
ROUND_TRIP_PATH=/path/to/notes.md npm run round-trip -w app-web
```

Documents are subject to the same empty-diff acceptance bar as the committed
corpus: one parse → serialize round trip must reproduce the document
byte-for-byte (LF line endings, single trailing newline). A failure reports
the diff per document.
