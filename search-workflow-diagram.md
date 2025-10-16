# 🔍 Bedrock-Powered Search Workflow

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   AWS Amplify    │    │  Amazon Bedrock │
│   (React)       │    │   (GraphQL)      │    │  (Claude 3)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ 1. User Query          │                        │
         │ "any course for EKS?"  │                        │
         ├────────────────────────▶                        │
         │                        │ 2. searchClasses       │
         │                        │    GraphQL Query       │
         │                        ├────────────────────────▶
         │                        │                        │
         │                        │ 3. Bedrock Analysis    │
         │                        │ ◄──────────────────────┤
         │                        │ {                      │
         │                        │   "primary_topic": "EKS"│
         │                        │   "search_terms": [    │
         │                        │     "kubernetes", "k8s" │
         │                        │   ],                   │
         │                        │   "aws_services": ["EKS"]│
         │                        │ }                      │
         │ 4. Enhanced Results    │                        │
         │ ◄──────────────────────┤                        │
         │                        │                        │
```

## Detailed Workflow Steps

### Step 1: User Input Processing
```
User Types: "any course for EKS?"
    ↓
Frontend captures query
    ↓
Triggers handleSearch() function
```

### Step 2: Bedrock Analysis Pipeline
```
GraphQL Query: searchClasses
    ↓
AWS AppSync receives request
    ↓
Custom Resolver (bedrock-search.js)
    ↓
Bedrock Runtime API Call
    ↓
Claude 3 Haiku Model Processing
```

### Step 3: AI Processing Detail
```
Input: "any course for EKS?"
    ↓
Claude 3 Analysis:
┌─────────────────────────────────┐
│ • Identifies: Primary topic     │
│ • Extracts: AWS services        │
│ • Generates: Related terms      │
│ • Maps: Synonyms & concepts     │
│ • Understands: User intent      │
└─────────────────────────────────┘
    ↓
Output: Structured JSON
```

### Step 4: Search Enhancement
```
Bedrock Response + Original Query
    ↓
Combined Search Terms:
["EKS", "Kubernetes", "K8s", "container orchestration", "any course for EKS?"]
    ↓
DynamoDB Query Enhancement
    ↓
Intelligent Filtering & Scoring
```

### Step 5: Result Processing
```
All Classes from DynamoDB
    ↓
Filter by Enhanced Terms
    ↓
Score by Relevance:
• Title match: +3 points
• Description match: +2 points  
• Content match: +1 point
    ↓
Sort by Score (highest first)
```

### Step 6: User Experience
```
Display Results with:
┌─────────────────────────────────┐
│ 🤖 Search Analysis             │
│ • Your Question: "any course..." │
│ • Primary Topic: "EKS"          │
│ • Why these results             │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ 📚 Class Results               │
│ • Kubernetes Fundamentals       │
│   Match: "EKS" in title        │
│ • Container Orchestration       │
│   Match: "kubernetes" in desc   │
└─────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│ User Query  │ "any course for EKS?"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │ React Search Component
│  Processing │ • Validation
└──────┬──────┘ • State Management
       │
       ▼
┌─────────────┐
│   GraphQL   │ client.queries.searchClasses()
│   Request   │ • Authentication
└──────┬──────┘ • Query Formatting
       │
       ▼
┌─────────────┐
│  AWS        │ AppSync GraphQL API
│  AppSync    │ • Route to Resolver
└──────┬──────┘ • Authorization Check
       │
       ▼
┌─────────────┐
│  Bedrock    │ bedrock-search.js Handler
│  Handler    │ • Format Prompt
└──────┬──────┘ • API Call Setup
       │
       ▼
┌─────────────┐
│  Amazon     │ Claude 3 Haiku Model
│  Bedrock    │ • Natural Language Processing
└──────┬──────┘ • Semantic Analysis
       │
       ▼
┌─────────────┐
│  Response   │ Structured JSON
│  Processing │ • Parse Results
└──────┬──────┘ • Error Handling
       │
       ▼
┌─────────────┐
│  Search     │ Enhanced Term Matching
│  Logic      │ • Cross-reference Terms
└──────┬──────┘ • Relevance Scoring
       │
       ▼
┌─────────────┐
│  DynamoDB   │ Class Data Retrieval
│  Query      │ • Filter by Terms
└──────┬──────┘ • Sort by Relevance
       │
       ▼
┌─────────────┐
│  Results    │ Formatted Response
│  Display    │ • Match Explanations
└─────────────┘ • User-friendly UI
```

## Key Components

### 🔧 Technical Stack
- **Frontend**: React + Cloudscape Design
- **API**: AWS AppSync (GraphQL)
- **AI**: Amazon Bedrock (Claude 3 Haiku)
- **Database**: Amazon DynamoDB
- **Auth**: AWS Cognito

### 🧠 AI Intelligence
- **Model**: anthropic.claude-3-haiku-20240307-v1:0
- **Capability**: Natural language understanding
- **Output**: Structured search enhancement
- **Fallback**: Smart keyword mapping

### 🔄 Error Handling
- **Bedrock Failure**: Falls back to enhanced keyword search
- **Parse Error**: Uses predefined service mappings
- **No Results**: Provides helpful suggestions
- **Network Issues**: Graceful degradation

This workflow transforms simple user questions into intelligent, comprehensive searches using AI-powered semantic understanding!
