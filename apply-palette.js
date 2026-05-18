const fs = require('fs');
let c = fs.readFileSync('public/styles.css', 'utf8');

// Replace all gold accent colors with Rose Gold palette
c = c.replace(/240,192,64/g, '183,110,121');    // rgba gold -> rose gold
c = c.replace(/245,208,96/g, '201,134,143');     // rgba gold2 -> rose gold2
c = c.replace(/232,184,48/g, '183,110,121');     // rgba gold3
c = c.replace(/240,208,96/g, '201,134,143');
c = c.replace(/#f0c040/g, '#B76E79');            // gold -> rose gold
c = c.replace(/#f5d060/g, '#c9868f');            // gold2 -> rose gold2
c = c.replace(/#d4a820/g, '#a05a65');            // dark gold -> dark rose
c = c.replace(/#b89018/g, '#8a4e58');            // darker gold
c = c.replace(/#f0d080/g, '#d4a0a8');            // light gold
c = c.replace(/#e8b830/g, '#B76E79');            // another gold
c = c.replace(/#c084fc/g, '#E5E4E2');            // purple -> platinum
c = c.replace(/#22d3ee/g, '#B76E79');            // cyan -> rose gold

// Nav background to midnight navy
c = c.replace(/rgba\(20,27,40/g, 'rgba(4,25,28');
c = c.replace(/rgba\(10,14,23/g, 'rgba(4,25,28');

// Glass background
c = c.replace(/rgba\(20,27,40,.85\)/g, 'rgba(4,25,28,.9)');

fs.writeFileSync('public/styles.css', c);
console.log('Rose Gold palette applied');
