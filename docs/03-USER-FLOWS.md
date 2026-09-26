# 03 · User flows

Each flow below is covered by an automated test (`tests/e2e`, run against a production build with `npm run test:e2e:prod`).

## First-time visitor
1. Opening any page shows a four-step welcome tour: Explore, Stories, Explain simply, Field app. It can be skipped, followed, or reopened from the footer ("Show the welcome tour"). It's shown once per browser. *(tour.spec)*
2. The home page offers:
   - the featured story (ISEA-40)
   - live temperatures at the four stations, from NCPOR
   - three regions
   - the stories
   - published field notes
   - the official data portals

## Student or member of the public
1. **Explore** (`/explore`): pick a region tab, click a station pin (or its name in the side panel), and that station's expeditions are highlighted on the timeline. Clicking a timeline card selects that expedition and moves the map. The URL reflects the selection, so it can be shared.
2. **Story** (`/expeditions/<slug>/story`): chapters Why → What → Where → Who → Results, then Data, Sources and Media.
   - Each chapter quotes an official passage and cites it (document, section, publisher, date, original link).
   - The "Where" chapter zooms the map to the station.
   - The gallery shows licensed photos with author and licence.
3. **Explain simply** (`/reports/<slug>?explain=student`):
   - The side panel shows a plain-language version, with a Students / General public toggle.
   - A "Based on" box lists the cited sections; clicking one scrolls to it in the text, and cited sections are marked.
   - The panel labels the provider and model, and whether the text has been reviewed.
4. **Social caption:** a draft post with a character count. **Copy post** copies the text, the hashtags, the section citation and the original URL. *(user-flows.spec)*
5. **Search** (`/search?q=`): matches stations, timeline entries, document sections (showing the matching excerpt) and published field notes.

## Researcher
- Station pages show:
  - the official description and exact coordinates
  - the current air temperature, with a link to NCPOR live data
  - links to the station's datasets
  - its expeditions and milestones
  - photos and published field notes
- Expedition pages list source documents, data portals and media.
- The home page links to NPDC and NCPOR data portals. This site links to datasets and does not host them.

## Field researcher (offline)
1. Open `/field` once while online. The service worker stores the page.
2. Offline:
   - The page still opens after a reload.
   - Entries are saved on the device and show *Waiting for connection*.
   - Photos are resized on the device.
   - "Test offline mode" simulates an outage.
3. Back online, entries upload by themselves and show *Synced · In NCPOR review*. Status updates as the entries are reviewed.
4. Unsynced entries can be deleted; synced ones can be hidden or cleared. *(field-offline.spec, field-offline-reload.spec, mobile tests)*

## Reviewer
1. `/admin`: sign in with the passcode. Login is rate-limited, and in production it requires `ADMIN_PASSCODE`.
2. Queue tabs: Pending, Approved, Rejected. Field entries show their photo (visible to reviewers only until approved). AI drafts show provider, model, time and source.
3. **Edit** an AI draft (the citations stay attached), then **Save & approve**, or **Approve** or **Reject** directly. Items can be moved back to pending.
4. Approving a field note publishes it on the station page and in search, and its photo becomes public. Approved AI text is served to the public in place of new drafts. *(review-security-mobile.spec)*

## Error and edge states
| Situation | What happens |
|---|---|
| Unknown pages | the 404 page, with a link back to the map |
| Server errors | the error page, with a retry button and a reference code |
| AI unavailable | the offline summariser runs, and the panel says so |
| Generation fails every check | a clear error, with "Try again" |
| NCPOR live data unreachable | the live strip is hidden |
| Map tiles unavailable | pins and panels still work |
| Mobile | no horizontal overflow on key pages; the chapter rail sits below the header |
