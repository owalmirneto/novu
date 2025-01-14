import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import crypto from 'crypto';

export class FcmPushProvider implements IPushProvider {
  id = 'fcm';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private messaging: Messaging;
  constructor(
    private config: {
      projectId: string;
      email: string;
      secretKey: string;
    }
  ) {
    this.config = config;
    const firebase = initializeApp(
      {
        credential: cert({
          projectId: this.config.projectId,
          clientEmail: this.config.email,
          privateKey: this.config.secretKey,
        }),
      },
      crypto.randomBytes(4).toString()
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    delete (options.overrides as { deviceTokens?: string[] })?.deviceTokens;

    const overridesData = options.overrides || ({} as any);

    let res;

    if (overridesData?.type === 'data') {
      delete (options.overrides as { type?: string })?.type;
      res = await this.messaging.sendMulticast({
        tokens: options.target,
        data: options.payload as { [key: string]: string },
      });
    } else {
      const { data, ...overrides } = overridesData;

      res = await this.messaging.sendMulticast({
        tokens: options.target,
        notification: {
          title: options.title,
          body: options.content,
          ...overrides,
        },
        data,
      });
    }

    if (res.failureCount > 0) {
      throw new Error(
        `Sending message failed due to "${
          res.responses.find((i) => i.success === false).error.message
        }"`
      );
    }

    return {
      ids: res?.responses?.map((response) => response.messageId),
      date: new Date().toISOString(),
    };
  }
}
