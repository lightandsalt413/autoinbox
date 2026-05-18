const fs = require('fs');
const f = 'public/index.html';
let c = fs.readFileSync(f, 'utf8');

// Remove all emoji characters (covers most emoji ranges)
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+/gu;

c = c.replace(emojiRegex, '');

// Clean up leftover spaces and dashes
c = c.replace(/— —/g, '—');
c = c.replace(/  +/g, ' ');
c = c.replace(/> </g, '><');
c = c.replace(/>  /g, '> ');

fs.writeFileSync(f, c, 'utf8');
console.log('Done - all emojis removed');
