#!/usr/bin/env python3
"""
Bedrock Agent Deployment Script
Deploys a Bedrock Agent with Action Group and Lambda function using CloudFormation
"""

import boto3
import json
import time
import argparse
import sys
import os
from botocore.exceptions import ClientError, NoCredentialsError

class BedrockAgentDeployer:
    def __init__(self, region='us-west-2', profile=None):
        """Initialize the deployer with AWS session"""
        try:
            if profile:
                session = boto3.Session(profile_name=profile)
            else:
                session = boto3.Session()
            
            self.cf_client = session.client('cloudformation', region_name=region)
            self.bedrock_client = session.client('bedrock-agent', region_name=region)
            self.region = region
            
            # Test credentials
            sts = session.client('sts')
            identity = sts.get_caller_identity()
            print(f"✅ Connected to AWS Account: {identity['Account']}")
            print(f"✅ Region: {region}")
            
        except NoCredentialsError:
            print("❌ AWS credentials not found. Please configure your credentials.")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error initializing AWS session: {e}")
            sys.exit(1)

    def deploy_stack(self, stack_name, template_file, parameters=None):
        """Deploy CloudFormation stack"""
        try:
            # Read template file
            with open(template_file, 'r') as f:
                template_body = f.read()
            
            # Prepare parameters
            cf_parameters = []
            if parameters:
                for key, value in parameters.items():
                    cf_parameters.append({
                        'ParameterKey': key,
                        'ParameterValue': value
                    })
            
            print(f"🚀 Deploying stack: {stack_name}")
            
            # Check if stack exists
            try:
                self.cf_client.describe_stacks(StackName=stack_name)
                print(f"📝 Stack {stack_name} exists, updating...")
                
                response = self.cf_client.update_stack(
                    StackName=stack_name,
                    TemplateBody=template_body,
                    Parameters=cf_parameters,
                    Capabilities=['CAPABILITY_NAMED_IAM']
                )
                operation = 'UPDATE'
                
            except ClientError as e:
                if 'does not exist' in str(e):
                    print(f"📝 Creating new stack: {stack_name}")
                    
                    response = self.cf_client.create_stack(
                        StackName=stack_name,
                        TemplateBody=template_body,
                        Parameters=cf_parameters,
                        Capabilities=['CAPABILITY_NAMED_IAM']
                    )
                    operation = 'CREATE'
                else:
                    raise e
            
            # Wait for completion
            self._wait_for_stack_completion(stack_name, operation)
            
            # Get outputs
            outputs = self._get_stack_outputs(stack_name)
            return outputs
            
        except Exception as e:
            print(f"❌ Error deploying stack: {e}")
            return None

    def _wait_for_stack_completion(self, stack_name, operation):
        """Wait for CloudFormation stack operation to complete"""
        if operation == 'CREATE':
            waiter = self.cf_client.get_waiter('stack_create_complete')
            success_status = 'CREATE_COMPLETE'
            failure_statuses = ['CREATE_FAILED', 'ROLLBACK_COMPLETE']
        else:
            waiter = self.cf_client.get_waiter('stack_update_complete')
            success_status = 'UPDATE_COMPLETE'
            failure_statuses = ['UPDATE_FAILED', 'UPDATE_ROLLBACK_COMPLETE']
        
        print(f"⏳ Waiting for stack {operation.lower()} to complete...")
        
        try:
            waiter.wait(
                StackName=stack_name,
                WaiterConfig={
                    'Delay': 30,
                    'MaxAttempts': 60
                }
            )
            print(f"✅ Stack {operation.lower()} completed successfully!")
            
        except Exception as e:
            # Check final status
            response = self.cf_client.describe_stacks(StackName=stack_name)
            status = response['Stacks'][0]['StackStatus']
            
            if status in failure_statuses:
                print(f"❌ Stack {operation.lower()} failed with status: {status}")
                self._print_stack_events(stack_name)
            else:
                print(f"✅ Stack operation completed with status: {status}")

    def _get_stack_outputs(self, stack_name):
        """Get CloudFormation stack outputs"""
        try:
            response = self.cf_client.describe_stacks(StackName=stack_name)
            outputs = {}
            
            if 'Outputs' in response['Stacks'][0]:
                for output in response['Stacks'][0]['Outputs']:
                    outputs[output['OutputKey']] = output['OutputValue']
            
            return outputs
            
        except Exception as e:
            print(f"❌ Error getting stack outputs: {e}")
            return {}

    def _print_stack_events(self, stack_name, limit=10):
        """Print recent stack events for debugging"""
        try:
            response = self.cf_client.describe_stack_events(StackName=stack_name)
            events = response['StackEvents'][:limit]
            
            print(f"\n📋 Recent stack events for {stack_name}:")
            for event in events:
                timestamp = event['Timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                resource = event.get('LogicalResourceId', 'N/A')
                status = event.get('ResourceStatus', 'N/A')
                reason = event.get('ResourceStatusReason', 'N/A')
                
                print(f"  {timestamp} | {resource} | {status} | {reason}")
                
        except Exception as e:
            print(f"❌ Error getting stack events: {e}")

    def prepare_agent(self, agent_id):
        """Prepare the Bedrock Agent (required after creation/update)"""
        try:
            print(f"🔧 Preparing Bedrock Agent: {agent_id}")
            
            response = self.bedrock_client.prepare_agent(agentId=agent_id)
            
            # Wait for preparation to complete
            print("⏳ Waiting for agent preparation to complete...")
            
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    agent_response = self.bedrock_client.get_agent(agentId=agent_id)
                    status = agent_response['agent']['agentStatus']
                    
                    if status == 'PREPARED':
                        print("✅ Agent preparation completed!")
                        return True
                    elif status in ['FAILED', 'NOT_PREPARED']:
                        print(f"❌ Agent preparation failed with status: {status}")
                        return False
                    
                    print(f"⏳ Agent status: {status} (attempt {attempt + 1}/{max_attempts})")
                    time.sleep(10)
                    
                except Exception as e:
                    print(f"⚠️ Error checking agent status: {e}")
                    time.sleep(10)
            
            print("❌ Agent preparation timed out")
            return False
            
        except Exception as e:
            print(f"❌ Error preparing agent: {e}")
            return False

    def test_agent(self, agent_id, alias_id):
        """Test the deployed agent with a sample query"""
        try:
            print(f"🧪 Testing agent {agent_id} with alias {alias_id}")
            
            bedrock_runtime = boto3.client('bedrock-agent-runtime', region_name=self.region)
            
            response = bedrock_runtime.invoke_agent(
                agentId=agent_id,
                agentAliasId=alias_id,
                sessionId=f'test-session-{int(time.time())}',
                inputText='EKS 기초 강의 추천해줘'
            )
            
            # Process streaming response
            result_text = ''
            if 'completion' in response:
                for chunk in response['completion']:
                    if 'chunk' in chunk and 'bytes' in chunk['chunk']:
                        result_text += chunk['chunk']['bytes'].decode('utf-8')
            
            if result_text:
                print("✅ Agent test successful!")
                print(f"📝 Response preview: {result_text[:200]}...")
                return True
            else:
                print("⚠️ Agent responded but no content received")
                return False
                
        except Exception as e:
            print(f"❌ Error testing agent: {e}")
            return False

    def save_env_file(self, agent_id, alias_id, env_file='.env.agent'):
        """Save agent configuration to .env.agent file"""
        try:
            # Get project root directory (two levels up from script location)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(script_dir))
            env_path = os.path.join(project_root, env_file)
            
            env_content = f"""BEDROCK_AGENT_ID={agent_id}
BEDROCK_AGENT_ALIAS_ID={alias_id}
BEDROCK_AGENT_REGION={self.region}
"""
            with open(env_path, 'w') as f:
                f.write(env_content)
            
            print(f"✅ Agent configuration saved to {env_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving env file: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Deploy Bedrock Agent with CloudFormation')
    parser.add_argument('--stack-name', default='bedrock-course-agent', 
                       help='CloudFormation stack name')
    parser.add_argument('--agent-name', default='CourseSearchAgent',
                       help='Bedrock Agent name')
    parser.add_argument('--region', default='us-west-2',
                       help='AWS region')
    parser.add_argument('--profile', 
                       help='AWS profile name')
    parser.add_argument('--dynamodb-table', default='Class',
                       help='DynamoDB table name for course data')
    parser.add_argument('--model-id', default='us.anthropic.claude-3-7-sonnet-20250219-v1:0',
                       help='Foundation model ID')
    parser.add_argument('--test', action='store_true',
                       help='Test the agent after deployment')
    
    args = parser.parse_args()
    
    # Initialize deployer
    deployer = BedrockAgentDeployer(region=args.region, profile=args.profile)
    
    # Deployment parameters
    parameters = {
        'AgentName': args.agent_name,
        'ModelId': args.model_id,
        'DynamoDBTableName': args.dynamodb_table
    }
    
    print(f"🎯 Deployment Configuration:")
    print(f"   Stack Name: {args.stack_name}")
    print(f"   Agent Name: {args.agent_name}")
    print(f"   Region: {args.region}")
    print(f"   DynamoDB Table: {args.dynamodb_table}")
    print(f"   Model ID: {args.model_id}")
    print()
    
    # Deploy stack
    outputs = deployer.deploy_stack(
        stack_name=args.stack_name,
        template_file='bedrock-agent.yaml',
        parameters=parameters
    )
    
    if not outputs:
        print("❌ Deployment failed")
        sys.exit(1)
    
    print(f"\n🎉 Deployment completed successfully!")
    print(f"📋 Stack Outputs:")
    for key, value in outputs.items():
        print(f"   {key}: {value}")
    
    # Prepare agent
    if 'AgentId' in outputs:
        agent_prepared = deployer.prepare_agent(outputs['AgentId'])
        
        # Save .env.agent file
        if 'AgentAliasId' in outputs:
            deployer.save_env_file(outputs['AgentId'], outputs['AgentAliasId'])
        
        if agent_prepared and args.test and 'AgentAliasId' in outputs:
            # Test agent
            deployer.test_agent(outputs['AgentId'], outputs['AgentAliasId'])
    
    print(f"\n✅ Bedrock Agent is ready to use!")
    print(f"   Agent ID: {outputs.get('AgentId', 'N/A')}")
    print(f"   Alias ID: {outputs.get('AgentAliasId', 'N/A')}")
    print(f"   Config File: .env.agent")

if __name__ == '__main__':
    main()
