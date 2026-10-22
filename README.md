# CourtSide — My NBA Season

A mobile-friendly NBA tracker PWA for the 2026–27 season. Features:
- Weekly NBA schedule with scores/status and team filtering
- Game details and box-score tables when ESPN provides them
- Mark watched games
- Pick one personal MVP from each team for each watched game
- Personal team viewing leaderboard and player MVP leaderboard
- Local persistence in the browser via `localStorage`
- PWA manifest and service worker for an installable home-screen experience

## Important notes
- The first version uses ESPN's public, unofficial JSON endpoints for schedule and game summaries. ESPN does not provide a stable public API contract for this use; endpoint behavior, availability, CORS, and data shape may change.
- Personal tracking is stored on the current browser/device. Clearing Safari website data removes it. There is no account or cross-device sync yet.
- Player selections are counted only when the game is marked watched.
- The app starts at October 20, 2026, the 2026–27 season opening date configured in the app. Use “Load more dates” to advance week by week.
- Schedule fetch requires an internet connection. The app shell may load offline after first visit, but live scores/box scores cannot update offline.

## Run locally
For a quick local test, from this folder run:
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` on the same computer. PWA installation requires HTTPS (or localhost).

## Put it on your iPhone
A PWA must be hosted on an HTTPS URL. Easiest routes:
1. Create a free GitHub repository and upload these files, then enable GitHub Pages in Settings → Pages (deploy from the main branch/root).
2. Or deploy the folder to Netlify / Vercel as a static site.

Then on iPhone:
1. Open the HTTPS website in Safari (not an in-app browser).
2. Tap Share.
3. Choose Add to Home Screen.
4. Enable “Open as Web App” if shown, then tap Add.

## Next improvements
- Move from unofficial ESPN endpoints to a stable licensed NBA data provider if reliability matters.
- Add accounts/cloud sync and data export.
- Add season/team/player search, playoff support, notes export, and reminders.
- Consider privacy-safe backups so personal picks survive device changes.
