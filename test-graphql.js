import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { readFileSync } from 'fs';

const outputs = JSON.parse(readFileSync('./amplify_outputs.json', 'utf8'));

Amplify.configure(outputs);

const client = generateClient({
  authMode: 'apiKey'
});

async function testBedrockAgent() {
  try {
    console.log('Testing Bedrock Agent GraphQL query with API Key...');
    console.log('API URL:', outputs.data.url);
    console.log('API Key:', outputs.data.api_key);
    
    const result = await client.queries.searchWithAgent({
      query: 'EKS roadmap',
      sessionId: `test-session-${Date.now()}`
    });
    
    console.log('Result:', result);
    console.log('Response:', result.data?.response);
  } catch (error) {
    console.error('Error:', error);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('GraphQL errors:', error.errors);
    }
  }
}

testBedrockAgent();
