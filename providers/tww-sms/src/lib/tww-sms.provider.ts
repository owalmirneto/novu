import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios from 'axios';

export class TwwSmsProvider implements ISmsProvider {
  id = 'tww-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private baseUrl: string;

  constructor(
    private config: {
      user: string;
      password: string;
    }
  ) {
    this.baseUrl = 'https://webservices2.twwwireless.com.br';
  }

  async sendMessage(options: ISmsOptions): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
    };

    const response = await axios.post(
      `${this.baseUrl}/reluzcap/wsreluzcap.asmx/EnviaSMS`,
      {
        SeuNum: 'ilove.me',
        NumUsu: this.config.user,
        Senha: this.config.password,
        Mensagem: options.content,
        Celular: options.to,
      },
      { headers: headers }
    );

    console.log(response.data);

    return { id: response.data, date: new Date().toISOString() };
  }
}
