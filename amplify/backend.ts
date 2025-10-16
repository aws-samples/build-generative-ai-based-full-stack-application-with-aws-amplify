import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { bedrockAgent } from './functions/bedrock-agent/resource';

const backend = defineBackend({
  auth,
  data,
  bedrockAgent,
});

// Bedrock Agent 권한 추가
backend.bedrockAgent.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeAgent'],
    resources: [
      'arn:aws:bedrock:ap-northeast-2:*:agent/IRLCBRYN4P',
      'arn:aws:bedrock:ap-northeast-2:*:agent-alias/IRLCBRYN4P/FSB2AMZ0RG'
    ],
  })
);
