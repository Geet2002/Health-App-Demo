const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(/io\.emit\('new_notification',\s*(userId)\);/g, "io.to('user_' + $1).emit('new_notification', $1);");
content = content.replace(/io\.emit\('community_member_updated',\s*(id)\);/g, "io.to('community_' + $1).emit('community_member_updated', $1);");
content = content.replace(/io\.emit\('community_event_updated',\s*(id)\);/g, "io.to('community_' + $1).emit('community_event_updated', $1);");
content = content.replace(/io\.emit\('community_event_updated',\s*(communityId)\);/g, "io.to('community_' + $1).emit('community_event_updated', $1);");
content = content.replace(/io\.emit\('community_resource_updated',\s*(id)\);/g, "io.to('community_' + $1).emit('community_resource_updated', $1);");
content = content.replace(/io\.emit\('community_feed_updated',\s*(posts\[0\]\.community_id)\);/g, "io.to('community_' + $1).emit('community_feed_updated', $1);");

content = content.replace(/io\.emit\('community_event_updated',\s*\{\s*communityId:\s*(id),\s*action:\s*'add',\s*triggerUserId:\s*req\.user\.id\s*\}\);/g, "io.to('community_' + $1).emit('community_event_updated', { communityId: $1, action: 'add', triggerUserId: req.user.id });");
content = content.replace(/io\.emit\('community_resource_updated',\s*\{\s*communityId:\s*(id),\s*action:\s*'add',\s*triggerUserId:\s*req\.user\.id\s*\}\);/g, "io.to('community_' + $1).emit('community_resource_updated', { communityId: $1, action: 'add', triggerUserId: req.user.id });");
content = content.replace(/io\.emit\('community_feed_updated',\s*\{\s*communityId:\s*(finalCommunityId),\s*action:\s*'add',\s*triggerUserId:\s*req\.user\.id\s*\}\);/g, "io.to('community_' + $1).emit('community_feed_updated', { communityId: $1, action: 'add', triggerUserId: req.user.id });");

fs.writeFileSync('server.js', content);
console.log('Replacements done!');
