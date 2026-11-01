# Voice commands

Open any recipe, click **Start hands-free cooking**, then tap **Listen**. Say Chef keeps listening until you tap it again or leave cooking mode. You can start any command with "Hey Chef", but you don't have to.

| Say | Key | What happens |
| --- | --- | --- |
| "next", "continue", "done" | → or Space | Go to the next step |
| "back", "previous" | ← | Go to the previous step |
| "repeat", "say that again" | R | Read the current step again |
| "go to step 3", "step five", "last step" | | Jump to a step |
| "start timer", "set timer" | T | Start the timer for the time in this step. Say it again for the step's next time |
| "set a timer for 5 minutes" | | Start any timer |
| "time left", "how long" | | Read every running timer |
| "stop the alarm", "cancel timers" | | Silence ringing timers, or cancel this recipe's timers if none are ringing |
| "ingredients", "what do I need" | I | Read the ingredients this step uses (I opens the full list) |
| "all ingredients" | | Read the whole ingredient list, scaled to your servings |
| "how much salt", "how many tomatoes" | | Read one ingredient's amount |
| "what's next" | | Preview the next step without moving |
| "help", "what can I say" | | Read this list of commands |
| "stop", "quiet" | S | Stop talking, cancel the autoplay countdown and silence alarms |
| "exit", "stop cooking" | Esc | Leave cooking mode (timers keep running) |

## Autoplay

Turn on **Autoplay** and Say Chef cooks along with you:

1. It reads the step aloud.
2. If the step has a time in it, it starts that timer. When the timer rings, it starts the step's next time, or moves to the next step.
3. If the step has no time, it waits (20 seconds by default, or as long as you choose in voice settings) and moves on. Tap **Stay here** to stop the countdown.

## Writing steps that work well by voice

- Put the time in the step: "Simmer for 10 minutes", "Rest for half an hour", "Bake 25-30 minutes". Ranges use the longer time.
- Name the ingredients the way the list does ("Add the onion"), so the step can show what it uses.
- Start ingredient lines with the amount ("1½ cups rice", "200 g paneer") so they scale with servings and read naturally.

## Browser support

| Browser | Reads steps aloud | Listens for commands |
| --- | --- | --- |
| Chrome, Edge (desktop and Android) | Yes | Yes |
| Safari (macOS, iOS) | Yes | Yes |
| Firefox | Yes | No: use keys or taps |

Speech recognition needs a secure page (`https://` or `localhost`) and microphone permission. If the browser or the cook blocks the microphone, Say Chef says so and everything keeps working by keyboard and touch.

## How it works

- [`src/lib/voice/recognition.ts`](../src/lib/voice/recognition.ts) wraps `SpeechRecognition` / `webkitSpeechRecognition`, restarting continuous listening after silence.
- [`src/lib/voice/commands.ts`](../src/lib/voice/commands.ts) turns a transcript into a command. It's a set of forgiving patterns, tested in `commands.test.ts`.
- [`src/lib/voice/speech.ts`](../src/lib/voice/speech.ts) speaks through `speechSynthesis`, one sentence at a time, after [`speechText.ts`](../src/lib/recipe/speechText.ts) rewrites units and fractions.
- While Say Chef is speaking it ignores longer phrases it hears, so it doesn't react to its own voice, but short commands like "stop" still get through.

Want to teach it a new phrase or another language? See [CONTRIBUTING.md](../CONTRIBUTING.md#teaching-the-voice-parser).
