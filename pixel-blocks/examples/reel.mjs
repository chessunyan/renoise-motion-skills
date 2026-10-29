// The two 16:9 showcases back to back (16 s), hard cut on the downbeat between them.
// Showcase 2's music window starts exactly where showcase 1's ends, so the track runs on.

import launchIntro from './launch-intro.mjs';
import dataStory from './data-story.mjs';

const parts = [launchIntro, dataStory];
const starts = parts.reduce((list, part, i) => [...list, i === 0 ? 0 : list[i - 1] + parts[i - 1].duration], []);

export default {
  width: 320,
  height: 180,
  duration: parts.reduce((sum, part) => sum + part.duration, 0),
  draw(frame, t) {
    const index = starts.findLastIndex((start) => t >= start);
    parts[index].draw(frame, t - starts[index]);
  },
  cues: () => parts.flatMap((part, i) => part.cues().map((cue) => ({ ...cue, t: cue.t + starts[i] }))),
  music: launchIntro.music,
};
