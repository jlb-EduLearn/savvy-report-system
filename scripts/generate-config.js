const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const content = `/** Generated at build — do not edit */
const CLOUD_CONFIG = {
  supabaseUrl: '${url.replace(/'/g, "\\'")}',
  supabaseAnonKey: '${key.replace(/'/g, "\\'")}',
};
`;

const out = path.join(__dirname, '..', 'js', 'cloud-config.js');
fs.writeFileSync(out, content);
console.log(url ? 'Cloud config generated (Supabase enabled)' : 'Cloud config generated (local-only mode)');
