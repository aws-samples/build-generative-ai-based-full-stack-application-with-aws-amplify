import type { AppSyncResolverHandler } from 'aws-lambda';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ 
  region: process.env.BEDROCK_AGENT_REGION || 'ap-northeast-2' 
});

type Arguments = {
  query: string;
  sessionId?: string;
};

type TraceStep = {
  type: string;
  content: string;
  timestamp: string;
};

type BedrockAgentResponse = {
  response: string;
  traces?: TraceStep[];
};

export const handler: AppSyncResolverHandler<Arguments, BedrockAgentResponse> = async (event) => {
  const { query, sessionId } = event.arguments;
  
  try {
    const command = new InvokeAgentCommand({
      agentId: process.env.BEDROCK_AGENT_ID || 'IRLCBRYN4P',
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'FSB2AMZ0RG',
      sessionId: sessionId || `session-${Date.now()}`,
      inputText: query,
      enableTrace: true // Enable trace
    });

    const response = await client.send(command);
    
    let responseText = '';
    const traces: TraceStep[] = [];
    
    if (response.completion) {
      for await (const chunk of response.completion) {
        // Handle response chunks
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          responseText += text;
        }
        
        // Handle trace events
        if (chunk.trace) {
          const trace = chunk.trace as any; // Type assertion for trace properties
          const timestamp = new Date().toISOString();
          
          if (trace.preProcessingTrace) {
            traces.push({
              type: 'preprocessing',
              content: `🔄 전처리 중...`,
              timestamp
            });
          }
          
          if (trace.orchestrationTrace) {
            const orch = trace.orchestrationTrace;
            if (orch.rationale?.text) {
              traces.push({
                type: 'reasoning',
                content: `🧠 추론: ${orch.rationale.text}`,
                timestamp
              });
            }
            if (orch.invocationInput) {
              traces.push({
                type: 'function_call',
                content: `⚡ 함수 호출 중...`,
                timestamp
              });
            }
            if (orch.observation?.finalResponse?.text) {
              traces.push({
                type: 'observation',
                content: `👀 결과 확인: ${orch.observation.finalResponse.text}`,
                timestamp
              });
            }
          }
          
          if (trace.postProcessingTrace) {
            traces.push({
              type: 'postprocessing',
              content: `✅ 후처리 완료`,
              timestamp
            });
          }
        }
      }
    }

    return {
      response: responseText || 'No response from agent',
      traces: traces.length > 0 ? traces : undefined
    };
  } catch (error) {
    console.error('Bedrock Agent Error:', error);
    return {
      response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
