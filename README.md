# Daily Frog

A client-side playful helper to keep the time in a daily scrum.
It's alive at https://smurf667.github.io/daily-frog/

Plain static files: no build step, no dependencies, no network requests except for initial loading.

This was inspired by the unsurpassed [Daily Toast](https://dailytoast.io/).

## How it works

- Set the time limit per round with the +/- buttons (30s steps, default 2:30). The last selected limit is saved in local storage and restored when the app is reopened. It is locked after the first round starts and can be changed again in a new session.
- **Start/Stop** runs or pauses the timer; pausing stops new bubbles, lets existing bubbles finish, and fades out the bubble sound.
- **Next** records the current round and immediately starts the next one.
- Sound is disabled by default and can be enabled with the speaker button. Bubbles start playing at 10% when visual bubbles appear and grow louder until the time limit; the frog cries when it flips and makes a sound when it blinks. Browsers require a user gesture before playing audio.
- Visual bubbles begin after 25s and increase until the limit, then stay at the maximum rate.
- The running status message changes to a random message every 20s with a brief fade.
- At the limit the frog turns red, flips feet-up, gets X eyes, and a warning message appears; long warning text shrinks to fit the available width.
- **Finish** ends the session and shows the summary. Rounds with 0:00 elapsed are not counted.
- The frog is an original SVG drawing (no external assets).

## Attribution

The initial application and SVG were created using [Claude](https://claude.ai).

Sounds:
- The bubble sound is based on https://freesound.org/people/busabx/sounds/736969/
- The cry sounds is based on https://freesound.org/people/d.n.audio.uk/sounds/414898/
- The blink sounds is based on https://freesound.org/people/Tagiri/sounds/390686/
