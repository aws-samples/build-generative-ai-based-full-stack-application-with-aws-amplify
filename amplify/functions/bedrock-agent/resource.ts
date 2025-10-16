import { defineFunction } from '@aws-amplify/backend';

export const bedrockAgent = defineFunction({
  name: 'bedrockAgent',
  entry: './handler.ts',
  environment: {
    BEDROCK_AGENT_ID: 'IRLCBRYN4P',
    BEDROCK_AGENT_ALIAS_ID: 'FSB2AMZ0RG',
    BEDROCK_AGENT_REGION: 'ap-northeast-2'
  }
});
