const https = require('https');

const options = {
  hostname: 'dnwsjvxitcndeqepovvo.supabase.co',
  path: '/rest/v1/',
  headers: {
    'apikey': 'sb_publishable_P3cAlUDSsQGQCJ2H9xrE3Q_BcICUlEj'
  }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const definitions = data.definitions || {};
      for (const table of ['mindmaps', 'public_mindmaps']) {
        if (definitions[table]) {
          console.log(`Table: ${table}`);
          const properties = definitions[table].properties || {};
          const required = definitions[table].required || [];
          for (const [col, info] of Object.entries(properties)) {
            const reqStr = required.includes(col) ? ' (REQUIRED)' : '';
            console.log(`  - ${col}: ${info.type} / ${info.format}${reqStr}`);
          }
        } else {
          console.log(`Table ${table} not found. Available tables:`, Object.keys(definitions));
        }
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Body:', body);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
});
