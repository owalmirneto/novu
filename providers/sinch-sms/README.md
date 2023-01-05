# Novu Sinch SMS Provider

A Sinch SMS sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { SinchSmsProvider } from '@novu/sinch-sms';

const provider = new SinchSmsProvider({
  apiKey: process.env.BURST_SMS_API_KEY,        // Your Sinch SMS API Key
  secretKey: process.env.BURST_SMS_SECRET_KEY,  // Your Sinch SMS API Secret
})

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
