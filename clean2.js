const fs = require('fs');
let c = fs.readFileSync('public/index.html', 'utf8');
// Remove empty bva-icon spans
c = c.replace(/<span class="bva-icon">—<\/span> ?/g, '');
c = c.replace(/<span class="bva-icon"><\/span> ?/g, '');
// Remove empty integ-icon divs
c = c.replace(/<div class="integ-icon">—<\/div>/g, '<div class="integ-icon"></div>');
fs.writeFileSync('public/index.html', c);
console.log('done');
