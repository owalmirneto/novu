import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { SinchSmsProvider } from '@novu/sinch-sms';

export class SinchSmsHandler extends BaseSmsHandler {
  constructor() {
    super('sinch-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new SinchSmsProvider({
      from: credentials.from,
      plan: credentials.accountSid,
      token: credentials.token,
    });
  }
}
