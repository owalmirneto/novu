import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios from 'axios';

export class SinchSmsProvider implements ISmsProvider {
  id = 'sinch-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private baseUrl: string;

  constructor(
    private config: {
      from: string;
      plan: string;
      token: string;
    }
  ) {
    this.baseUrl = 'https://us.sms.api.sinch.com/xms/v1';
  }

  async sendMessage(options: ISmsOptions): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.token}`,
    };

    const response = await axios.post(
      `${this.baseUrl}/${this.config.plan}/batches`,
      {
        from: this.config.from,
        body: options.content,
        to: [options.to],
      },
      { headers: headers }
    );

    console.log(response.data);

    return { id: response.data, date: new Date().toISOString() };
  }
}
