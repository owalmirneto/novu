# Novu Tww SMS Provider

A Tww SMS sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { TwwSmsProvider } from '@novu/tww-sms';

const provider = new TwwSmsProvider({
  apiKey: process.env.BURST_SMS_API_KEY,        // Your Tww SMS API Key
  secretKey: process.env.BURST_SMS_SECRET_KEY,  // Your Tww SMS API Secret
})

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
