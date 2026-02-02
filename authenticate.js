const fs=require('fs');
const path=require('path');
const http=require('http');
const https=require('https');
const url=require('url');
const { exec } = require('child_process');

const {google}=require('googleapis');
//client secret file can be downloaded from Google Cloud Console (https://console.cloud.google.com/apis/credentials)
const KeyPath=path.join(__dirname,'client_secret_474559652281-g1vft502se5nj60aacgqohaevp8gsock.apps.googleusercontent.com.json');
const TokenPath=path.join(__dirname,'token.json');

let keys;

if (!fs.existsSync(KeyPath)) {
  throw new Error('OAuth client secret file not found');
}

keys = JSON.parse(fs.readFileSync(KeyPath)).web;
const oauth2Client=new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
);

google.options({auth:oauth2Client});

async function authenticate(scopes){
    return new Promise((resolve,reject)=>{
        const authUrl=oauth2Client.generateAuthUrl({
            access_type:'offline',
            prompt:'consent',
            scope:scopes.join(' ')
        });
        const server=http.createServer(async(req,res)=>{
            try{
                if(req.url.indexOf('/oauth2callback')>-1){
                    const {query}=url.parse(req.url,true);
                    const {code}=query;
                    const {tokens}=await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);
                    //Save token
                    fs.writeFileSync(TokenPath,JSON.stringify(tokens));
                    console.log('Authentication successful.');
                    res.writeHead(200,{'Content-Type':'text/plain'});
                    res.end('Authentication successful. You can close this window.');
                    server.close();
                }
            }catch(err){
                console.error('Error during authentication:',err);
                reject(err);
            }
        });
        server.listen(3000,async()=>{
            console.log('Please visit this URL to authorize this application:',authUrl);
            const start =
            process.platform === 'win32' ? 'start' :
            process.platform === 'darwin' ? 'open' : 'xdg-open';

            exec(`${start} "${authUrl}"`);
        });
    });
}

module.exports = { authenticate };

async function listAccounts() {
    console.log('Listing accounts:');
  const accountMgmt = google.mybusinessaccountmanagement({
    version: 'v1',
    auth: oauth2Client,
  });

  const res = await accountMgmt.accounts.list();

  res.data.accounts.forEach(acc => {
    console.log(
      acc.name,
      '| type:', acc.type,
      '| name:', acc.accountName
    );
  });
}
async function listLocations(accountId) {
    console.log(`Locations for account: ${accountId}`);
  const res = await google.mybusinessbusinessinformation('v1')
    .accounts.locations.list({
      parent: `accounts/${accountId}`,
      pageSize: 100
    });

  res.data.locations.forEach(loc => {
    console.log(loc.name, loc.title);
    // locations/9876543210987654321
  });
}
async function listLocationsPersonal(accountId) {
  console.log('Searching locations for PERSONAL account');

  const businessInfo = google.mybusinessbusinessinformation({
    version: 'v1',
    auth: oauth2Client,
  });

  const res = await businessInfo.accounts.locations.search({
    parent: `accounts/${accountId}`,
    pageSize: 100,
    readMask: 'name,title',
  });

  if (!res.data.locations || res.data.locations.length === 0) {
    console.log('No locations found.');
    return;
  }

  res.data.locations.forEach(loc => {
    console.log(loc.name, '-', loc.title);
    // Example:
    // accounts/105630014004423132083/locations/1234567890123456789
  });
}
async function listLocationsPersonalLegacy(accountId) {
  console.log('Listing locations using LEGACY v4 API');

  const mybusiness = google.mybusiness({
    version: 'v4',
    auth: oauth2Client,
  });

  const res = await mybusiness.accounts.locations.list({
    parent: `accounts/${accountId}`,
    pageSize: 100,
  });

  if (!res.data.locations || res.data.locations.length === 0) {
    console.log('No locations found.');
    return;
  }

  res.data.locations.forEach(loc => {
    console.log(loc.name, '-', loc.locationName);
    // Example:
    // accounts/105630014004423132083/locations/1234567890123456789
  });
}
async function listReviews(accountId, locationId) {
  const res = await google.mybusinessreviews('v1').accounts.locations.reviews.list({
    parent: `accounts/${accountId}/locations/${locationId}`
  });

  console.log(res.data.reviews);
}

async function authedRequest(url) {
  const token = await oauth2Client.getAccessToken();

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}
async function listLocationsPersonalREST(accountId) {
  console.log('Listing locations via REST API');

  const url =
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations` +
    `?pageSize=100&readMask=name,title`;

  const data = await authedRequest(url);

  if (!data.locations) {
    console.log('No locations found');
    return;
  }

  data.locations.forEach(loc => {
    console.log(loc.name, '-', loc.title);
  });
}

async function listReviewsREST(accountId, locationId) {
  const url =
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;

  const data = await authedRequest(url);

  data.reviews?.forEach(r => {
    console.log(
      r.reviewer?.displayName,
      r.starRating,
      r.comment
    );
  });
}


(async () => {
    if (fs.existsSync(TokenPath)) {
        const token = JSON.parse(fs.readFileSync(TokenPath));
        oauth2Client.setCredentials(token);
    } else {
        await authenticate([
            'https://www.googleapis.com/auth/business.manage'
        ]);
    }
  await listAccounts();
  //await listLocationsPersonalREST('accountId'); //personal account ID
  //listReviewsREST('accountId', 'locationId'); //personal account ID, location ID
})();