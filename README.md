# slatestats.com — build output

Generated. **Do not edit by hand** — every file here is overwritten on each
deploy and the history is force-pushed.

Built from a private research repository by:

    uv run python -m web.build    # emit data artifacts, verify them
    uv run python -m web.render   # render pages, check every internal link

Both steps verify their own output and exit non-zero on failure, so a broken
build cannot reach this repo.

    public/                 the site as served
      index.html            home
      nfl/players/<slug>/   player stats and usage
      nfl/injury-impact/<slug>/   who absorbs the work if he sits
      nfl/studies/<slug>/   one measured question per page
      data/*.json           the same data the mobile app reads
      sitemap.xml           derived from what is on disk, never hand-written
