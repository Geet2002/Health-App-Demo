const fs = require('fs');
const files = [
  'src/components/Sidebar.jsx',
  'src/pages/Feed.jsx',
  'src/pages/HealthMoments.jsx',
  'src/pages/Profile.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\$\{API_URL\.replace\('\/api', ''\)\}\$\{([a-zA-Z0-9_\.]+)\}/g, "${API_URL.replace('/api', '')}${`+$1+`}?token=${localStorage.getItem('token')}");
  content = content.replace(/`http:\/\/localhost:5001\$\{([a-zA-Z0-9_\.]+)\}`/g, "`${API_URL.replace('/api', '')}${`+$1+`}?token=${localStorage.getItem('token')}`");
  fs.writeFileSync(file, content);
});
console.log('Fixed profile picture URLs');
