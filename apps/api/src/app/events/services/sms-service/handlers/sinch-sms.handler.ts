import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { SinchSmsProvider } from '@novu/sinch-sms';

export class SinchSmsHandler extends BaseSmsHandler {
  constructor() {
    super('sinch-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      secretKey: string;
    } = { apiKey: credentials.apiKey, secretKey: credentials.secretKey };

    this.provider = new SinchSmsProvider(config);
  }
}
