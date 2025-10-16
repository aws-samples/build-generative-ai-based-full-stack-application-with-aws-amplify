# AWS Amplify Bedrock Search 아키텍처

## 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Search Page<br/>src/pages/search.tsx] --> B[StreamingSearch Component<br/>src/components/StreamingSearch.tsx]
        A --> C[Cloudscape UI Components<br/>Input, Cards, Alert]
    end
    
    subgraph "AWS Amplify Backend"
        D[AWS AppSync GraphQL API<br/>amplify/data/resource.ts]
        E[Custom Resolver<br/>bedrock-stream.js]
        F[Custom Resolver<br/>bedrock-search.js]
        G[Custom Resolver<br/>bedrock-validate.js]
    end
    
    subgraph "AWS Services"
        H[Amazon Bedrock<br/>Claude 3 Haiku]
        I[Amazon DynamoDB<br/>Class Table]
        J[Amazon Cognito<br/>Authentication]
    end
    
    A -->|GraphQL Query| D
    D -->|searchClassesStream| E
    D -->|searchClasses| F
    D -->|validateSearchResults| G
    
    E -->|InvokeModel API| H
    F -->|InvokeModel API| H
    G -->|InvokeModel API| H
    
    A -->|List Classes| I
    D -->|Data Access| I
    
    A -->|Auth Token| J
    D -->|Authorization| J
```

## 검색 플로우 상세 다이어그램

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Frontend
    participant A as AppSync API
    participant B as Bedrock Handler
    participant BR as Amazon Bedrock
    participant D as DynamoDB
    
    U->>R: 검색어 입력 "EKS 강의"
    R->>R: setLoading(true)
    R->>A: client.models.Class.list()
    A->>D: Query all classes
    D-->>A: 20개 클래스 반환
    A-->>R: classes 데이터
    
    R->>R: 클래스 설명 문자열 생성
    R->>A: searchClassesStream(query, descriptions)
    A->>B: bedrock-stream.js 실행
    
    B->>BR: InvokeModel API 호출
    Note over B,BR: Claude 3 Haiku 모델<br/>시맨틱 분석 요청
    
    BR-->>B: JSON 응답
    Note over BR,B: {"primary_topic": "EKS",<br/>"search_terms": ["EKS", "Kubernetes"],<br/>"relevant_class_ids": ["id1", "id2"]}
    
    B-->>A: BedrockResponse
    A-->>R: 스트리밍 응답
    
    R->>R: 토큰별 스트리밍 시뮬레이션
    R->>R: JSON 파싱 및 결과 필터링
    R->>R: 관련성 점수 계산 및 정렬
    R->>U: 검색 결과 표시
```

## 데이터 플로우 아키텍처

```mermaid
flowchart LR
    subgraph "Input Processing"
        A1[사용자 검색어<br/>"EKS 강의"]
        A2[DynamoDB 클래스 로드<br/>20개 클래스]
        A3[클래스 설명 결합<br/>단일 문자열]
    end
    
    subgraph "Bedrock Processing"
        B1[Bedrock 프롬프트 생성<br/>검색어 + 클래스 설명]
        B2[Claude 3 Haiku 호출<br/>시맨틱 분석]
        B3[JSON 응답 파싱<br/>관련 클래스 ID 추출]
    end
    
    subgraph "Result Processing"
        C1[시맨틱 매칭<br/>relevant_class_ids 사용]
        C2[폴백 텍스트 매칭<br/>검색어 포함 여부]
        C3[관련성 점수 계산<br/>제목 > 설명 > 내용]
        C4[결과 정렬 및 표시<br/>Cards UI 컴포넌트]
    end
    
    A1 --> B1
    A2 --> A3
    A3 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> C1
    C1 -->|결과 없음| C2
    C1 -->|결과 있음| C3
    C2 --> C3
    C3 --> C4
```

## 컴포넌트 구조 다이어그램

```mermaid
graph TD
    subgraph "React Components"
        A[App.tsx<br/>라우팅 설정]
        B[search.tsx<br/>메인 검색 페이지]
        C[StreamingSearch.tsx<br/>스트리밍 컴포넌트]
        D[base-app-layout.tsx<br/>레이아웃 래퍼]
    end
    
    subgraph "Amplify Backend"
        E[resource.ts<br/>스키마 정의]
        F[bedrock-stream.js<br/>스트리밍 핸들러]
        G[bedrock-search.js<br/>일반 검색 핸들러]
        H[bedrock-validate.js<br/>결과 검증 핸들러]
    end
    
    subgraph "State Management"
        I[searchQuery<br/>검색어 상태]
        J[searchResults<br/>결과 상태]
        K[searchSummary<br/>분석 요약]
        L[loading<br/>로딩 상태]
        M[streamingContent<br/>스트리밍 내용]
    end
    
    A --> B
    B --> C
    B --> D
    B --> I
    B --> J
    B --> K
    B --> L
    B --> M
    
    E --> F
    E --> G
    E --> H
    
    B -.->|GraphQL 호출| E
```

## AWS 서비스 연동 다이어그램

```mermaid
graph TB
    subgraph "AWS Amplify Gen 2"
        A[amplify/backend.ts<br/>백엔드 정의]
        B[amplify/data/resource.ts<br/>데이터 스키마]
        C[Custom Resolvers<br/>JavaScript 핸들러]
    end
    
    subgraph "AWS AppSync"
        D[GraphQL API<br/>searchClassesStream]
        E[Data Sources<br/>bedrockDS]
        F[Resolvers<br/>Custom JS Functions]
    end
    
    subgraph "Amazon Bedrock"
        G[Claude 3 Haiku<br/>anthropic.claude-3-haiku-20240307-v1:0]
        H[InvokeModel API<br/>시맨틱 분석]
    end
    
    subgraph "Amazon DynamoDB"
        I[Class Table<br/>강의 데이터]
        J[Course Table<br/>코스 데이터]
        K[Profile Table<br/>사용자 프로필]
    end
    
    subgraph "Amazon Cognito"
        L[User Pool<br/>사용자 인증]
        M[Identity Pool<br/>권한 관리]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    D --> I
    D --> J
    D --> K
    
    D --> L
    L --> M
```

이 아키텍처는 AWS Amplify Gen 2의 최신 패턴을 사용하여 Bedrock과 완전히 통합된 지능형 검색 시스템을 구현합니다.
