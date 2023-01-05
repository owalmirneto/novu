import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { TwwSmsProvider } from '@novu/tww-sms';

export class TwwSmsHandler extends BaseSmsHandler {
  constructor() {
    super('tww-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new TwwSmsProvider({
      user: credentials.user,
      password: credentials.password,
    });
  }
}
