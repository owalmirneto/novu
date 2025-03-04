import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import {
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  CreateTopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { ISubscribersDefine, ITopic, TriggerRecipientsPayload } from '@novu/node';
import { TopicId, TopicKey, TopicName, TriggerRecipientsTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';

import { MapTriggerRecipients } from './map-trigger-recipients.use-case';
import { MapTriggerRecipientsCommand } from './map-trigger-recipients.command';

import { SharedModule } from '../../../shared/shared.module';
import { EventsModule } from '../../events.module';

describe('MapTriggerRecipientsUseCase', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let topicRepository: TopicRepository;
  let topicSubscribersRepository: TopicSubscribersRepository;
  let useCase: MapTriggerRecipients;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<MapTriggerRecipients>(MapTriggerRecipients);
    subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    topicRepository = new TopicRepository();
    topicSubscribersRepository = new TopicSubscribersRepository();
  });

  describe('When feature disabled', () => {
    beforeEach(() => {
      process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';
    });

    it('should map properly a single subscriber id as string', async () => {
      const transactionId = uuid();
      const subscriberId = SubscriberRepository.createObjectId();

      const command = buildCommand(session, transactionId, subscriberId);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId }]);
    });

    it('should map properly a single subscriber defined payload', async () => {
      const transactionId = uuid();

      const subscriberId = SubscriberRepository.createObjectId();
      const recipient: ISubscribersDefine = {
        subscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, recipient);

      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ ...recipient }]);
    });

    it('should only process the subscriber id and the subscriber recipients and ignore topics', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-1';
      const firstTopicName = 'topic-key-mixed-recipients-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-2';
      const secondTopicName = 'topic-key-mixed-recipients-2-name';
      const transactionId = uuid();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = TopicRepository.convertObjectIdToString(firstTopic._id);
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = TopicRepository.convertObjectIdToString(secondTopic._id);
      const thirdSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: TopicRepository.convertObjectIdToString(firstTopic._id),
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: TopicRepository.convertObjectIdToString(secondTopic._id),
      };

      const singleSubscriberId = SubscriberRepository.createObjectId();
      const subscribersDefineSubscriberId = SubscriberRepository.createObjectId();
      const singleSubscribersDefine: ISubscribersDefine = {
        subscriberId: subscribersDefineSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const recipients = [firstTopicRecipient, singleSubscriberId, secondTopicRecipient, singleSubscribersDefine];

      const command = buildCommand(session, transactionId, recipients);

      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId: singleSubscriberId }, { ...singleSubscribersDefine }]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstSubscriberId,
        secondSubscriberId,
        firstRecipient,
        secondRecipient,
        secondSubscriberId,
        firstSubscriberId,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId: firstSubscriberId }, { subscriberId: secondSubscriberId }]);
    });
  });

  describe('When feature enabled', () => {
    beforeEach(() => {
      process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'true';
    });

    afterEach(() => {
      process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';
    });

    it('should map properly a single subscriber id as string', async () => {
      const transactionId = uuid();
      const subscriberId = SubscriberRepository.createObjectId();

      const command = buildCommand(session, transactionId, subscriberId);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId }]);
    });

    it('should map properly a single subscriber defined payload', async () => {
      const transactionId = uuid();

      const subscriberId = SubscriberRepository.createObjectId();
      const recipient: ISubscribersDefine = {
        subscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, recipient);

      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ ...recipient }]);
    });

    it('should map properly a single topic', async () => {
      const topicKey = 'topic-key-single-recipient';
      const topicName = 'topic-key-single-recipient-name';
      const transactionId = uuid();

      const topic = await createTopicEntity(session, topicRepository, topicSubscribersRepository, topicKey, topicName);
      const topicId = TopicRepository.convertObjectIdToString(topic._id);
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, topicId, topicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const recipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: topic.key,
      };

      const command = buildCommand(session, transactionId, [recipient]);

      const result = await useCase.execute(command);

      expect(result).to.include.deep.members([
        { subscriberId: firstSubscriber.subscriberId },
        { subscriberId: secondSubscriber.subscriberId },
      ]);
    });

    it('should return an empty array if providing a topic that does not exist', async () => {
      const topicKey = 'topic-key-single-recipient';
      const topicName = 'topic-key-single-recipient-name';
      const transactionId = uuid();

      const recipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: TopicRepository.createObjectId(),
      };

      const command = buildCommand(session, transactionId, [recipient]);

      const result = await useCase.execute(command);

      expect(result).to.be.eql([]);
    });

    it('should map properly a mixed recipients list with a string, a subscribers define interface and two topics', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-1';
      const firstTopicName = 'topic-key-mixed-recipients-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-2';
      const secondTopicName = 'topic-key-mixed-recipients-2-name';
      const transactionId = uuid();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = TopicRepository.convertObjectIdToString(firstTopic._id);
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = TopicRepository.convertObjectIdToString(secondTopic._id);
      const thirdSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
      };

      const singleSubscriberId = SubscriberRepository.createObjectId();
      const subscribersDefineSubscriberId = SubscriberRepository.createObjectId();
      const singleSubscribersDefine: ISubscribersDefine = {
        subscriberId: subscribersDefineSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const recipients = [firstTopicRecipient, singleSubscriberId, secondTopicRecipient, singleSubscribersDefine];

      const command = buildCommand(session, transactionId, recipients);

      const result = await useCase.execute(command);

      expect(result).to.include.deep.members([
        { subscriberId: singleSubscriberId },
        { ...singleSubscribersDefine },
        { subscriberId: firstSubscriber.subscriberId },
        { subscriberId: secondSubscriber.subscriberId },
        { subscriberId: thirdSubscriber.subscriberId },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstSubscriberId,
        secondSubscriberId,
        firstRecipient,
        secondRecipient,
        secondSubscriberId,
        firstSubscriberId,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId: firstSubscriberId }, { subscriberId: secondSubscriberId }]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them but with different order', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstRecipient,
        secondRecipient,
        firstSubscriberId,
        secondSubscriberId,
        secondSubscriberId,
        firstSubscriberId,
        secondRecipient,
        firstRecipient,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ ...firstRecipient }, { ...secondRecipient }]);
    });

    it('should map properly multiple topics and deduplicate them', async () => {
      const firstTopicKey = 'topic-key-mixed-topics-1';
      const firstTopicName = 'topic-key-mixed-topics-1-name';
      const secondTopicKey = 'topic-key-mixed-topics-2';
      const secondTopicName = 'topic-key-mixed-topics-2-name';
      const thirdTopicKey = 'topic-key-mixed-topics-3';
      const thirdTopicName = 'topic-key-mixed-topics-3-name';
      const transactionId = uuid();

      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      const thirdSubscriber = await subscribersService.createSubscriber();
      const fourthSubscriber = await subscribersService.createSubscriber();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = TopicRepository.convertObjectIdToString(firstTopic._id);
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = TopicRepository.convertObjectIdToString(secondTopic._id);
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const thirdTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        thirdTopicKey,
        thirdTopicName
      );
      const thirdTopicId = TopicRepository.convertObjectIdToString(thirdTopic._id);
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, thirdTopicId, thirdTopicKey, [
        firstSubscriber,
        fourthSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
      };
      const thirdTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: thirdTopic.key,
      };

      const command = buildCommand(session, transactionId, [
        thirdTopicRecipient,
        firstTopicRecipient,
        secondTopicRecipient,
        thirdTopicRecipient,
        secondTopicRecipient,
        firstTopicRecipient,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.include.deep.members([
        { subscriberId: firstSubscriber.subscriberId },
        { subscriberId: fourthSubscriber.subscriberId },
        { subscriberId: secondSubscriber.subscriberId },
        { subscriberId: thirdSubscriber.subscriberId },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and topics and deduplicate them', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-deduplication-1';
      const firstTopicName = 'topic-key-mixed-recipients-deduplication-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-deduplication-2';
      const secondTopicName = 'topic-key-mixed-recipients-deduplication-2-name';
      const transactionId = uuid();

      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      const thirdSubscriber = await subscribersService.createSubscriber();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriber._id,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriber._id,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = TopicRepository.convertObjectIdToString(firstTopic._id);
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = TopicRepository.convertObjectIdToString(secondTopic._id);
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
      };

      const command = buildCommand(session, transactionId, [
        secondTopicRecipient,
        firstRecipient,
        firstSubscriber._id,
        secondSubscriber._id,
        firstTopicRecipient,
        secondRecipient,
        thirdSubscriber._id,
      ]);
      const result = await useCase.execute(command);

      // We process first recipients that are not topics so they will take precedence when deduplicating
      expect(result).to.include.deep.members([
        { ...firstRecipient },
        { subscriberId: secondSubscriber.subscriberId },
        { subscriberId: thirdSubscriber.subscriberId },
      ]);
    });
  });
});

const createTopicEntity = async (
  session: UserSession,
  topicRepository: TopicRepository,
  topicSubscribersRepository: TopicSubscribersRepository,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<TopicEntity> => {
  const environmentId = session.environment._id;
  const organizationId = session.organization._id;

  const topicEntity = {
    _environmentId: TopicRepository.convertStringToObjectId(environmentId),
    key: topicKey,
    name: topicName,
    _organizationId: TopicRepository.convertStringToObjectId(organizationId),
  };
  const topic = await topicRepository.create(topicEntity);

  expect(topic).to.exist;
  expect(topic.key).to.be.eql(topicKey);
  expect(topic.name).to.be.eql(topicName);

  return topic;
};

const addSubscribersToTopic = async (
  session: UserSession,
  topicRepository: TopicRepository,
  topicSubscribersRepository: TopicSubscribersRepository,
  topicId: TopicId,
  topicKey: TopicKey,
  subscribers: SubscriberEntity[]
): Promise<void> => {
  const _environmentId = TopicSubscribersRepository.convertStringToObjectId(session.environment._id);
  const _organizationId = TopicSubscribersRepository.convertStringToObjectId(session.organization._id);
  const _topicId = TopicSubscribersRepository.convertStringToObjectId(topicId);

  const entities: CreateTopicSubscribersEntity[] = subscribers.map((subscriber) => ({
    _environmentId,
    _organizationId,
    _subscriberId: TopicSubscribersRepository.convertStringToObjectId(subscriber._id),
    _topicId,
    topicKey,
    externalSubscriberId: subscriber.subscriberId,
  }));
  await topicSubscribersRepository.addSubscribers(entities);

  const result = await topicRepository.findTopic(topicKey, _environmentId);

  expect(result.subscribers.length).to.be.eql(subscribers.length);
  expect(result.subscribers).to.have.members(subscribers.map((subscriber) => subscriber.subscriberId));
};

const buildCommand = (
  session: UserSession,
  transactionId: string,
  recipients: TriggerRecipientsPayload
): MapTriggerRecipientsCommand => {
  return MapTriggerRecipientsCommand.create({
    organizationId: session.organization._id,
    environmentId: session.environment._id,
    recipients,
    transactionId,
    userId: session.user._id,
  });
};
