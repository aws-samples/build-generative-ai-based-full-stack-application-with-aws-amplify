# Bedrock Agent CloudFormation Deployment

이 폴더는 Amazon Bedrock Agent를 다른 AWS 계정에서 재사용할 수 있도록 CloudFormation 템플릿과 Python 배포 스크립트를 제공합니다.

## 파일 구성

- `bedrock-agent.yaml`: CloudFormation 템플릿
- `deploy-agent.py`: Python 배포 스크립트
- `README.md`: 사용 가이드

## 사전 요구사항

1. **AWS CLI 설정**
   ```bash
   aws configure
   ```

2. **Python 패키지 설치**
   ```bash
   pip install boto3
   ```

3. **DynamoDB 테이블 존재**
   - 테이블명: `Class` (또는 사용자 지정)
   - 필수 필드: `name`, `description`, `searchableText`, `url`, `author`, `difficulty`

4. **Bedrock 모델 액세스**
   - Claude 3 Sonnet 모델에 대한 액세스 권한 필요
   - AWS Console > Bedrock > Model access에서 활성화

## 배포 방법

### 1. 기본 배포
```bash
python deploy-agent.py
```

### 2. 사용자 정의 배포
```bash
python deploy-agent.py \
  --stack-name my-bedrock-agent \
  --agent-name MyAgent \
  --region ap-northeast-2 \
  --dynamodb-table MyClassTable \
  --test
```

### 3. AWS 프로필 사용
```bash
python deploy-agent.py --profile my-aws-profile --region us-east-1
```

## 배포 매개변수

| 매개변수 | 기본값 | 설명 |
|---------|--------|------|
| `--stack-name` | `bedrock-course-agent` | CloudFormation 스택 이름 |
| `--agent-name` | `CourseSearchAgent` | Bedrock Agent 이름 |
| `--region` | `us-west-2` | AWS 리전 |
| `--profile` | (없음) | AWS 프로필 이름 |
| `--dynamodb-table` | `Class` | DynamoDB 테이블 이름 |
| `--model-id` | `anthropic.claude-3-sonnet-20240229-v1:0` | 기반 모델 ID |
| `--test` | (없음) | 배포 후 테스트 실행 |

## 생성되는 리소스

1. **Bedrock Agent**: 코스 검색 AI 에이전트
2. **Lambda Function**: DynamoDB 검색 함수
3. **IAM Roles**: Agent 및 Lambda 실행 역할
4. **Action Group**: Agent와 Lambda 연결
5. **Agent Alias**: Agent 버전 관리

## 출력값

배포 완료 후 다음 정보가 출력됩니다:

- `AgentId`: Bedrock Agent ID
- `AgentAliasId`: Agent Alias ID  
- `LambdaFunctionArn`: Lambda 함수 ARN
- `AgentArn`: Agent ARN

## 사용 예시

### Python에서 Agent 호출
```python
import boto3

client = boto3.client('bedrock-agent-runtime', region_name='us-west-2')

response = client.invoke_agent(
    agentId='YOUR_AGENT_ID',
    agentAliasId='YOUR_ALIAS_ID',
    sessionId='session-123',
    inputText='EKS 강의 추천해줘'
)

# 스트리밍 응답 처리
for chunk in response['completion']:
    if 'chunk' in chunk:
        print(chunk['chunk']['bytes'].decode('utf-8'), end='')
```

### AWS CLI에서 테스트
```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id YOUR_AGENT_ID \
  --agent-alias-id YOUR_ALIAS_ID \
  --session-id test-session \
  --input-text "Lambda 기초 강의 추천해줘" \
  --region us-west-2 \
  response.json
```

## 문제 해결

### 1. 권한 오류
```
Error: User is not authorized to perform: bedrock:CreateAgent
```
**해결**: IAM 사용자에게 Bedrock 권한 추가
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:*",
                "lambda:*",
                "iam:*",
                "cloudformation:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. 모델 액세스 오류
```
Error: Model access denied
```
**해결**: AWS Console > Bedrock > Model access에서 Claude 3 Sonnet 활성화

### 3. DynamoDB 테이블 없음
```
Error: Table 'Class' not found
```
**해결**: DynamoDB 테이블 생성 또는 `--dynamodb-table` 매개변수로 기존 테이블 지정

### 4. Agent 준비 실패
```
Error: Agent preparation failed
```
**해결**: 
- Lambda 함수 로그 확인
- IAM 권한 확인
- Action Group 스키마 검증

## 정리

스택 삭제:
```bash
aws cloudformation delete-stack --stack-name bedrock-course-agent
```

## 지원

문제가 발생하면 다음을 확인하세요:
1. AWS 자격 증명 및 권한
2. Bedrock 모델 액세스 권한
3. DynamoDB 테이블 존재 및 구조
4. CloudFormation 스택 이벤트 로그
