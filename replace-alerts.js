const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/Communities.jsx',
  'frontend/src/pages/CreatePost.jsx',
  'frontend/src/pages/CreateCommunity.jsx',
  'frontend/src/pages/PostDetail.jsx',
  'frontend/src/pages/CreateBloodRequest.jsx',
  'frontend/src/pages/HealthMoments.jsx',
  'frontend/src/pages/Feed.jsx',
  'frontend/src/pages/CommunityDetail.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('alert(')) {
    if (!content.includes("import toast from 'react-hot-toast'")) {
      content = "import toast from 'react-hot-toast';\n" + content;
    }
    
    // Replace specific alert patterns
    content = content.replace(/alert\(res\.data\.message\)/g, "toast.success(res.data.message)");
    content = content.replace(/alert\('Your request to join has been sent!'\)/g, "toast.success('Your request to join has been sent!')");
    content = content.replace(/alert\(err\.response\?\.data\?\.error \|\| (.*?)\)/g, "toast.error(err.response?.data?.error || $1)");
    content = content.replace(/alert\('(.*?)'\)/g, (match, msg) => {
      if (msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('error')) {
        return `toast.error('${msg}')`;
      } else {
        return `toast.success('${msg}')`;
      }
    });
    
    // Catch remaining standard alerts if any
    content = content.replace(/alert\(/g, "toast(");
    
    fs.writeFileSync(file, content);
    console.log('Processed', file);
  }
});
