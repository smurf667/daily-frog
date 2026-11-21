# Daily Frog

A client-side playful helper to keep the time in a daily scrum.

Plain static files: no build step, no dependencies, no network requests except for initial loading.

This was inspired by the unsurpassed [Daily Toast](https://dailytoast.io/).

## How it works

- Set the time limit per round with the +/- buttons (30s steps, default 2:30). It is locked once a session starts.
- **Start/Stop** runs the timer.
- Bubbles begin after 30 s and increase until the limit, then stay at the maximum rate.
- At the limit the frog turns red, flips feet-up, gets X eyes, and a warning message appears.
- **Next** begins the next round.
- **Finish** ends the session and shows the summary. Rounds with 0:00 elapsed are not counted.
- The frog is an original SVG drawing (no external assets).

## Attribution

The initial application and SVG were created using [Claude](https://claude.ai).

Bubble sound is based on https://freesound.org/people/busabx/sounds/736969/

The cry sounds is based on https://freesound.org/people/d.n.audio.uk/sounds/414898/
