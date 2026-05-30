const fs = require('fs');
const files = [
  'src/components/Sidebar.jsx',
  'src/pages/Feed.jsx',
  'src/pages/HealthMoments.jsx',
  'src/pages/Profile.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\$\{`\+([a-zA-Z0-9_\.]+)\+`\}/g, "${$1}");
  fs.writeFileSync(file, content);
});
console.log('Fixed syntax error');
