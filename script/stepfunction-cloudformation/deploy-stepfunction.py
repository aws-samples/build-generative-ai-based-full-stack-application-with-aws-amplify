#!/usr/bin/env python3
"""
Step Functions Deployment Script
Deploys a Step Functions State Machine using CloudFormation
"""

import boto3
import json
import time
import argparse
import sys
import os
from botocore.exceptions import ClientError, NoCredentialsError

class StepFunctionsDeployer:
    def __init__(self, region='us-west-2', profile=None):
        """Initialize the deployer with AWS session"""
        try:
            if profile:
                session = boto3.Session(profile_name=profile)
            else:
                session = boto3.Session()
            
            self.cf_client = session.client('cloudformation', region_name=region)
            self.sfn_client = session.client('stepfunctions', region_name=region)
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
                    Capabilities=['CAPABILITY_IAM']
                )
                operation = 'UPDATE'
                
            except ClientError as e:
                if 'does not exist' in str(e):
                    print(f"📝 Creating new stack: {stack_name}")
                    
                    response = self.cf_client.create_stack(
                        StackName=stack_name,
                        TemplateBody=template_body,
                        Parameters=cf_parameters,
                        Capabilities=['CAPABILITY_IAM']
                    )
                    operation = 'CREATE'
                elif 'No updates are to be performed' in str(e):
                    print("✅ Stack is already up to date")
                    return self._get_stack_outputs(stack_name)
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
                    'Delay': 10,
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

    def test_state_machine(self, state_machine_arn, test_input):
        """Test the deployed state machine"""
        try:
            print(f"🧪 Testing state machine: {state_machine_arn}")
            
            response = self.sfn_client.start_execution(
                stateMachineArn=state_machine_arn,
                input=json.dumps(test_input)
            )
            
            execution_arn = response['executionArn']
            print(f"✅ Execution started: {execution_arn}")
            
            return execution_arn
            
        except Exception as e:
            print(f"❌ Error testing state machine: {e}")
            return None

    def save_env_file(self, state_machine_arn, state_machine_name, env_file='.env.stepfunction'):
        """Save state machine configuration to .env.stepfunction file"""
        try:
            # Get project root directory (two levels up from script location)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(script_dir))
            env_path = os.path.join(project_root, env_file)
            
            env_content = f"""STEPFUNCTION_ARN={state_machine_arn}
STEPFUNCTION_NAME={state_machine_name}
STEPFUNCTION_REGION={self.region}
"""
            with open(env_path, 'w') as f:
                f.write(env_content)
            
            print(f"✅ State machine configuration saved to {env_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving env file: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Deploy Step Functions State Machine with CloudFormation')
    parser.add_argument('--stack-name', default='video-understanding-stepfunction', 
                       help='CloudFormation stack name')
    parser.add_argument('--state-machine-name', default='amplify-video-understanding-machine',
                       help='Step Functions State Machine name')
    parser.add_argument('--region', default='us-west-2',
                       help='AWS region')
    parser.add_argument('--profile', 
                       help='AWS profile name')
    parser.add_argument('--test', action='store_true',
                       help='Test the state machine after deployment')
    
    args = parser.parse_args()
    
    # Initialize deployer
    deployer = StepFunctionsDeployer(region=args.region, profile=args.profile)
    
    # Deployment parameters
    parameters = {
        'StateMachineName': args.state_machine_name
    }
    
    print(f"🎯 Deployment Configuration:")
    print(f"   Stack Name: {args.stack_name}")
    print(f"   State Machine Name: {args.state_machine_name}")
    print(f"   Region: {args.region}")
    print()
    
    # Deploy stack
    outputs = deployer.deploy_stack(
        stack_name=args.stack_name,
        template_file='stepfunction.yaml',
        parameters=parameters
    )
    
    if not outputs:
        print("❌ Deployment failed")
        sys.exit(1)
    
    print(f"\n🎉 Deployment completed successfully!")
    print(f"📋 Stack Outputs:")
    for key, value in outputs.items():
        print(f"   {key}: {value}")
    
    # Save .env.stepfunction file
    if 'StateMachineArn' in outputs and 'StateMachineName' in outputs:
        deployer.save_env_file(outputs['StateMachineArn'], outputs['StateMachineName'])
    
    # Test state machine
    if args.test and 'StateMachineArn' in outputs:
        test_input = {
            "BucketName": "amplify-s3-ryz",
            "VideoKey": "test-video.mp4",
            "TranscriptionKey": "test-transcription",
            "SummarizedTextFileKey": "summary.json",
            "Languages": ["en-US"]
        }
        deployer.test_state_machine(outputs['StateMachineArn'], test_input)
    
    print(f"\n✅ Step Functions State Machine is ready to use!")
    print(f"   State Machine ARN: {outputs.get('StateMachineArn', 'N/A')}")
    print(f"   State Machine Name: {outputs.get('StateMachineName', 'N/A')}")
    print(f"   Config File: .env.stepfunction")

if __name__ == '__main__':
    main()
