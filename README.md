## Google Business Profile Review Manager
Fetch Google Business Profile customer reviews for the location ID with Node.js using OAuth 2.0.
Mainly supports personal accounts and it can be modified to use with business accounts (need changes in the list review endpoints), stores IDs securely via .env, and outputs reviews for further analysis or storage.

```
# Install dependencies
npm install

# Create .env file
ACCOUNT_ID=your_account_id
LOCATION_ID=your_location_id

# Run the script
node getReviewPersonalAccounts.js
```